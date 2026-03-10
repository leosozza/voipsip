import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BitrixCredentials {
  id: string;
  company_id: string;
  bitrix_domain: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
}

async function refreshBitrixToken(
  creds: BitrixCredentials,
  supabase: any
): Promise<string> {
  const clientId = Deno.env.get("BITRIX_CLIENT_ID");
  const clientSecret = Deno.env.get("BITRIX_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("BITRIX_CLIENT_ID ou BITRIX_CLIENT_SECRET não configurados");
  }

  if (creds.access_token && creds.expires_at) {
    const expiresAt = new Date(creds.expires_at);
    if (expiresAt > new Date(Date.now() + 60000)) {
      return creds.access_token;
    }
  }

  if (!creds.refresh_token) {
    throw new Error("Refresh token não disponível. Reconecte o Bitrix24.");
  }

  const tokenUrl = `https://oauth.bitrix.info/oauth/token/?grant_type=refresh_token&client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${creds.refresh_token}`;

  const resp = await fetch(tokenUrl);
  const data = await resp.json();

  if (data.error) {
    throw new Error(`Bitrix OAuth error: ${data.error_description || data.error}`);
  }

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

  await supabase
    .from("bitrix_credentials")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
    })
    .eq("id", creds.id);

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, company_id, call_data } = body;

    // Fetch credentials
    const { data: creds, error: credsError } = await supabase
      .from("bitrix_credentials")
      .select("*")
      .eq("company_id", company_id)
      .maybeSingle();

    if (credsError || !creds) {
      return new Response(
        JSON.stringify({ error: "Credenciais Bitrix24 não encontradas" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = await refreshBitrixToken(creds as BitrixCredentials, supabase);

    // === ACTION: register ===
    if (action === "register") {
      const params: Record<string, any> = {
        USER_ID: call_data.user_id || 1,
        PHONE_NUMBER: call_data.phone_number,
        TYPE: call_data.direction === "outbound" ? 1 : 2,
        SHOW: call_data.show !== undefined ? call_data.show : 0,
        CRM_CREATE: call_data.crm_create !== undefined ? call_data.crm_create : 1,
      };

      if (call_data.line_number) {
        params.LINE_NUMBER = call_data.line_number;
      }
      if (call_data.call_start_date) {
        params.CALL_START_DATE = call_data.call_start_date;
      }
      if (call_data.user_phone_inner) {
        params.USER_PHONE_INNER = call_data.user_phone_inner;
      }
      if (call_data.crm_source) {
        params.CRM_SOURCE = call_data.crm_source;
      }

      const result = await bitrixApi(creds.bitrix_domain, token, "telephony.externalcall.register", params);

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: finish (sem RECORD_URL - deprecated) ===
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

      const result = await bitrixApi(creds.bitrix_domain, token, "telephony.externalcall.finish", params);

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: attach_record (substitui RECORD_URL deprecated no finish) ===
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

      const result = await bitrixApi(creds.bitrix_domain, token, "telephony.externalCall.attachRecord", params);

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: register_and_finish (fluxo completo com attachRecord) ===
    if (action === "register_and_finish") {
      // 1. Register
      const registerParams: Record<string, any> = {
        USER_ID: call_data.user_id || 1,
        PHONE_NUMBER: call_data.phone_number,
        TYPE: call_data.direction === "outbound" ? 1 : 2,
        SHOW: 0,
        CRM_CREATE: call_data.crm_create !== undefined ? call_data.crm_create : 1,
      };

      if (call_data.line_number) {
        registerParams.LINE_NUMBER = call_data.line_number;
      }
      if (call_data.call_start_date) {
        registerParams.CALL_START_DATE = call_data.call_start_date;
      }
      if (call_data.user_phone_inner) {
        registerParams.USER_PHONE_INNER = call_data.user_phone_inner;
      }
      if (call_data.crm_source) {
        registerParams.CRM_SOURCE = call_data.crm_source;
      }

      const registerResult = await bitrixApi(creds.bitrix_domain, token, "telephony.externalcall.register", registerParams);

      const callId = registerResult?.result?.CALL_ID;
      if (!callId) {
        return new Response(
          JSON.stringify({ error: "Falha ao registrar chamada no Bitrix", details: registerResult }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Finish (sem RECORD_URL)
      const finishParams: Record<string, any> = {
        CALL_ID: callId,
        USER_ID: call_data.user_id || 1,
        DURATION: call_data.duration || 0,
        STATUS_CODE: call_data.status_code || 200,
      };

      const finishResult = await bitrixApi(creds.bitrix_domain, token, "telephony.externalcall.finish", finishParams);

      // 3. Attach recording (se houver URL de gravação)
      let attachResult = null;
      if (call_data.recording_url) {
        attachResult = await bitrixApi(creds.bitrix_domain, token, "telephony.externalCall.attachRecord", {
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
      const params: Record<string, any> = {
        NUMBER: call_data.number,
      };
      if (call_data.name) {
        params.NAME = call_data.name;
      }
      if (call_data.crm_auto_create !== undefined) {
        params.CRM_AUTO_CREATE = call_data.crm_auto_create;
      }

      const result = await bitrixApi(creds.bitrix_domain, token, "telephony.externalLine.add", params);

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: delete_external_line ===
    if (action === "delete_external_line") {
      const result = await bitrixApi(creds.bitrix_domain, token, "telephony.externalLine.delete", {
        NUMBER: call_data.number,
      });

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: get_external_lines ===
    if (action === "get_external_lines") {
      const result = await bitrixApi(creds.bitrix_domain, token, "telephony.externalLine.get", {});

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: search_crm ===
    if (action === "search_crm") {
      const result = await bitrixApi(creds.bitrix_domain, token, "telephony.externalCall.searchCrmEntities", {
        PHONE_NUMBER: call_data.phone_number,
      });

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: bind_events ===
    if (action === "bind_events") {
      const supabaseProjectUrl = Deno.env.get("SUPABASE_URL")!;
      const handlerUrl = `${supabaseProjectUrl}/functions/v1/bitrix-events?company_id=${company_id}`;

      const events = [
        "OnExternalCallStart",
        "OnExternalCallBackStart",
      ];

      const results: Record<string, any> = {};
      for (const event of events) {
        results[event] = await bitrixApi(creds.bitrix_domain, token, "event.bind", {
          event,
          handler: handlerUrl,
        });
      }

      return new Response(JSON.stringify({ success: true, results, handler_url: handlerUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: unbind_events ===
    if (action === "unbind_events") {
      const supabaseProjectUrl = Deno.env.get("SUPABASE_URL")!;
      const handlerUrl = `${supabaseProjectUrl}/functions/v1/bitrix-events?company_id=${company_id}`;

      const events = ["OnExternalCallStart", "OnExternalCallBackStart"];
      const results: Record<string, any> = {};
      for (const event of events) {
        results[event] = await bitrixApi(creds.bitrix_domain, token, "event.unbind", {
          event,
          handler: handlerUrl,
        });
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: show_call_card ===
    if (action === "show_call_card") {
      const result = await bitrixApi(creds.bitrix_domain, token, "telephony.externalcall.show", {
        CALL_ID: call_data.call_id,
        USER_ID: call_data.user_id || 1,
      });

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: hide_call_card ===
    if (action === "hide_call_card") {
      const result = await bitrixApi(creds.bitrix_domain, token, "telephony.externalcall.hide", {
        CALL_ID: call_data.call_id,
        USER_ID: call_data.user_id || 1,
      });

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: test ===
    if (action === "test") {
      const result = await bitrixApi(creds.bitrix_domain, token, "app.info", {});
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida. Use: register, finish, attach_record, register_and_finish, add_external_line, delete_external_line, get_external_lines, search_crm, bind_events, unbind_events, show_call_card, hide_call_card, test" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
