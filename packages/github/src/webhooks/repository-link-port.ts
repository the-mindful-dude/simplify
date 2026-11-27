import type { RepositoryLink, RepositoryLinkStore, WebhookEventPort } from '../ports.js';

const statusByAction: Readonly<Record<string, RepositoryLink['status']>> = {
  deleted: 'deleted',
  transferred: 'transferred',
};

/**
 * Adapts repository lifecycle webhooks to the existing repository link store.
 *
 * Only actions with an unambiguous terminal status are applied; actions that
 * would require reading fresh data from GitHub are ignored so the handler never
 * fabricates an API call from webhook payload data.
 */
export function createRepositoryLinkEventPort(store: RepositoryLinkStore): WebhookEventPort {
  return {
    async onRepositoryLifecycle(event) {
      const status = statusByAction[event.action];
      if (!status || !event.repositoryId) {
        return;
      }
      const link = await store.findByRepositoryId(event.repositoryId);
      if (!link) {
        return;
      }
      await store.save({ ...link, status });
    },
  };
}
