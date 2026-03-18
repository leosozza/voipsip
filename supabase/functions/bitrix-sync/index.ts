import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TokenHolder {
  id: string;
  table: "bitrix_credentials" | "bitrix_installations";
  bitrix_domain: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
}

async function refreshToken(
  holder: TokenHolder,
  supabase: any
): Promise<string> {
  const clientId = Deno.env.get("BITRIX_CLIENT_ID");
  const clientSecret = Deno.env.get("BITRIX_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("BITRIX_CLIENT_ID ou BITRIX_CLIENT_SECRET não configurados");
  }

  // Token still valid (>60s remaining)
  if (holder.access_token && holder.expires_at) {
    const expiresAt = new Date(holder.expires_at);
    if (expiresAt > new Date(Date.now() + 60000)) {
      return holder.access_token;
    }
  }

  if (!holder.refresh_token) {
    throw new Error("Refresh token não disponível. Reconecte o Bitrix24.");
  }

  const tokenUrl = `https://oauth.bitrix.info/oauth/token/?grant_type=refresh_token&client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${holder.refresh_token}`;

  const resp = await fetch(tokenUrl);
  const data = await resp.json();

  if (data.error) {
    throw new Error(`Bitrix OAuth error: ${data.error_description || data.error}`);
  }

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

  // Update the source table
  await supabase
    .from(holder.table)
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
    })
    .eq("id", holder.id);

  // If source is installations, also sync to bitrix_credentials if company linked
  if (holder.table === "bitrix_installations") {
    const { data: inst } = await supabase
      .from("bitrix_installations")
      .select("company_id")
      .eq("id", holder.id)
      .maybeSingle();

    if (inst?.company_id) {
      await supabase
        .from("bitrix_credentials")
        .upsert(
          {
            company_id: inst.company_id,
            bitrix_domain: holder.bitrix_domain,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: expiresAt,
          },
          { onConflict: "company_id" }
        );
    }
  }

  // If source is credentials, also sync to installations if linked
  if (holder.table === "bitrix_credentials") {
    const { data: installations } = await supabase
      .from("bitrix_installations")
      .select("id")
      .eq("domain", holder.bitrix_domain);

    if (installations?.length) {
      for (const inst of installations) {
        await supabase
          .from("bitrix_installations")
          .update({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: expiresAt,
          })
          .eq("id", inst.id);
      }
    }
  }

  return data.access_token;
}

async function bitrixApi(
  domain: string,
  token: string,
  method: string,
  params: Record<string, any>
) {
  const url = `https://${domain}/rest/${method}?auth=${token}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return await resp.json();
}

// Resolve credentials: try bitrix_credentials first, fallback to bitrix_installations
async function resolveCredentials(
  supabase: any,
  companyId?: string,
  memberId?: string
): Promise<TokenHolder> {
  // Try by company_id first
  if (companyId) {
    const { data: creds } = await supabase
      .from("bitrix_credentials")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();

    if (creds) {
      return {
        id: creds.id,
        table: "bitrix_credentials",
        bitrix_domain: creds.bitrix_domain,
        access_token: creds.access_token,
        refresh_token: creds.refresh_token,
        expires_at: creds.expires_at,
      };
    }

    // Fallback: check installations linked to this company
    const { data: inst } = await supabase
      .from("bitrix_installations")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();

    if (inst) {
      return {
        id: inst.id,
        table: "bitrix_installations",
        bitrix_domain: inst.domain,
        access_token: inst.access_token,
        refresh_token: inst.refresh_token,
        expires_at: inst.expires_at,
      };
    }
  }

  // Try by member_id
  if (memberId) {
    const { data: inst } = await supabase
      .from("bitrix_installations")
      .select("*")
      .eq("member_id", memberId)
      .maybeSingle();

    if (inst) {
      return {
        id: inst.id,
        table: "bitrix_installations",
        bitrix_domain: inst.domain,
        access_token: inst.access_token,
        refresh_token: inst.refresh_token,
        expires_at: inst.expires_at,
      };
    }
  }

  throw new Error("Credenciais Bitrix24 não encontradas");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, company_id, member_id, call_data } = body;

    // Resolve credentials from either table
    const holder = await resolveCredentials(supabase, company_id, member_id);
    const token = await refreshToken(holder, supabase);
    const domain = holder.bitrix_domain;

    // === ACTION: register ===
    if (action === "register") {
      const params: Record<string, any> = {
        USER_ID: call_data.user_id || 1,
        PHONE_NUMBER: call_data.phone_number,
        TYPE: call_data.direction === "outbound" ? 1 : 2,
        SHOW: call_data.show !== undefined ? call_data.show : 0,
        CRM_CREATE: call_data.crm_create !== undefined ? call_data.crm_create : 1,
      };

      if (call_data.line_number) params.LINE_NUMBER = call_data.line_number;
      if (call_data.call_start_date) params.CALL_START_DATE = call_data.call_start_date;
      if (call_data.user_phone_inner) params.USER_PHONE_INNER = call_data.user_phone_inner;
      if (call_data.crm_source) params.CRM_SOURCE = call_data.crm_source;

      const result = await bitrixApi(domain, token, "telephony.externalcall.register", params);
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: finish ===
    if (action === "finish") {
      const params: Record<string, any> = {
        CALL_ID: call_data.call_id,
        USER_ID: call_data.user_id || 1,
        DURATION: call_data.duration || 0,
        STATUS_CODE: call_data.status_code || 200,
      };

      if (call_data.cost) {
        params.COST = call_data.cost;
        params.COST_CURRENCY = call_data.cost_currency || "BRL";
      }

      const result = await bitrixApi(domain, token, "telephony.externalcall.finish", params);
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: attach_record ===
    if (action === "attach_record") {
      const params: Record<string, any> = {
        CALL_ID: call_data.call_id,
        FILENAME: call_data.filename || "recording.mp3",
      };

      if (call_data.recording_url) {
        params.RECORD_URL = call_data.recording_url;
      } else if (call_data.file_content) {
        params.FILE_CONTENT = call_data.file_content;
      } else {
        return new Response(
          JSON.stringify({ error: "recording_url ou file_content é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await bitrixApi(domain, token, "telephony.externalCall.attachRecord", params);
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: register_and_finish ===
    if (action === "register_and_finish") {
      const registerParams: Record<string, any> = {
        USER_ID: call_data.user_id || 1,
        PHONE_NUMBER: call_data.phone_number,
        TYPE: call_data.direction === "outbound" ? 1 : 2,
        SHOW: 0,
        CRM_CREATE: call_data.crm_create !== undefined ? call_data.crm_create : 1,
      };

      if (call_data.line_number) registerParams.LINE_NUMBER = call_data.line_number;
      if (call_data.call_start_date) registerParams.CALL_START_DATE = call_data.call_start_date;
      if (call_data.user_phone_inner) registerParams.USER_PHONE_INNER = call_data.user_phone_inner;
      if (call_data.crm_source) registerParams.CRM_SOURCE = call_data.crm_source;

      const registerResult = await bitrixApi(domain, token, "telephony.externalcall.register", registerParams);

      const callId = registerResult?.result?.CALL_ID;
      if (!callId) {
        return new Response(
          JSON.stringify({ error: "Falha ao registrar chamada no Bitrix", details: registerResult }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const finishResult = await bitrixApi(domain, token, "telephony.externalcall.finish", {
        CALL_ID: callId,
        USER_ID: call_data.user_id || 1,
        DURATION: call_data.duration || 0,
        STATUS_CODE: call_data.status_code || 200,
      });

      let attachResult = null;
      if (call_data.recording_url) {
        attachResult = await bitrixApi(domain, token, "telephony.externalCall.attachRecord", {
          CALL_ID: callId,
          FILENAME: call_data.filename || "recording.mp3",
          RECORD_URL: call_data.recording_url,
        });
      }

      return new Response(
        JSON.stringify({ success: true, register: registerResult, finish: finishResult, attach: attachResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACTION: add_external_line ===
    if (action === "add_external_line") {
      const params: Record<string, any> = { NUMBER: call_data.number };
      if (call_data.name) params.NAME = call_data.name;
      if (call_data.crm_auto_create !== undefined) params.CRM_AUTO_CREATE = call_data.crm_auto_create;

      const result = await bitrixApi(domain, token, "telephony.externalLine.add", params);
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: delete_external_line ===
    if (action === "delete_external_line") {
      const result = await bitrixApi(domain, token, "telephony.externalLine.delete", {
        NUMBER: call_data.number,
      });
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: get_external_lines ===
    if (action === "get_external_lines") {
      const result = await bitrixApi(domain, token, "telephony.externalLine.get", {});
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: search_crm ===
    if (action === "search_crm") {
      const result = await bitrixApi(domain, token, "telephony.externalCall.searchCrmEntities", {
        PHONE_NUMBER: call_data.phone_number,
      });
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: bind_events ===
    if (action === "bind_events") {
      const supabaseProjectUrl = Deno.env.get("SUPABASE_URL")!;
      const companyParam = company_id ? `company_id=${company_id}` : `member_id=${holder.id}`;
      const handlerUrl = `${supabaseProjectUrl}/functions/v1/bitrix-events?${companyParam}`;

      const events = ["OnExternalCallStart", "OnExternalCallBackStart"];
      const results: Record<string, any> = {};
      for (const event of events) {
        results[event] = await bitrixApi(domain, token, "event.bind", { event, handler: handlerUrl });
      }

      return new Response(JSON.stringify({ success: true, results, handler_url: handlerUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: unbind_events ===
    if (action === "unbind_events") {
      const supabaseProjectUrl = Deno.env.get("SUPABASE_URL")!;
      const companyParam = company_id ? `company_id=${company_id}` : `member_id=${holder.id}`;
      const handlerUrl = `${supabaseProjectUrl}/functions/v1/bitrix-events?${companyParam}`;

      const events = ["OnExternalCallStart", "OnExternalCallBackStart"];
      const results: Record<string, any> = {};
      for (const event of events) {
        results[event] = await bitrixApi(domain, token, "event.unbind", { event, handler: handlerUrl });
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: show_call_card ===
    if (action === "show_call_card") {
      const result = await bitrixApi(domain, token, "telephony.externalcall.show", {
        CALL_ID: call_data.call_id,
        USER_ID: call_data.user_id || 1,
      });
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: hide_call_card ===
    if (action === "hide_call_card") {
      const result = await bitrixApi(domain, token, "telephony.externalcall.hide", {
        CALL_ID: call_data.call_id,
        USER_ID: call_data.user_id || 1,
      });
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: link_installation ===
    if (action === "link_installation") {
      const { data: inst } = await supabase
        .from("bitrix_installations")
        .select("*")
        .eq("domain", call_data.domain)
        .maybeSingle();

      if (!inst) {
        return new Response(
          JSON.stringify({ error: "Instalação não encontrada para este domínio" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Link to company
      await supabase
        .from("bitrix_installations")
        .update({ company_id: company_id })
        .eq("id", inst.id);

      // Sync tokens to bitrix_credentials
      if (inst.access_token) {
        await supabase
          .from("bitrix_credentials")
          .upsert(
            {
              company_id: company_id,
              bitrix_domain: inst.domain,
              access_token: inst.access_token,
              refresh_token: inst.refresh_token,
              expires_at: inst.expires_at,
            },
            { onConflict: "company_id" }
          );
      }

      return new Response(JSON.stringify({ success: true, installation_id: inst.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: test ===
    if (action === "test") {
      const result = await bitrixApi(domain, token, "app.info", {});
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: sip_get ===
    if (action === "sip_get") {
      const result = await bitrixApi(domain, token, "voximplant.sip.get", {});
      return new Response(JSON.stringify({ success: true, result: result?.result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: sip_add ===
    if (action === "sip_add") {
      const params: Record<string, any> = {
        TYPE: call_data.type || "cloud",
        TITLE: call_data.title,
        SERVER: call_data.server,
        LOGIN: call_data.login,
        PASSWORD: call_data.password,
      };
      const result = await bitrixApi(domain, token, "voximplant.sip.add", params);
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: sip_delete ===
    if (action === "sip_delete") {
      const result = await bitrixApi(domain, token, "voximplant.sip.delete", {
        CONFIG_ID: call_data.config_id,
      });
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: sip_update ===
    if (action === "sip_update") {
      const params: Record<string, any> = { CONFIG_ID: call_data.config_id };
      if (call_data.title) params.TITLE = call_data.title;
      if (call_data.server) params.SERVER = call_data.server;
      if (call_data.login) params.LOGIN = call_data.login;
      if (call_data.password) params.PASSWORD = call_data.password;
      const result = await bitrixApi(domain, token, "voximplant.sip.update", params);
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: get_users ===
    if (action === "get_users") {
      // Fetch all active users from Bitrix24
      const params: Record<string, any> = {
        FILTER: { ACTIVE: true },
        SORT: "NAME",
        ORDER: "ASC",
      };
      if (call_data?.start !== undefined) params.start = call_data.start;
      const result = await bitrixApi(domain, token, "user.get", params);
      return new Response(JSON.stringify({ success: true, result: result?.result, total: result?.total, next: result?.next }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: voximplant_user_get ===
    if (action === "voximplant_user_get") {
      const params: Record<string, any> = {};
      if (call_data?.user_ids) params.USER_ID = call_data.user_ids;
      const result = await bitrixApi(domain, token, "voximplant.user.get", params);
      return new Response(JSON.stringify({ success: true, result: result?.result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: voximplant_user_activate_phone ===
    if (action === "voximplant_user_activate_phone") {
      const result = await bitrixApi(domain, token, "voximplant.user.activatePhone", {
        USER_ID: call_data.user_id,
      });
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: voximplant_user_deactivate_phone ===
    if (action === "voximplant_user_deactivate_phone") {
      const result = await bitrixApi(domain, token, "voximplant.user.deactivatePhone", {
        USER_ID: call_data.user_id,
      });
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: voximplant_line_get ===
    if (action === "voximplant_line_get") {
      const result = await bitrixApi(domain, token, "voximplant.line.get", {});
      return new Response(JSON.stringify({ success: true, result: result?.result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: voximplant_line_outgoing_set ===
    if (action === "voximplant_line_outgoing_set") {
      const result = await bitrixApi(domain, token, "voximplant.line.outgoing.set", {
        LINE_ID: call_data.line_id,
      });
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: voximplant_line_outgoing_sip_set ===
    if (action === "voximplant_line_outgoing_sip_set") {
      const result = await bitrixApi(domain, token, "voximplant.line.outgoing.sip.set", {
        CONFIG_ID: call_data.config_id,
      });
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
