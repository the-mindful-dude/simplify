import { formatGeneratedAt } from './catalog';
import type { StatusState, StatusView } from './status-model';
import type { RegistrySnapshot } from './types';

/**
 * Derive honest status views from locally verifiable facts. Webhook, publishing
 * and GitHub connection telemetry is not exposed to this app in this phase, so
 * those surfaces report `unavailable` rather than a fabricated success.
 */
export function buildStatusViews(snapshot: RegistrySnapshot): readonly StatusView[] {
  const generated = formatGeneratedAt(snapshot.generatedAt);
  const published = snapshot.assets.filter(
    (asset) => asset.status === 'official' || asset.status === 'verified',
  ).length;
  const repositoryState: StatusState = snapshot.libraries.length > 0 ? 'success' : 'empty';

  return [
    {
      domain: 'webhook',
      title: 'Webhook delivery',
      state: 'unavailable',
      summary: 'Delivery telemetry is not available in this browser.',
      detail:
        'Signed deliveries are verified by the local registry API. No delivery history is exposed to the web application in this phase.',
      refreshable: true,
    },
    {
      domain: 'sync',
      title: 'Sync & publishing',
      state: 'unavailable',
      summary: 'Publishing is unavailable without GitHub App credentials.',
      detail: `The local registry index was generated ${generated}. Published versions require a configured GitHub App.`,
      observedAt: snapshot.generatedAt,
      refreshable: true,
    },
    {
      domain: 'github',
      title: 'GitHub connection',
      state: 'unavailable',
      summary: 'Webhook-only mode — no GitHub App credentials are configured.',
      detail:
        'Signed webhook delivery works without a GitHub App. Authenticated repository and publishing actions remain unavailable.',
      refreshable: true,
    },
    {
      domain: 'repository',
      title: 'Repository & libraries',
      state: repositoryState,
      summary:
        repositoryState === 'success'
          ? `${snapshot.libraries.length} libraries linked in the local registry index`
          : 'No libraries are declared in the local registry index',
      detail: `${published} of ${snapshot.assets.length} assets are official or verified.`,
      observedAt: snapshot.generatedAt,
    },
  ];
}
