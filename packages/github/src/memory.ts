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

  async has(deliveryId: string): Promise<boolean> {
    return this.deliveries.has(deliveryId);
  }

  async record(record: WebhookDeliveryRecord): Promise<void> {
    this.deliveries.set(record.deliveryId, record);
  }

  async get(deliveryId: string): Promise<WebhookDeliveryRecord | undefined> {
    return this.deliveries.get(deliveryId);
  }
}
