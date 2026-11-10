import type { JsonSchema } from './json-schema.js';
import type { InstallationMode } from './common.js';
import type { DependencySet } from './dependency.js';
import { dependencySetSchema } from './dependency.js';

export interface EnvironmentVariable {
  readonly name: string;
  readonly description: string;
  readonly required: boolean;
  readonly example?: string;
  readonly secret?: boolean;
}

export interface SourceMapping {
  readonly source: string;
  readonly target: string;
}

export interface ConfigurationChange {
  readonly file: string;
  readonly format: 'json' | 'jsonc' | 'env' | 'typescript';
  readonly operation: 'merge' | 'append-example';
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface SetupStep {
  readonly description: string;
  readonly required: boolean;
}

export interface InstallationModeDefinition {
  readonly mode: InstallationMode;
  readonly packageName?: string;
  readonly files?: readonly SourceMapping[];
  readonly dependencies?: DependencySet;
  readonly environment?: readonly EnvironmentVariable[];
  readonly configuration?: readonly ConfigurationChange[];
  readonly setup?: readonly SetupStep[];
}

export const environmentVariableSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'description', 'required'],
  properties: {
    name: { type: 'string', pattern: '^[A-Z][A-Z0-9_]*$' },
    description: { type: 'string', minLength: 1 },
    required: { type: 'boolean' },
    example: { type: 'string' },
    secret: { type: 'boolean' },
  },
} satisfies JsonSchema;

export const sourceMappingSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['source', 'target'],
  properties: {
    source: { type: 'string', minLength: 1 },
    target: { type: 'string', minLength: 1 },
  },
} satisfies JsonSchema;

export const configurationChangeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['file', 'format', 'operation'],
  properties: {
    file: { type: 'string', minLength: 1 },
    format: { type: 'string', enum: ['json', 'jsonc', 'env', 'typescript'] },
    operation: { type: 'string', enum: ['merge', 'append-example'] },
    data: { type: 'object' },
  },
} satisfies JsonSchema;

export const setupStepSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['description', 'required'],
  properties: {
    description: { type: 'string', minLength: 1 },
    required: { type: 'boolean' },
  },
} satisfies JsonSchema;

export const installationModeDefinitionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['mode'],
  properties: {
    mode: { type: 'string', enum: ['package', 'source', 'hybrid'] },
    packageName: { type: 'string', minLength: 1 },
    files: { type: 'array', items: sourceMappingSchema },
    dependencies: dependencySetSchema,
    environment: { type: 'array', items: environmentVariableSchema },
    configuration: { type: 'array', items: configurationChangeSchema },
    setup: { type: 'array', items: setupStepSchema },
  },
} satisfies JsonSchema;

export const installationMetadataSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['modes'],
  properties: {
    modes: { type: 'array', minItems: 1, items: installationModeDefinitionSchema },
  },
} satisfies JsonSchema;
