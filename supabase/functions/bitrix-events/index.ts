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

async function getTokenForCompany(supabase: any, companyId: string, memberId?: string) {
  if (companyId) {
    const { data: creds } = await supabase
      .from("bitrix_credentials")
      .select("bitrix_domain, access_token")
      .eq("company_id", companyId)
      .maybeSingle();

    if (creds?.access_token) {
      return { domain: creds.bitrix_domain, token: creds.access_token };
    }
  }

  // Fallback to installations by company_id
  if (companyId) {
    const { data: install } = await supabase
      .from("bitrix_installations")
      .select("domain, access_token")
      .eq("company_id", companyId)
      .maybeSingle();

    if (install?.access_token) {
      return { domain: install.domain, token: install.access_token };
    }
  }

  // Fallback to installations by memberId
  if (memberId) {
    const { data: install } = await supabase
      .from("bitrix_installations")
      .select("domain, access_token")
      .eq("member_id", memberId)
      .maybeSingle();

    if (install?.access_token) {
      return { domain: install.domain, token: install.access_token };
    }
  }

  return null;
}

async function getUserMapping(supabase: any, companyId: string, bitrixUserId: string) {
  if (!bitrixUserId) return null;
  const { data } = await supabase
    .from("bitrix_user_mappings")
    .select("id, sip_account_id, inner_number, bitrix_user_name")
    .eq("company_id", companyId)
    .eq("bitrix_user_id", bitrixUserId)
    .maybeSingle();
  return data;
}

async function getSipAccount(supabase: any, sipAccountId: string) {
  if (!sipAccountId) return null;
  const { data } = await supabase
    .from("sip_accounts")
    .select("id, sip_server, sip_domain, display_name")
    .eq("id", sipAccountId)
    .maybeSingle();
  return data;
}

async function processCallEvent(
  supabase: any,
  companyId: string,
  eventId: string,
  eventType: string,
  phoneNumber: string,
  bitrixUserId: string | null,
  callId: string | null,
  direction: "inbound" | "outbound"
) {
  const mapping = bitrixUserId ? await getUserMapping(supabase, companyId, bitrixUserId) : null;
  const tokenInfo = await getTokenForCompany(supabase, companyId);

  if (!tokenInfo) {
    console.error("No token found for company:", companyId);
    return;
  }

  // Register the call in Bitrix24 with correct user
  const registerParams: Record<string, any> = {
    PHONE_NUMBER: phoneNumber,
    USER_ID: bitrixUserId || 1,
    TYPE: direction === "outbound" ? 1 : 2,
    SHOW: 1,
    CRM_CREATE: 1, // Official suggestion: ensure entity is created if not exists
    LINE_NUMBER: phoneNumber, // Can be overridden if a specific line is known
    CALL_START_DATE: new Date().toISOString(),
  };

  if (mapping?.inner_number) {
    registerParams.USER_PHONE_INNER = mapping.inner_number;
  }

  const registerResult = await bitrixApi(
    tokenInfo.domain,
    tokenInfo.token,
    "telephony.externalcall.register",
    registerParams
  );

  console.log(`Register result for ${eventType}:`, JSON.stringify(registerResult));

  const bitrixCallId = registerResult?.result?.CALL_ID || callId;

  // Create call_log entry
  const { error: logError } = await supabase.from("call_logs").insert({
    company_id: companyId,
    phone_number: phoneNumber,
    direction,
    status: "ringing",
    user_mapping_id: mapping?.id || null,
    bitrix_call_id: bitrixCallId,
    caller_name: mapping?.bitrix_user_name || null,
    call_started_at: new Date().toISOString(),
  });

  if (logError) {
    console.error("Error inserting call_log:", logError);
  }

  // Update event status
  await supabase
    .from("bitrix_events")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
      call_id: bitrixCallId,
    })
    .eq("id", eventId);
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

    // Extract fields
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

    // Process call events with user mapping lookup
    if (eventType === "ONEXTERNALCALLSTART" && phoneNumber) {
      try {
        await processCallEvent(
          supabase, companyId, insertedEvent.id,
          eventType, phoneNumber, bitrixUserId, callId, "outbound"
        );
      } catch (procError) {
        console.error("Error processing OnExternalCallStart:", procError);
      }
    } else if (eventType === "ONEXTERNALCALLBACKSTART" && phoneNumber) {
      try {
        await processCallEvent(
          supabase, companyId, insertedEvent.id,
          eventType, phoneNumber, bitrixUserId, callId, "inbound"
        );
      } catch (procError) {
        console.error("Error processing OnExternalCallBackStart:", procError);
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
