export type JsonSchema = {
  readonly $schema?: string;
  readonly $id?: string;
  readonly title?: string;
  readonly description?: string;
  readonly type?: string | readonly string[];
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly required?: readonly string[];
  readonly items?: JsonSchema;
  readonly enum?: readonly unknown[];
  readonly const?: unknown;
  readonly pattern?: string;
  readonly minLength?: number;
  readonly minItems?: number;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly oneOf?: readonly JsonSchema[];
  readonly anyOf?: readonly JsonSchema[];
  readonly allOf?: readonly JsonSchema[];
  readonly additionalProperties?: boolean | JsonSchema;
  readonly $defs?: Readonly<Record<string, JsonSchema>>;
  readonly $ref?: string;
  readonly format?: string;
  readonly default?: unknown;
  readonly examples?: readonly unknown[];
};

export const schemaDialect = 'https://json-schema.org/draft/2020-12/schema';
