import { serve } from '@hono/node-server';
import { app } from './app';
import { BASE_URL, DATA_DIR, HOST, PORT } from './config';
import { startPoller } from './events';
import * as microsip from './microsip';

export function startServer() {
  if (microsip.isWindows) microsip.writeHookScripts();
  const server = serve({ fetch: app.fetch, hostname: HOST, port: PORT }, () => {
    console.log(`VoipSip Connector rodando em ${BASE_URL} (dados em ${DATA_DIR})`);
  });
  startPoller();
  return server;
}

// Allow `tsx server/index.ts` as well as importing from Electron.
if (process.argv[1] && /server[\\/]index\.(t|j)s$/.test(process.argv[1])) {
  startServer();
}
