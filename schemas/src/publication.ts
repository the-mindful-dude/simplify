import type { JsonSchema } from './json-schema.js';
import { schemaVersion, semanticVersionPattern } from './common.js';

export interface PublicationSource {
  readonly repositoryId: string;
  readonly owner: string;
  readonly name: string;
  readonly url: string;
  readonly commitSha: string;
  readonly tag?: string;
  readonly release?: string;
}

export interface PublicationArtifact {
  readonly url: string;
  readonly integrity: string;
  readonly size?: number;
}

export interface PublicationRecord {
  readonly schemaVersion: number;
  readonly libraryId: string;
  readonly version: string;
  readonly source: PublicationSource;
  readonly publishedAt: string;
  readonly artifact: PublicationArtifact;
  readonly publisher: string;
  readonly immutable: true;
}

export interface DevelopmentSnapshot {
  readonly libraryId: string;
  readonly branch: string;
  readonly commitSha: string;
  readonly createdAt: string;
  readonly kind: 'development';
}

export const publicationSourceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['repositoryId', 'owner', 'name', 'url', 'commitSha'],
  properties: {
    repositoryId: { type: 'string', minLength: 1 },
    owner: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    url: { type: 'string', minLength: 1 },
    commitSha: { type: 'string', minLength: 1 },
    tag: { type: 'string', minLength: 1 },
    release: { type: 'string', minLength: 1 },
  },
} satisfies JsonSchema;

export const publicationArtifactSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['url', 'integrity'],
  properties: {
    url: { type: 'string', minLength: 1 },
    integrity: { type: 'string', minLength: 1 },
    size: { type: 'number', minimum: 0 },
  },
} satisfies JsonSchema;

export const publicationRecordSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://simplify.dev/schema/publication.json',
  title: 'simplify.dev publication record',
  type: 'object',
  additionalProperties: false,
  required: [
    'schemaVersion',
    'libraryId',
    'version',
    'source',
    'publishedAt',
    'artifact',
    'publisher',
    'immutable',
  ],
  properties: {
    schemaVersion: { const: schemaVersion },
    libraryId: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$' },
    version: { type: 'string', pattern: semanticVersionPattern },
    source: publicationSourceSchema,
    publishedAt: { type: 'string', format: 'date-time' },
    artifact: publicationArtifactSchema,
    publisher: { type: 'string', minLength: 1 },
    immutable: { const: true },
  },
} satisfies JsonSchema;

export const developmentSnapshotSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://simplify.dev/schema/development-snapshot.json',
  title: 'simplify.dev development snapshot',
  type: 'object',
  additionalProperties: false,
  required: ['libraryId', 'branch', 'commitSha', 'createdAt', 'kind'],
  properties: {
    libraryId: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$' },
    branch: { type: 'string', minLength: 1 },
    commitSha: { type: 'string', minLength: 1 },
    createdAt: { type: 'string', format: 'date-time' },
    kind: { const: 'development' },
  },
} satisfies JsonSchema;
