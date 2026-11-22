import { spawn, spawnSync } from 'node:child_process';

const port = process.env.REGISTRY_API_PORT || '3002';
const target = `http://localhost:${port}`;

// Probe for cloudflared without installing or vendoring it. Quick tunnels need
// no Cloudflare account; the developer fetches the binary on demand.
const probe = spawnSync('cloudflared', ['--version'], { stdio: 'ignore' });
if (probe.error || probe.status !== 0) {
  console.error(
    'cloudflared is not available on PATH.\n' +
      'Install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/\n' +
      'No Cloudflare account is required for quick tunnels.\n' +
      'This repository intentionally does not vendor or commit the binary.',
  );
  process.exit(1);
}

console.log(`Starting Cloudflare quick tunnel to ${target} ...`);

const child = spawn('cloudflared', ['tunnel', '--url', target], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
let announced = false;

function capture(chunk) {
  const text = chunk.toString();
  process.stdout.write(text);
  output += text;

  if (!announced) {
    const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
    if (match) {
      announced = true;
      const base = match[0];
      console.log('\n=== Webhook tunnel ready ===');
      console.log(`Public base URL: ${base}`);
      console.log(`GitHub App webhook URL: ${base}/webhooks/github`);
      console.log(
        'Webhook secret: use the same GITHUB_APP_WEBHOOK_SECRET value from .env.local in the GitHub App.',
      );
      console.log('Leave this running. Press Ctrl-C to stop; cleanup is automatic.\n');
    }
  }
}

child.stdout.on('data', capture);
child.stderr.on('data', capture);

let stopping = false;
function stop(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`\nStopping tunnel (${signal})...`);
  child.kill('SIGTERM');
  setTimeout(() => child.kill('SIGKILL'), 5000).unref();
}

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));
process.on('exit', () => {
  if (child.exitCode === null) child.kill('SIGTERM');
});

child.on('error', (error) => {
  console.error(`Failed to start cloudflared: ${error.message}`);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  if (!announced && !stopping) {
    console.error('cloudflared exited before publishing a public URL.');
  }
  process.exitCode = process.exitCode ?? (signal ? 0 : (code ?? 0));
});
