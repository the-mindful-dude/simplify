import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

import { createRequestHandler } from './app.js';

export function startServer(env: NodeJS.ProcessEnv = process.env) {
  const requestHandler = createRequestHandler({ env });
  const server = createServer((request, response) => {
    void requestHandler(request, response);
  });

  const port = Number(env.PORT || 3002);
  const hostname = env.HOSTNAME ?? '0.0.0.0';

  server.listen(port, hostname, () => {
    console.log(`registry-api listening on ${hostname}:${port}`);
  });

  server.on('error', (error: unknown) => {
    console.error('registry-api server error', error);
    process.exit(1);
  });

  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
