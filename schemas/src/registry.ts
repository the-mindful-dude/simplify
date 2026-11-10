import type { JsonSchema } from './json-schema.js';
import type { AssetCategory, AssetStatus, ImplementationTarget } from './common.js';
import {
  assetCategorySchema,
  assetIdPattern,
  assetStatusSchema,
  implementationTargetSchema,
  schemaVersion,
  semanticVersionPattern,
} from './common.js';

export interface RegistryAssetSummary {
  readonly id: string;
  readonly category: AssetCategory;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly publisher: string;
  readonly status: AssetStatus;
  readonly targets: readonly ImplementationTarget[];
}

export interface RegistryLibrarySummary {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly publisher: string;
  readonly assets: readonly string[];
}

export interface RegistryIndex {
  readonly schemaVersion: number;
  readonly generatedAt: string;
  readonly assets: readonly RegistryAssetSummary[];
  readonly libraries: readonly RegistryLibrarySummary[];
}

export const registryAssetSummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'category', 'name', 'description', 'version', 'publisher', 'status', 'targets'],
  properties: {
    id: { type: 'string', pattern: assetIdPattern },
    category: assetCategorySchema,
    name: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },
    version: { type: 'string', pattern: semanticVersionPattern },
    publisher: { type: 'string', minLength: 1 },
    status: assetStatusSchema,
    targets: { type: 'array', minItems: 1, items: implementationTargetSchema },
  },
} satisfies JsonSchema;

export const registryLibrarySummarySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'description', 'version', 'publisher', 'assets'],
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$' },
    name: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },
    version: { type: 'string', pattern: semanticVersionPattern },
    publisher: { type: 'string', minLength: 1 },
    assets: { type: 'array', items: { type: 'string', pattern: assetIdPattern } },
  },
} satisfies JsonSchema;

export const registryIndexSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://simplify.dev/schema/registry-index.json',
  title: 'simplify.dev registry index',
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'generatedAt', 'assets', 'libraries'],
  properties: {
    schemaVersion: { const: schemaVersion },
    generatedAt: { type: 'string', format: 'date-time' },
    assets: { type: 'array', items: registryAssetSummarySchema },
    libraries: { type: 'array', items: registryLibrarySummarySchema },
  },
} satisfies JsonSchema;
