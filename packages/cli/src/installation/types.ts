import type {
  ConfigurationChange,
  EnvironmentVariable,
  InstallationMode,
  PackageDependency,
  ProjectConfiguration,
  SetupStep,
} from '@simplify-dev/schemas';
import type { ProjectDetectionResult } from '../detection/types.js';

export type FileConflictStatus =
  'unchanged' | 'modified' | 'missing' | 'user-owned' | 'new' | 'dependency';

export interface FileChange {
  readonly source: string;
  readonly target: string;
  readonly assetId: string;
  readonly status: FileConflictStatus;
  readonly exists: boolean;
}

export interface InstallationPlan {
  readonly assetId: string;
  readonly version: string;
  readonly installationMode: InstallationMode;
  readonly resolvedAssets: readonly {
    readonly id: string;
    readonly version: string;
    readonly category: string;
  }[];
  readonly fileChanges: readonly FileChange[];
  readonly packageDependencies: readonly PackageDependency[];
  readonly environmentVariables: readonly EnvironmentVariable[];
  readonly configurationChanges: readonly ConfigurationChange[];
  readonly setupSteps: readonly SetupStep[];
  readonly dryRun: boolean;
}

export interface PlannerOptions {
  readonly assetId: string;
  readonly version?: string;
  readonly mode?: InstallationMode;
  readonly dryRun?: boolean;
  readonly targetPath?: string;
  readonly cwd?: string;
}

export interface PlanSummary {
  readonly assetId: string;
  readonly version: string;
  readonly mode: InstallationMode;
  readonly fileCount: number;
  readonly newFileCount: number;
  readonly conflictCount: number;
  readonly packageCount: number;
  readonly envVarCount: number;
  readonly setupStepCount: number;
  readonly dryRun: boolean;
}

export type { ProjectConfiguration };
export type { ProjectDetectionResult };
