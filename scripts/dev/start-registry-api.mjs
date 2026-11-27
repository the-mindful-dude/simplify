// Thin local-development glue: the registry-api reads PORT, while the webhook
// foundation standardises on REGISTRY_API_PORT for both the server and the
// Cloudflare quick-tunnel target. Align them here without editing app source.
process.env.PORT = process.env.REGISTRY_API_PORT || process.env.PORT || '3002';

const { startServer } = await import('../../apps/registry-api/dist/server.js');
if (typeof startServer !== 'function') {
  throw new Error('registry-api dist/server.js must export startServer() for the dev launcher.');
}
startServer();
