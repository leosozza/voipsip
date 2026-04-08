import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function bitrixApi(domain: string, token: string, method: string, params: Record<string, any>) {
  const url = `https://${domain}/rest/${method}?auth=${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return res.json();
}

async function getTokenForCompany(supabase: any, companyId: string) {
  const { data: creds } = await supabase
    .from("bitrix_credentials")
    .select("bitrix_domain, access_token")
    .eq("company_id", companyId)
    .maybeSingle();

  if (creds?.access_token) {
    return { domain: creds.bitrix_domain, token: creds.access_token };
  }

  const { data: install } = await supabase
    .from("bitrix_installations")
    .select("domain, access_token")
    .eq("company_id", companyId)
    .maybeSingle();

  return install ? { domain: install.domain, token: install.access_token } : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const event = url.searchParams.get("event"); // incoming, answer, hangup
    const phoneNumber = url.searchParams.get("number");
    const companyId = url.searchParams.get("company_id");
    const bitrixUserId = url.searchParams.get("user_id") || "1";

    if (!companyId || !phoneNumber || !event) {
      return new Response(
        JSON.stringify({ error: "Parâmetros 'event', 'number' e 'company_id' são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`MicroSip Event: ${event} for ${phoneNumber} (company: ${companyId})`);

    const tokenInfo = await getTokenForCompany(supabase, companyId);
    if (!tokenInfo) throw new Error("Credenciais Bitrix não encontradas");

    if (event === "incoming") {
      // Register incoming call in Bitrix
      const result = await bitrixApi(tokenInfo.domain, tokenInfo.token, "telephony.externalcall.register", {
        PHONE_NUMBER: phoneNumber,
        USER_ID: bitrixUserId,
        TYPE: 2, // Inbound
        SHOW: 1, // Show popup
        CRM_CREATE: 1,
        CRM_SOURCE: "MICROSIP", // Source attribution
      });

      const callId = result?.result?.CALL_ID;

      // Log in call_logs
      await supabase.from("call_logs").insert({
        company_id: companyId,
        phone_number: phoneNumber,
        direction: "inbound",
        status: "ringing",
        bitrix_call_id: callId,
        call_started_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ success: true, call_id: callId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event === "registration") {
      const status = url.searchParams.get("status") || "online";
      const extensionNumber = url.searchParams.get("extension");

      console.log(`MicroSip Registration: ${extensionNumber} is ${status}`);

      if (extensionNumber) {
        await supabase
          .from("extensions")
          .update({
            status: status,
            last_heartbeat: new Date().toISOString(),
          })
          .eq("company_id", companyId)
          .eq("extension_number", extensionNumber);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event === "answer") {
      // Find active call for this number
      const { data: activeCall } = await supabase
        .from("call_logs")
        .select("bitrix_call_id")
        .eq("company_id", companyId)
        .eq("phone_number", phoneNumber)
        .eq("direction", "inbound")
        .neq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeCall?.bitrix_call_id) {
        // Signal Bitrix that call is answered (using show to stop ringing)
        await bitrixApi(tokenInfo.domain, tokenInfo.token, "telephony.externalcall.show", {
          CALL_ID: activeCall.bitrix_call_id,
          USER_ID: bitrixUserId,
        });

        await supabase
          .from("call_logs")
          .update({ status: "answered" })
          .eq("bitrix_call_id", activeCall.bitrix_call_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event === "hangup" || event === "recording") {
      const recordingUrl = url.searchParams.get("recording_url");
      
      // Find active call for this number
      const { data: activeCall } = await supabase
        .from("call_logs")
        .select("bitrix_call_id, call_started_at, id")
        .eq("company_id", companyId)
        .eq("phone_number", phoneNumber)
        .eq("direction", "inbound")
        .neq("status", "completed") // Find non-completed call
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeCall?.bitrix_call_id) {
        const duration = Math.floor((Date.now() - new Date(activeCall.call_started_at).getTime()) / 1000);
        
        const finishParams: Record<string, any> = {
          CALL_ID: activeCall.bitrix_call_id,
          USER_ID: bitrixUserId,
          DURATION: duration,
          STATUS_CODE: 200,
        };

        await bitrixApi(tokenInfo.domain, tokenInfo.token, "telephony.externalcall.finish", finishParams);

        // If recording URL is available, attach it
        if (recordingUrl) {
          console.log(`Attaching recording for ${activeCall.bitrix_call_id}: ${recordingUrl}`);
          await bitrixApi(tokenInfo.domain, tokenInfo.token, "telephony.externalcall.attachRecord", {
            CALL_ID: activeCall.bitrix_call_id,
            URL: recordingUrl,
          });
        }

        await supabase
          .from("call_logs")
          .update({
            status: "completed",
            duration_seconds: duration,
            call_ended_at: new Date().toISOString(),
            recording_url: recordingUrl, // Store it locally too
          })
          .eq("id", activeCall.id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Evento não processado" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in microsip-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
