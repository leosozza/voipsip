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
  // Try bitrix_credentials first
  const { data: creds } = await supabase
    .from("bitrix_credentials")
    .select("bitrix_domain, access_token")
    .eq("company_id", companyId)
    .maybeSingle();

  if (creds?.access_token) {
    return { domain: creds.bitrix_domain, token: creds.access_token };
  }

  // Fallback to bitrix_installations
  const { data: install } = await supabase
    .from("bitrix_installations")
    .select("domain, access_token")
    .eq("company_id", companyId)
    .maybeSingle();

  if (install?.access_token) {
    return { domain: install.domain, token: install.access_token };
  }

  return null;
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
    const companyId = url.searchParams.get("company_id");

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: "company_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const contentType = req.headers.get("content-type") || "";
    let eventData: Record<string, any> = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        eventData[key] = value;
      }
    } else if (contentType.includes("application/json")) {
      eventData = await req.json();
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [key, value] of params.entries()) {
        eventData[key] = value;
      }
    }

    const eventType = (eventData.event || "").toUpperCase();

    if (!eventType) {
      return new Response(
        JSON.stringify({ error: "Evento não identificado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract fields from Bitrix24 event data
    const phoneNumber = eventData["data[PHONE_NUMBER]"] || eventData.PHONE_NUMBER || null;
    const bitrixUserId = eventData["data[USER_ID]"] || eventData.USER_ID || null;
    const callId = eventData["data[CALL_ID]"] || eventData.CALL_ID || null;
    const crmEntityType = eventData["data[CRM_ENTITY_TYPE]"] || eventData.CRM_ENTITY_TYPE || null;
    const crmEntityId = eventData["data[CRM_ENTITY_ID]"] || eventData.CRM_ENTITY_ID || null;

    // Store the event
    const { data: insertedEvent, error: insertError } = await supabase
      .from("bitrix_events")
      .insert({
        company_id: companyId,
        event_type: eventType,
        phone_number: phoneNumber,
        bitrix_user_id: bitrixUserId,
        call_id: callId,
        crm_entity_type: crmEntityType,
        crm_entity_id: crmEntityId,
        raw_data: eventData,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Erro ao salvar evento:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar evento" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Evento ${eventType} recebido para company ${companyId}: phone=${phoneNumber}, user=${bitrixUserId}`);

    // Process OnExternalCallStart: register the call with SHOW=1
    if (eventType === "ONEXTERNALCALLSTART" && phoneNumber) {
      try {
        const tokenInfo = await getTokenForCompany(supabase, companyId);
        if (tokenInfo) {
          const registerResult = await bitrixApi(tokenInfo.domain, tokenInfo.token, "telephony.externalcall.register", {
            PHONE_NUMBER: phoneNumber,
            USER_ID: bitrixUserId || 1,
            TYPE: 1, // outgoing
            SHOW: 1, // show call card in CRM (mandatory)
            CRM_CREATE: 1,
            LINE_NUMBER: phoneNumber,
            CALL_START_DATE: new Date().toISOString(),
          });

          console.log("Register result for OnExternalCallStart:", JSON.stringify(registerResult));

          // Update event status
          await supabase
            .from("bitrix_events")
            .update({
              status: "processed",
              processed_at: new Date().toISOString(),
              call_id: registerResult?.result?.CALL_ID || callId,
            })
            .eq("id", insertedEvent.id);
        } else {
          console.error("No token found for company:", companyId);
        }
      } catch (procError) {
        console.error("Error processing OnExternalCallStart:", procError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro no bitrix-events:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
