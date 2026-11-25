import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  type AssetManifest,
  type AssetCategory,
  type AssetStatus,
  type LibraryManifest,
  type RegistryAssetSummary,
  type RegistryIndex,
  type RegistryLibrarySummary,
} from '@simplify-dev/schemas';

import { RegistryArtifactResolver, RegistryArtifactResolverError } from '../artifact-resolver.js';

export class RegistryClientError extends Error {
  public readonly code: string;

  constructor(message: string, code: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'RegistryClientError';
    this.code = code;
  }
}

export interface RegistryClientOptions {
  readonly registryRoot?: string;
}

export class RegistryClient {
  private readonly artifacts: RegistryArtifactResolver;

  constructor(options: RegistryClientOptions = {}) {
    const registryRoot = options.registryRoot ?? join(process.cwd(), 'registry');
    this.artifacts = new RegistryArtifactResolver({ registryRoot });
  }

  /** Keep resolver failures structured under the client's public error type. */
  private resolvePath<T>(buildPath: () => T): T {
    try {
      return buildPath();
    } catch (error) {
      if (error instanceof RegistryArtifactResolverError) {
        throw new RegistryClientError(error.message, error.code, error);
      }
      throw error;
    }
  }

  private indexPath(): string {
    return this.resolvePath(() => this.artifacts.indexPath());
  }

  private assetManifestPath(assetId: string, version: string): string {
    return this.resolvePath(() => this.artifacts.assetManifestPath(assetId, version));
  }

  private libraryManifestPath(libraryId: string, version: string): string {
    return this.resolvePath(() => this.artifacts.libraryManifestPath(libraryId, version));
  }

  private assetFilePath(assetId: string, version: string, sourcePath: string): string {
    return this.resolvePath(() => this.artifacts.assetFilePath(assetId, version, sourcePath));
  }

  private async readJsonFile<T>(filePath: string): Promise<T> {
    let raw: string;
    try {
      raw = await readFile(filePath, 'utf8');
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        throw new RegistryClientError(
          `Registry file not found: ${filePath}`,
          'REGISTRY_FILE_NOT_FOUND',
          error,
        );
      }
      throw new RegistryClientError(
        `Failed to read registry file "${filePath}": ${nodeError.message ?? String(error)}`,
        'REGISTRY_READ_FAILED',
        error,
      );
    }

    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      throw new RegistryClientError(
        `Failed to parse registry file "${filePath}" as JSON: ${(error as Error).message}`,
        'REGISTRY_INVALID_JSON',
        error,
      );
    }
  }

  private async readBytes(filePath: string): Promise<Uint8Array> {
    let buffer: Buffer;
    try {
      buffer = await readFile(filePath);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        throw new RegistryClientError(
          `Registry file not found: ${filePath}`,
          'REGISTRY_FILE_NOT_FOUND',
          error,
        );
      }
      throw new RegistryClientError(
        `Failed to read registry file "${filePath}": ${nodeError.message ?? String(error)}`,
        'REGISTRY_READ_FAILED',
        error,
      );
    }

    return buffer;
  }

  async getRegistryIndex(): Promise<RegistryIndex> {
    return this.readJsonFile<RegistryIndex>(this.indexPath());
  }

  private async resolveAssetVersion(assetId: string): Promise<string | null> {
    const index = await this.getRegistryIndex();
    const asset = index.assets.find((summary) => summary.id === assetId);
    return asset?.version ?? null;
  }

  async getAsset(assetId: string, version?: string): Promise<AssetManifest | null> {
    this.resolvePath(() => this.artifacts.validateAssetId(assetId));
    const resolvedVersion = version ?? (await this.resolveAssetVersion(assetId));
    if (!resolvedVersion) {
      return null;
    }

    try {
      return await this.readJsonFile<AssetManifest>(
        this.assetManifestPath(assetId, resolvedVersion),
      );
    } catch (error) {
      if ((error as RegistryClientError).code === 'REGISTRY_FILE_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  async getLibrary(libraryId: string): Promise<LibraryManifest | null> {
    let version: string | null = null;
    try {
      const index = await this.getRegistryIndex();
      const library = index.libraries.find((summary) => summary.id === libraryId);
      version = library?.version ?? null;
    } catch (error) {
      if ((error as RegistryClientError).code === 'REGISTRY_FILE_NOT_FOUND') {
        return null;
      }
      throw error;
    }

    if (!version) {
      return null;
    }

    try {
      return await this.readJsonFile<LibraryManifest>(this.libraryManifestPath(libraryId, version));
    } catch (error) {
      if ((error as RegistryClientError).code === 'REGISTRY_FILE_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  async listAssets(
    category?: AssetCategory,
    status?: AssetStatus,
  ): Promise<RegistryAssetSummary[]> {
    const index = await this.getRegistryIndex();
    return index.assets.filter((summary) => {
      if (category !== undefined && summary.category !== category) {
        return false;
      }
      if (status !== undefined && summary.status !== status) {
        return false;
      }
      return true;
    });
  }

  async listLibraries(): Promise<RegistryLibrarySummary[]> {
    const index = await this.getRegistryIndex();
    return [...index.libraries];
  }

  async getAssetFile(assetId: string, version: string, sourcePath: string): Promise<Uint8Array> {
    return this.readBytes(this.assetFilePath(assetId, version, sourcePath));
  }
}
