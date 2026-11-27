import type { JsonSchema } from './json-schema.js';
import type { InstallationMode } from './common.js';
import { installationModeSchema, schemaVersion } from './common.js';

export interface ProjectInstallationPaths {
  readonly ui: string;
  readonly blocks: string;
  readonly logic: string;
  readonly integrations: string;
  readonly hooks: string;
  readonly styles: string;
}

export interface ProjectApplication {
  readonly name: string;
  readonly root: string;
  readonly sourceRoot?: string;
}

export interface ProjectConfiguration {
  readonly schemaVersion: number;
  readonly packageManager?: 'pnpm' | 'npm' | 'yarn' | 'bun';
  readonly registry?: {
    readonly url: string;
    readonly aliases?: Readonly<Record<string, string>>;
  };
  readonly installation: {
    readonly defaultMode: InstallationMode;
    readonly paths: ProjectInstallationPaths;
  };
  readonly applications?: readonly ProjectApplication[];
}

const pathSchema = { type: 'string', minLength: 1 } satisfies JsonSchema;

export const projectInstallationPathsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['ui', 'blocks', 'logic', 'integrations', 'hooks', 'styles'],
  properties: {
    ui: pathSchema,
    blocks: pathSchema,
    logic: pathSchema,
    integrations: pathSchema,
    hooks: pathSchema,
    styles: pathSchema,
  },
} satisfies JsonSchema;

export const projectApplicationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'root'],
  properties: {
    name: { type: 'string', minLength: 1 },
    root: pathSchema,
    sourceRoot: pathSchema,
  },
} satisfies JsonSchema;

export const projectConfigurationSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://simplify.dev/schema/simplify.config.json',
  title: 'simplify.dev project configuration',
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'installation'],
  properties: {
    schemaVersion: { const: schemaVersion },
    packageManager: { type: 'string', enum: ['pnpm', 'npm', 'yarn', 'bun'] },
    registry: {
      type: 'object',
      additionalProperties: false,
      required: ['url'],
      properties: {
        url: { type: 'string', minLength: 1 },
        aliases: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
    installation: {
      type: 'object',
      additionalProperties: false,
      required: ['defaultMode', 'paths'],
      properties: {
        defaultMode: installationModeSchema,
        paths: projectInstallationPathsSchema,
      },
    },
    applications: { type: 'array', items: projectApplicationSchema },
  },
} satisfies JsonSchema;
