import type { JsonSchema } from './json-schema.js';

export const schemaVersion = 1;

export type AssetCategory = 'ui' | 'blocks' | 'logic' | 'integrations' | 'recipes' | 'templates';

export type InstallationMode = 'package' | 'source' | 'hybrid';

export type AssetStatus = 'official' | 'community' | 'verified' | 'deprecated' | 'compromised';

export type PackageDependencyKind = 'runtime' | 'peer' | 'optional' | 'development';

export type RuntimeCapability = 'browser' | 'server' | 'node' | 'edge';

export type Visibility = 'public' | 'private' | 'internal';

export interface ImplementationTarget {
  readonly language: string;
  readonly framework?: string;
  readonly runtime?: RuntimeCapability;
  readonly platform?: string;
}

export interface CompatibilityRange {
  readonly target: string;
  readonly range: string;
}

export interface AssetIdentity {
  readonly id: string;
  readonly category: AssetCategory;
  readonly name: string;
  readonly version: string;
  readonly publisher: string;
}

export const semanticVersionPattern =
  '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$';

export const assetIdPattern =
  '^(ui|blocks|logic|integrations|recipes|templates)/[a-z0-9][a-z0-9-]*$';

export const assetCategorySchema = {
  type: 'string',
  enum: ['ui', 'blocks', 'logic', 'integrations', 'recipes', 'templates'],
} satisfies JsonSchema;

export const installationModeSchema = {
  type: 'string',
  enum: ['package', 'source', 'hybrid'],
} satisfies JsonSchema;

export const assetStatusSchema = {
  type: 'string',
  enum: ['official', 'community', 'verified', 'deprecated', 'compromised'],
} satisfies JsonSchema;

export const runtimeCapabilitySchema = {
  type: 'string',
  enum: ['browser', 'server', 'node', 'edge'],
} satisfies JsonSchema;

export const visibilitySchema = {
  type: 'string',
  enum: ['public', 'private', 'internal'],
} satisfies JsonSchema;

export const implementationTargetSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['language'],
  properties: {
    language: { type: 'string', minLength: 1 },
    framework: { type: 'string', minLength: 1 },
    runtime: runtimeCapabilitySchema,
    platform: { type: 'string', minLength: 1 },
  },
} satisfies JsonSchema;

export const compatibilityRangeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['target', 'range'],
  properties: {
    target: { type: 'string', minLength: 1 },
    range: { type: 'string', minLength: 1 },
  },
} satisfies JsonSchema;
