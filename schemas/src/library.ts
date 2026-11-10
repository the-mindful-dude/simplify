import type { JsonSchema } from './json-schema.js';
import type { DependencySet } from './dependency.js';
import type { DocumentationReferences } from './asset.js';
import { dependencySetSchema } from './dependency.js';
import { documentationReferencesSchema } from './asset.js';
import { schemaVersion, semanticVersionPattern } from './common.js';

export interface Maintainer {
  readonly name: string;
  readonly url?: string;
  readonly email?: string;
}

export interface PublishingConfiguration {
  readonly include: readonly string[];
  readonly exclude?: readonly string[];
}

export interface LibraryManifest {
  readonly schemaVersion: number;
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly license: string;
  readonly maintainers?: readonly Maintainer[];
  readonly repository?: string;
  readonly assets: readonly string[];
  readonly dependencies?: DependencySet;
  readonly publishing: PublishingConfiguration;
  readonly documentation?: DocumentationReferences;
}

export const maintainerSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1 },
    url: { type: 'string', minLength: 1 },
    email: { type: 'string', minLength: 1 },
  },
} satisfies JsonSchema;

export const publishingConfigurationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['include'],
  properties: {
    include: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } },
    exclude: { type: 'array', items: { type: 'string', minLength: 1 } },
  },
} satisfies JsonSchema;

export const libraryManifestSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://simplify.dev/schema/library.json',
  title: 'simplify.dev library manifest',
  type: 'object',
  additionalProperties: false,
  required: [
    'schemaVersion',
    'id',
    'name',
    'description',
    'version',
    'license',
    'assets',
    'publishing',
  ],
  properties: {
    schemaVersion: { const: schemaVersion },
    id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$' },
    name: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },
    version: { type: 'string', pattern: semanticVersionPattern },
    license: { type: 'string', minLength: 1 },
    maintainers: { type: 'array', items: maintainerSchema },
    repository: { type: 'string', minLength: 1 },
    assets: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } },
    dependencies: dependencySetSchema,
    publishing: publishingConfigurationSchema,
    documentation: documentationReferencesSchema,
  },
} satisfies JsonSchema;
