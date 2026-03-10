import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Bitrix24 sends installation data as application/x-www-form-urlencoded or JSON
    let params: Record<string, string> = {};

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        params[key] = String(value);
      }
    } else if (contentType.includes('application/json')) {
      params = await req.json();
    } else {
      // Try URL search params from body text
      const body = await req.text();
      const urlParams = new URLSearchParams(body);
      for (const [key, value] of urlParams.entries()) {
        params[key] = value;
      }
    }

    // Bitrix24 sends: AUTH_ID, AUTH_EXPIRES, REFRESH_ID, member_id, DOMAIN, APP_SID
    // Or during install event: event=ONAPPINSTALL, auth[access_token], auth[refresh_token], auth[domain], auth[member_id]
    const authId = params['AUTH_ID'] || params['auth[access_token]'];
    const refreshId = params['REFRESH_ID'] || params['auth[refresh_token]'];
    const domain = params['DOMAIN'] || params['auth[domain]'];
    const memberId = params['member_id'] || params['auth[member_id]'];

    if (!domain || !memberId) {
      // Redirect to app page with error
      return new Response(
        `<html><body><script>
          window.top.postMessage({ type: 'bitrix-install-error', error: 'Missing domain or member_id' }, '*');
        </script><p>Parâmetros inválidos. Feche e tente novamente.</p></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate token expiry
    const authExpires = params['AUTH_EXPIRES'] || '3600';
    const expiresAt = new Date(Date.now() + parseInt(authExpires) * 1000).toISOString();

    // Upsert installation record
    const { error: upsertError } = await supabase
      .from('bitrix_installations')
      .upsert(
        {
          member_id: memberId,
          domain: domain,
          access_token: authId || null,
          refresh_token: refreshId || null,
          expires_at: authId ? expiresAt : null,
        },
        { onConflict: 'member_id' }
      );

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(
        `<html><body><p>Erro ao salvar instalação: ${upsertError.message}</p></body></html>`,
        { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
      );
    }

    // Also sync to bitrix_credentials if a company is linked
    const { data: installation } = await supabase
      .from('bitrix_installations')
      .select('company_id')
      .eq('member_id', memberId)
      .maybeSingle();

    if (installation?.company_id && authId) {
      await supabase
        .from('bitrix_credentials')
        .upsert(
          {
            company_id: installation.company_id,
            bitrix_domain: domain,
            access_token: authId,
            refresh_token: refreshId || null,
            expires_at: expiresAt,
          },
          { onConflict: 'company_id' }
        );
    }

    // Return success HTML that closes or redirects
    const appUrl = `https://voipsip.lovable.app/bitrix/app?DOMAIN=${encodeURIComponent(domain)}&member_id=${encodeURIComponent(memberId)}`;

    return new Response(
      `<html>
        <head><meta charset="utf-8"></head>
        <body>
          <script>
            // Notify parent iframe
            if (window.top !== window) {
              window.top.postMessage({ type: 'bitrix-install-success' }, '*');
            }
            // Redirect to app
            window.location.href = '${appUrl}';
          </script>
          <p>Instalação concluída! Redirecionando...</p>
        </body>
      </html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
    );
  } catch (err) {
    console.error('Install error:', err);
    return new Response(
      `<html><body><p>Erro interno: ${err.message}</p></body></html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
    );
  }
});
