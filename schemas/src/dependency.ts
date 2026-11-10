import type { JsonSchema } from './json-schema.js';
import type { PackageDependencyKind } from './common.js';

export interface RegistryDependency {
  readonly id: string;
  readonly version: string;
  readonly optional?: boolean;
  readonly reason?: string;
}

export interface PackageDependency {
  readonly name: string;
  readonly version: string;
  readonly kind: PackageDependencyKind;
}

export interface DependencySet {
  readonly registry?: readonly RegistryDependency[];
  readonly packages?: readonly PackageDependency[];
}

export const registryDependencySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'version'],
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*/[a-z0-9][a-z0-9-]*$' },
    version: { type: 'string', minLength: 1 },
    optional: { type: 'boolean' },
    reason: { type: 'string', minLength: 1 },
  },
} satisfies JsonSchema;

export const packageDependencySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'version', 'kind'],
  properties: {
    name: { type: 'string', minLength: 1 },
    version: { type: 'string', minLength: 1 },
    kind: {
      type: 'string',
      enum: ['runtime', 'peer', 'optional', 'development'],
    },
  },
} satisfies JsonSchema;

export const dependencySetSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    registry: { type: 'array', items: registryDependencySchema },
    packages: { type: 'array', items: packageDependencySchema },
  },
} satisfies JsonSchema;
