import type {
  AssetManifest,
  ConfigurationChange,
  EnvironmentVariable,
  InstallationMode,
  PackageDependency,
  ProjectConfiguration,
} from '@simplify-dev/schemas';

interface ResolvedAsset {
  readonly id: string;
  readonly version: string;
  readonly category: string;
}

interface FileMapping {
  readonly source: string;
  readonly target: string;
  readonly assetId: string;
}

interface InstallationModeAssignment {
  readonly assetId: string;
  readonly mode: InstallationMode;
}

interface RegistryDependency {
  readonly id: string;
  readonly version: string;
  readonly optional?: boolean;
  readonly reason?: string;
}

declare module '@simplify-dev/registry' {
  export class DependencyResolver {
    constructor(
      loadAsset: (id: string, version?: string) => Promise<AssetManifest | undefined>,
      options?: { defaultMode?: InstallationMode },
    );
    resolve(assetIds: string[], projectConfig: ProjectConfiguration): Promise<ResolutionResult>;
  }

  export interface ResolutionResult {
    readonly assets: readonly ResolvedAsset[];
    readonly registryDependencies: readonly RegistryDependency[];
    readonly packageDependencies: readonly PackageDependency[];
    readonly installationModes: readonly InstallationModeAssignment[];
    readonly fileMappings: readonly FileMapping[];
    readonly environmentVariables: readonly EnvironmentVariable[];
    readonly configurationChanges: readonly ConfigurationChange[];
  }
}
