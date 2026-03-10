import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.93.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Parse nested bracket-notation form keys into a nested object.
 * e.g. "auth[access_token]=xyz" => { auth: { access_token: "xyz" } }
 */
function parseNestedParams(params: URLSearchParams): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of params.entries()) {
    const parts = key.replace(/\]/g, '').split('[');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) current[part] = {};
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Read raw body
    const bodyText = await req.text();
    console.log('Install handler received body:', bodyText.substring(0, 500));

    // Parse the form data (Bitrix24 sends application/x-www-form-urlencoded with nested keys)
    const urlParams = new URLSearchParams(bodyText);
    const parsed = parseNestedParams(urlParams);
    console.log('Parsed params keys:', JSON.stringify(Object.keys(parsed)));

    // Extract auth data — Bitrix24 sends auth[access_token], auth[domain], auth[member_id], etc.
    const auth = parsed.auth || {};
    const data = parsed.data || {};

    // Also check flat keys as fallback (some Bitrix24 versions may use flat keys)
    const accessToken = auth.access_token || urlParams.get('AUTH_ID') || '';
    const refreshToken = auth.refresh_token || urlParams.get('REFRESH_ID') || '';
    const domain = auth.domain || urlParams.get('DOMAIN') || '';
    const memberId = auth.member_id || urlParams.get('member_id') || '';
    const expiresIn = auth.expires_in || urlParams.get('AUTH_EXPIRES') || '3600';
    const applicationToken = auth.application_token || '';
    const event = parsed.event || urlParams.get('event') || '';

    console.log(`Install: event=${event}, domain=${domain}, member_id=${memberId}, has_token=${!!accessToken}`);

    // If we have enough data, save the installation
    if (domain && memberId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const expiresAt = accessToken
        ? new Date(Date.now() + parseInt(expiresIn) * 1000).toISOString()
        : null;

      // Upsert installation
      const { error: upsertError } = await supabase
        .from('bitrix_installations')
        .upsert(
          {
            member_id: memberId,
            domain: domain,
            access_token: accessToken || null,
            refresh_token: refreshToken || null,
            expires_at: expiresAt,
          },
          { onConflict: 'member_id' }
        );

      if (upsertError) {
        console.error('Upsert error:', upsertError);
      } else {
        console.log('Installation saved for member_id:', memberId);
      }

      // Sync to bitrix_credentials if company linked
      const { data: installation } = await supabase
        .from('bitrix_installations')
        .select('company_id')
        .eq('member_id', memberId)
        .maybeSingle();

      if (installation?.company_id && accessToken) {
        await supabase
          .from('bitrix_credentials')
          .upsert(
            {
              company_id: installation.company_id,
              bitrix_domain: domain,
              access_token: accessToken,
              refresh_token: refreshToken || null,
              expires_at: expiresAt,
            },
            { onConflict: 'company_id' }
          );
      }
    } else {
      console.log('Missing domain or member_id, cannot save installation');
    }

    // Return HTML page that runs inside the Bitrix24 iframe
    // Must call BX24.installFinish() to complete the installation
    const appUrl = `https://voipsip.lovable.app/bitrix/app`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Instalação VoIP SIP</title>
  <script src="https://api.bitrix24.com/api/v1/"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f7fa;
      color: #333;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      max-width: 400px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e0e0e0;
      border-top-color: #2196F3;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .success { color: #4caf50; }
    .error { color: #f44336; }
    h2 { margin: 0 0 8px; font-size: 18px; }
    p { margin: 0; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container" id="content">
    <div class="spinner"></div>
    <h2>Instalando VoIP SIP...</h2>
    <p>Aguarde enquanto configuramos a integração.</p>
  </div>
  <script>
    (function() {
      var content = document.getElementById('content');

      function showSuccess() {
        content.innerHTML = '<div class="success"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>' +
          '<h2>Instalação concluída!</h2>' +
          '<p>O aplicativo VoIP SIP foi instalado com sucesso.</p>';
      }

      function showError(msg) {
        content.innerHTML = '<div class="error"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg></div>' +
          '<h2>Erro na instalação</h2>' +
          '<p>' + (msg || 'Tente novamente.') + '</p>';
      }

      try {
        if (typeof BX24 !== 'undefined') {
          BX24.init(function() {
            // Installation data was already saved server-side
            // Now notify Bitrix24 that installation is complete
            BX24.installFinish();
            showSuccess();
          });
        } else {
          // BX24 SDK not available (direct access outside iframe)
          showSuccess();
        }
      } catch(e) {
        console.error('Install error:', e);
        showError(e.message);
      }
    })();
  </script>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        // Allow iframe embedding from Bitrix24
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': "frame-ancestors *",
      },
      status: 200,
    });
  } catch (err) {
    console.error('Install handler error:', err);
    return new Response(
      `<!DOCTYPE html><html><body><p>Erro interno: ${err.message}</p></body></html>`,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        status: 200,
      }
    );
  }
});
