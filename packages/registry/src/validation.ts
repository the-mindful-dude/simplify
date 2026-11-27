import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import {
  assetManifestSchema,
  developmentSnapshotSchema,
  libraryManifestSchema,
  projectConfigurationSchema,
  publicationRecordSchema,
  registryIndexSchema,
  repositoryAssociationSchema,
  type AssetManifest,
  type DevelopmentSnapshot,
  type LibraryManifest,
  type ProjectConfiguration,
  type PublicationRecord,
  type RegistryIndex,
  type RepositoryAssociation,
} from '@simplify-dev/schemas';

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
  readonly keyword: string;
}

export interface ValidationResult<T> {
  readonly valid: boolean;
  readonly value?: T;
  readonly issues: readonly ValidationIssue[];
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

type CompiledValidator = ReturnType<typeof ajv.compile>;
type AjvSchema = Parameters<typeof ajv.compile>[0];

function compile(schema: unknown): CompiledValidator {
  return ajv.compile(schema as AjvSchema);
}

const assetValidator = compile(assetManifestSchema);
const libraryValidator = compile(libraryManifestSchema);
const projectConfigurationValidator = compile(projectConfigurationSchema);
const publicationValidator = compile(publicationRecordSchema);
const developmentSnapshotValidator = compile(developmentSnapshotSchema);
const repositoryAssociationValidator = compile(repositoryAssociationSchema);
const registryIndexValidator = compile(registryIndexSchema);

function toIssues(errors: readonly ErrorObject[] | null | undefined): ValidationIssue[] {
  if (!errors) {
    return [];
  }

  return errors.map((error) => ({
    path: error.instancePath.length > 0 ? error.instancePath : '/',
    message: error.message ?? 'Schema validation failed.',
    keyword: error.keyword,
  }));
}

function validateWith<T>(validator: CompiledValidator, value: unknown): ValidationResult<T> {
  if (validator(value)) {
    return { valid: true, value: value as T, issues: [] };
  }

  return { valid: false, issues: toIssues(validator.errors) };
}

function isSafeRelativePath(value: string): boolean {
  if (value.startsWith('/') || value.startsWith('\\') || /^[A-Za-z]:/.test(value)) {
    return false;
  }

  return !value.split(/[\\/]+/).includes('..');
}

function categoryFromAssetId(assetId: string): string | undefined {
  return assetId.split('/')[0];
}

export function validateAssetManifest(value: unknown): ValidationResult<AssetManifest> {
  const result = validateWith<AssetManifest>(assetValidator, value);
  if (!result.valid || !result.value) {
    return result;
  }

  const manifest = result.value;
  const issues: ValidationIssue[] = [];

  if (categoryFromAssetId(manifest.id) !== manifest.category) {
    issues.push({
      path: '/id',
      message: 'Asset ID category must match the declared category.',
      keyword: 'assetIdCategory',
    });
  }

  if (manifest.dependencies?.registry?.some((dependency) => dependency.id === manifest.id)) {
    issues.push({
      path: '/dependencies/registry',
      message: 'An asset must not depend on itself.',
      keyword: 'selfDependency',
    });
  }

  const installationModes = new Set(
    manifest.installation?.modes.map((definition) => definition.mode) ?? [],
  );
  for (const [index, implementation] of manifest.implementations.entries()) {
    if (manifest.installation && !installationModes.has(implementation.mode)) {
      issues.push({
        path: `/implementations/${index}/mode`,
        message: `Installation metadata is missing for mode "${implementation.mode}".`,
        keyword: 'installationModeCoverage',
      });
    }
  }

  for (const [modeIndex, mode] of (manifest.installation?.modes ?? []).entries()) {
    for (const [fileIndex, file] of (mode.files ?? []).entries()) {
      if (!isSafeRelativePath(file.source) || !isSafeRelativePath(file.target)) {
        issues.push({
          path: `/installation/modes/${modeIndex}/files/${fileIndex}`,
          message: 'Source and target paths must stay within the project.',
          keyword: 'safePath',
        });
      }
    }
  }

  return issues.length > 0
    ? { valid: false, issues }
    : { valid: true, value: manifest, issues: [] };
}

export function validateLibraryManifest(value: unknown): ValidationResult<LibraryManifest> {
  const result = validateWith<LibraryManifest>(libraryValidator, value);
  if (!result.valid || !result.value) {
    return result;
  }

  const issues: ValidationIssue[] = [];
  const seen = new Set<string>();

  for (const [index, assetPath] of result.value.assets.entries()) {
    if (!isSafeRelativePath(assetPath)) {
      issues.push({
        path: `/assets/${index}`,
        message: 'Asset manifest paths must stay within the repository.',
        keyword: 'safePath',
      });
    }
    if (seen.has(assetPath)) {
      issues.push({
        path: `/assets/${index}`,
        message: `Asset manifest path "${assetPath}" is listed more than once.`,
        keyword: 'duplicateAsset',
      });
    }
    seen.add(assetPath);
  }

  return issues.length > 0
    ? { valid: false, issues }
    : { valid: true, value: result.value, issues: [] };
}

export function validateProjectConfiguration(
  value: unknown,
): ValidationResult<ProjectConfiguration> {
  return validateWith<ProjectConfiguration>(projectConfigurationValidator, value);
}

export function validatePublicationRecord(value: unknown): ValidationResult<PublicationRecord> {
  return validateWith<PublicationRecord>(publicationValidator, value);
}

export function validateDevelopmentSnapshot(value: unknown): ValidationResult<DevelopmentSnapshot> {
  return validateWith<DevelopmentSnapshot>(developmentSnapshotValidator, value);
}

export function validateRepositoryAssociation(
  value: unknown,
): ValidationResult<RepositoryAssociation> {
  return validateWith<RepositoryAssociation>(repositoryAssociationValidator, value);
}

export function validateRegistryIndex(value: unknown): ValidationResult<RegistryIndex> {
  return validateWith<RegistryIndex>(registryIndexValidator, value);
}
