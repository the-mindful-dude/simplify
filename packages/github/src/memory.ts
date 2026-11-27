import type {
  RepositoryLink,
  RepositoryLinkStore,
  WebhookDeliveryRecord,
  WebhookDeliveryStore,
} from './ports.js';

export class InMemoryRepositoryLinkStore implements RepositoryLinkStore {
  private readonly links = new Map<string, RepositoryLink>();

  async findByRepositoryId(repositoryId: string): Promise<RepositoryLink | undefined> {
    return this.links.get(repositoryId);
  }

  async findByLibraryId(libraryId: string): Promise<RepositoryLink | undefined> {
    return [...this.links.values()].find((link) => link.libraryId === libraryId);
  }

  async list(): Promise<readonly RepositoryLink[]> {
    return [...this.links.values()];
  }

  async save(link: RepositoryLink): Promise<void> {
    this.links.set(link.repositoryId, link);
  }

  async delete(repositoryId: string): Promise<void> {
    this.links.delete(repositoryId);
  }
}

export class InMemoryWebhookDeliveryStore implements WebhookDeliveryStore {
  private readonly deliveries = new Map<string, WebhookDeliveryRecord>();

  async record(record: WebhookDeliveryRecord): Promise<void> {
    this.deliveries.set(record.deliveryId, record);
  }

  /** Test helper for inspecting a finalized delivery; not part of the port. */
  async get(deliveryId: string): Promise<WebhookDeliveryRecord | undefined> {
    return this.deliveries.get(deliveryId);
  }

  async claim(record: WebhookDeliveryRecord): Promise<boolean> {
    // No await between the check and the write: within a single event-loop
    // turn no other caller can interleave, so only one claimant can win.
    if (this.deliveries.has(record.deliveryId)) {
      return false;
    }
    this.deliveries.set(record.deliveryId, record);
    return true;
  }
}
