export interface ProjectDetectionResult {
  readonly projectRoot: string;
  readonly language: 'typescript' | 'javascript' | 'unknown';
  readonly framework: 'react' | 'next' | 'vue' | 'unknown';
  readonly packageManager: 'pnpm' | 'npm' | 'yarn' | 'unknown';
  readonly versions: {
    readonly node?: string;
    readonly framework?: string;
    readonly typescript?: string;
  };
  readonly sourceDirectories: readonly string[];
  readonly importAliases: Record<string, string>;
  readonly monorepo: {
    readonly isMonorepo: boolean;
    readonly workspaces?: readonly string[];
    readonly root?: string;
  };
  readonly simplifyConfig: boolean;
}

export class DetectionError extends Error {
  override readonly name = 'DetectionError';

  constructor(message: string) {
    super(message);
  }
}
