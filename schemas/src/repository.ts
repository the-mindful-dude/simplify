import type { JsonSchema } from './json-schema.js';
import type { Visibility } from './common.js';
import { visibilitySchema } from './common.js';

export interface RepositoryAssociation {
  readonly repositoryId: string;
  readonly owner: string;
  readonly name: string;
  readonly url: string;
  readonly defaultBranch: string;
  readonly visibility: Visibility;
  readonly libraryId: string;
  readonly linkedAt: string;
  readonly status: 'active' | 'inaccessible' | 'deleted' | 'transferred';
}

export const repositoryAssociationSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://simplify.dev/schema/repository-association.json',
  title: 'simplify.dev repository association',
  type: 'object',
  additionalProperties: false,
  required: [
    'repositoryId',
    'owner',
    'name',
    'url',
    'defaultBranch',
    'visibility',
    'libraryId',
    'linkedAt',
    'status',
  ],
  properties: {
    repositoryId: { type: 'string', minLength: 1 },
    owner: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    url: { type: 'string', minLength: 1 },
    defaultBranch: { type: 'string', minLength: 1 },
    visibility: visibilitySchema,
    libraryId: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]*$' },
    linkedAt: { type: 'string', format: 'date-time' },
    status: {
      type: 'string',
      enum: ['active', 'inaccessible', 'deleted', 'transferred'],
    },
  },
} satisfies JsonSchema;
