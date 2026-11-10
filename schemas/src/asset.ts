import type { JsonSchema } from './json-schema.js';
import type {
  AssetCategory,
  AssetIdentity,
  AssetStatus,
  CompatibilityRange,
  ImplementationTarget,
  InstallationMode,
} from './common.js';
import type { DependencySet } from './dependency.js';
import type { InstallationModeDefinition } from './installation.js';
import {
  assetCategorySchema,
  assetIdPattern,
  assetStatusSchema,
  compatibilityRangeSchema,
  implementationTargetSchema,
  installationModeSchema,
  schemaVersion,
  semanticVersionPattern,
} from './common.js';
import { dependencySetSchema } from './dependency.js';
import { installationMetadataSchema } from './installation.js';

export interface AssetImplementation {
  readonly id: string;
  readonly target: ImplementationTarget;
  readonly mode: InstallationMode;
  readonly entry: string;
}

export interface DocumentationReferences {
  readonly readme?: string;
  readonly examples?: readonly string[];
  readonly changelog?: string;
}

export interface AssetPreview {
  readonly entry: string;
  readonly scenarios?: readonly string[];
}

export interface AssetManifest extends AssetIdentity {
  readonly schemaVersion: number;
  readonly description: string;
  readonly status: AssetStatus;
  readonly license: string;
  readonly targets: readonly ImplementationTarget[];
  readonly compatibility?: readonly CompatibilityRange[];
  readonly implementations: readonly AssetImplementation[];
  readonly dependencies?: DependencySet;
  readonly installation?: { readonly modes: readonly InstallationModeDefinition[] };
  readonly documentation?: DocumentationReferences;
  readonly preview?: AssetPreview;
}

export const assetImplementationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'target', 'mode', 'entry'],
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$' },
    target: implementationTargetSchema,
    mode: installationModeSchema,
    entry: { type: 'string', minLength: 1 },
  },
} satisfies JsonSchema;

export const documentationReferencesSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    readme: { type: 'string', minLength: 1 },
    examples: { type: 'array', items: { type: 'string', minLength: 1 } },
    changelog: { type: 'string', minLength: 1 },
  },
} satisfies JsonSchema;

export const assetPreviewSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['entry'],
  properties: {
    entry: { type: 'string', minLength: 1 },
    scenarios: { type: 'array', items: { type: 'string', minLength: 1 } },
  },
} satisfies JsonSchema;

export const assetManifestSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://simplify.dev/schema/asset.json',
  title: 'simplify.dev asset manifest',
  type: 'object',
  additionalProperties: false,
  required: [
    'schemaVersion',
    'id',
    'category',
    'name',
    'description',
    'version',
    'publisher',
    'status',
    'license',
    'targets',
    'implementations',
  ],
  properties: {
    schemaVersion: { const: schemaVersion },
    id: { type: 'string', pattern: assetIdPattern },
    category: assetCategorySchema,
    name: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },
    version: { type: 'string', pattern: semanticVersionPattern },
    publisher: { type: 'string', minLength: 1 },
    status: assetStatusSchema,
    license: { type: 'string', minLength: 1 },
    targets: { type: 'array', minItems: 1, items: implementationTargetSchema },
    compatibility: { type: 'array', items: compatibilityRangeSchema },
    implementations: { type: 'array', minItems: 1, items: assetImplementationSchema },
    dependencies: dependencySetSchema,
    installation: installationMetadataSchema,
    documentation: documentationReferencesSchema,
    preview: assetPreviewSchema,
  },
} satisfies JsonSchema;

export type AssetManifestCategory = AssetCategory;
