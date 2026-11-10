import type { JsonSchema } from '@simplify-dev/schemas';
import {
  assetManifestSchema,
  libraryManifestSchema,
  registryAssetSummarySchema,
  registryIndexSchema,
  registryLibrarySummarySchema,
} from '@simplify-dev/schemas';
import type {
  AssetManifest,
  AssetCategory,
  AssetStatus,
  ImplementationTarget,
  InstallationMode,
  LibraryManifest,
  RegistryAssetSummary,
  RegistryIndex,
  RegistryLibrarySummary,
} from '@simplify-dev/schemas';

export {
  assetManifestSchema,
  libraryManifestSchema,
  registryAssetSummarySchema,
  registryIndexSchema,
  registryLibrarySummarySchema,
};

export type {
  AssetManifest,
  AssetCategory,
  AssetStatus,
  ImplementationTarget,
  InstallationMode,
  LibraryManifest,
  RegistryAssetSummary,
  RegistryIndex,
  RegistryLibrarySummary,
};

export interface AssetEntry extends RegistryAssetSummary {
  readonly integrity: string;
}

export const integrityPattern =
  '^sha256-[A-Za-z0-9+/]+={0,2}$';

export const assetEntrySchema = {
  ...registryAssetSummarySchema,
  required: [...registryAssetSummarySchema.required, 'integrity'],
  properties: {
    ...registryAssetSummarySchema.properties,
    integrity: { type: 'string', pattern: integrityPattern, minLength: 1 },
  },
} satisfies JsonSchema;
