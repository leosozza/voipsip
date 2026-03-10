import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // company_id comes from query param (set during event.bind)
    const url = new URL(req.url);
    const companyId = url.searchParams.get("company_id");

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: "company_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Bitrix24 sends form-urlencoded data
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
      // Try to parse as form data
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

    // Extract common fields from Bitrix24 event data
    // Bitrix sends nested data as data[FIELD_NAME]
    const phoneNumber = eventData["data[PHONE_NUMBER]"] || eventData.PHONE_NUMBER || null;
    const bitrixUserId = eventData["data[USER_ID]"] || eventData.USER_ID || null;
    const callId = eventData["data[CALL_ID]"] || eventData.CALL_ID || null;
    const crmEntityType = eventData["data[CRM_ENTITY_TYPE]"] || eventData.CRM_ENTITY_TYPE || null;
    const crmEntityId = eventData["data[CRM_ENTITY_ID]"] || eventData.CRM_ENTITY_ID || null;

    // Store the event
    const { error: insertError } = await supabase
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
      });

    if (insertError) {
      console.error("Erro ao salvar evento:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar evento" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Evento ${eventType} recebido para company ${companyId}: phone=${phoneNumber}, user=${bitrixUserId}`);

    // Bitrix24 expects a 200 response
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
