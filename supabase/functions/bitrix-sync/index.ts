import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

  // Check if token is still valid
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

    if (action === "register") {
      // telephony.externalcall.register
      const result = await bitrixApi(creds.bitrix_domain, token, "telephony.externalcall.register", {
        USER_ID: call_data.user_id || 1,
        PHONE_NUMBER: call_data.phone_number,
        TYPE: call_data.direction === "outbound" ? 1 : 2,
        SHOW: call_data.show !== undefined ? call_data.show : 0,
        LINE_NUMBER: call_data.line_number || "",
        CRM_CREATE: call_data.crm_create !== undefined ? call_data.crm_create : 1,
      });

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "finish") {
      // telephony.externalcall.finish
      const params: Record<string, any> = {
        CALL_ID: call_data.call_id,
        USER_ID: call_data.user_id || 1,
        DURATION: call_data.duration || 0,
        STATUS_CODE: call_data.status_code || 200,
      };

      if (call_data.recording_url) {
        params.RECORD_URL = call_data.recording_url;
      }

      const result = await bitrixApi(creds.bitrix_domain, token, "telephony.externalcall.finish", params);

      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "register_and_finish") {
      // Full flow: register then finish
      const registerResult = await bitrixApi(creds.bitrix_domain, token, "telephony.externalcall.register", {
        USER_ID: call_data.user_id || 1,
        PHONE_NUMBER: call_data.phone_number,
        TYPE: call_data.direction === "outbound" ? 1 : 2,
        SHOW: 0,
        LINE_NUMBER: call_data.line_number || "",
        CRM_CREATE: call_data.crm_create !== undefined ? call_data.crm_create : 1,
      });

      const callId = registerResult?.result?.CALL_ID;
      if (!callId) {
        return new Response(
          JSON.stringify({ error: "Falha ao registrar chamada no Bitrix", details: registerResult }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const finishParams: Record<string, any> = {
        CALL_ID: callId,
        USER_ID: call_data.user_id || 1,
        DURATION: call_data.duration || 0,
        STATUS_CODE: call_data.status_code || 200,
      };

      if (call_data.recording_url) {
        finishParams.RECORD_URL = call_data.recording_url;
      }

      const finishResult = await bitrixApi(creds.bitrix_domain, token, "telephony.externalcall.finish", finishParams);

      return new Response(
        JSON.stringify({ success: true, register: registerResult, finish: finishResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "test") {
      // Test connection by calling a simple method
      const result = await bitrixApi(creds.bitrix_domain, token, "app.info", {});
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida. Use: register, finish, register_and_finish, test" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
