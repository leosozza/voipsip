import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, domain, company_id } = await req.json();

    if (!code || !domain || !company_id) {
      return new Response(JSON.stringify({ error: 'code, domain e company_id são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = Deno.env.get('BITRIX_CLIENT_ID');
    const clientSecret = Deno.env.get('BITRIX_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'BITRIX_CLIENT_ID e BITRIX_CLIENT_SECRET não configurados' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Exchange code for tokens
    const tokenUrl = `https://oauth.bitrix.info/oauth/token/?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return new Response(JSON.stringify({ error: `Bitrix OAuth error: ${tokenData.error_description || tokenData.error}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    const expires_at = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

    // Save tokens to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert credentials
    const { data: existing } = await supabase
      .from('bitrix_credentials')
      .select('id')
      .eq('company_id', company_id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('bitrix_credentials')
        .update({
          bitrix_domain: domain,
          access_token,
          refresh_token,
          expires_at,
        })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('bitrix_credentials')
        .insert({
          company_id,
          bitrix_domain: domain,
          access_token,
          refresh_token,
          expires_at,
        });
      if (error) throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
