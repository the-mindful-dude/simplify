import { DetectionError } from './types.js';
import type { ProjectDetectionResult } from './types.js';

import * as fs from 'node:fs';
import * as path from 'node:path';

const PROJECT_FILES = ['package.json', 'simplify.config.json', '.git'];
const SOURCE_DIRECTORIES = ['src', 'app', 'pages', 'lib', 'components'];

type DetectedLanguage = 'typescript' | 'javascript' | 'unknown';
type DetectedFramework = 'react' | 'next' | 'vue' | 'unknown';
type DetectedPackageManager = 'pnpm' | 'npm' | 'yarn' | 'unknown';

export class ProjectDetector {
  private projectRoot: string | null = null;

  detectProjectRoot(cwd?: string): string {
    const startDir = cwd ?? process.cwd();
    let current = path.resolve(startDir);

    while (true) {
      for (const marker of PROJECT_FILES) {
        const markerPath = path.join(current, marker);
        if (fs.existsSync(markerPath)) {
          this.projectRoot = current;
          return current;
        }
      }

      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }

    throw new DetectionError(
      `No project root found. Looked for package.json, simplify.config.json, or .git starting from ${startDir}`,
    );
  }

  private getRoot(): string {
    if (this.projectRoot !== null) {
      return this.projectRoot;
    }
    return process.cwd();
  }

  private readJsonFile<T>(filePath: string): T | undefined {
    try {
      if (!fs.existsSync(filePath)) {
        return undefined;
      }
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content) as T;
    } catch {
      return undefined;
    }
  }

  private readPackageJson(): Record<string, unknown> | undefined {
    return this.readJsonFile<Record<string, unknown>>(
      path.join(this.getRoot(), 'package.json'),
    );
  }

  private readTsConfig(): Record<string, unknown> | undefined {
    return this.readJsonFile<Record<string, unknown>>(
      path.join(this.getRoot(), 'tsconfig.json'),
    );
  }

  private getDependencies(pkg: Record<string, unknown>): string[] {
    const deps: string[] = [];
    for (const field of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
    ]) {
      const value = pkg[field];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const key of Object.keys(value as Record<string, unknown>)) {
          deps.push(key);
        }
      }
    }
    return deps;
  }

  detectLanguage(): DetectedLanguage {
    const root = this.getRoot();
    const tsConfigPath = path.join(root, 'tsconfig.json');
    const pkg = this.readPackageJson();

    if (fs.existsSync(tsConfigPath)) {
      return 'typescript';
    }

    if (pkg) {
      const deps = this.getDependencies(pkg);
      if (deps.includes('typescript')) {
        return 'typescript';
      }
      for (const dep of deps) {
        if (dep.startsWith('@types/')) {
          return 'typescript';
        }
      }
    }

    const entries = this.listDirectory(root);
    for (const entry of entries) {
      if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        return 'typescript';
      }
    }

    for (const entry of entries) {
      if (entry.endsWith('.js') || entry.endsWith('.jsx')) {
        return 'javascript';
      }
    }

    return 'unknown';
  }

  detectFramework(): DetectedFramework {
    const root = this.getRoot();
    const pkg = this.readPackageJson();

    const nextConfigFiles = [
      'next.config.js',
      'next.config.mjs',
      'next.config.ts',
    ];
    for (const configFile of nextConfigFiles) {
      if (fs.existsSync(path.join(root, configFile))) {
        return 'next';
      }
    }

    if (pkg) {
      const deps = this.getDependencies(pkg);
      if (deps.includes('next')) {
        return 'next';
      }
      if (deps.includes('react')) {
        return 'react';
      }
      if (deps.includes('vue')) {
        return 'vue';
      }
    }

    const vueConfigFiles = ['vue.config.js', 'vue.config.ts'];
    for (const configFile of vueConfigFiles) {
      if (fs.existsSync(path.join(root, configFile))) {
        return 'vue';
      }
    }

    return 'unknown';
  }

  detectPackageManager(): DetectedPackageManager {
    const root = this.getRoot();
    const lockfiles: { file: string; manager: DetectedPackageManager }[] = [
      { file: 'pnpm-lock.yaml', manager: 'pnpm' },
      { file: 'package-lock.json', manager: 'npm' },
      { file: 'yarn.lock', manager: 'yarn' },
    ];

    for (const { file, manager } of lockfiles) {
      if (fs.existsSync(path.join(root, file))) {
        return manager;
      }
    }

    return 'unknown';
  }

  detectVersions(): {
    node?: string;
    framework?: string;
    typescript?: string;
  } {
    const versions: {
      node?: string;
      framework?: string;
      typescript?: string;
    } = {};

    versions.node = process.version.replace(/^v/, '');

    const pkg = this.readPackageJson();
    if (pkg) {
      const deps = this.getDependencies(pkg);
      if (deps.includes('next')) {
        const fwVersion = this.getDependencyVersion(pkg, 'next');
        if (fwVersion) {
          versions.framework = fwVersion;
        }
      } else if (deps.includes('react')) {
        const fwVersion = this.getDependencyVersion(pkg, 'react');
        if (fwVersion) {
          versions.framework = fwVersion;
        }
      } else if (deps.includes('vue')) {
        const fwVersion = this.getDependencyVersion(pkg, 'vue');
        if (fwVersion) {
          versions.framework = fwVersion;
        }
      }

      const tsVersion = this.getDependencyVersion(pkg, 'typescript');
      if (tsVersion) {
        versions.typescript = tsVersion;
      }
    }

    return versions;
  }

  private getDependencyVersion(
    pkg: Record<string, unknown>,
    depName: string,
  ): string | undefined {
    for (const field of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
    ]) {
      const value = pkg[field];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const fieldMap = value as Record<string, unknown>;
        if (depName in fieldMap) {
          const version = fieldMap[depName];
          if (typeof version === 'string') {
            return version;
          }
        }
      }
    }
    return undefined;
  }

  detectSourceDirectories(): readonly string[] {
    const root = this.getRoot();
    const found: string[] = [];

    for (const dir of SOURCE_DIRECTORIES) {
      const dirPath = path.join(root, dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        found.push(dir);
      }
    }

    return found;
  }

  detectImportAliases(): Record<string, string> {
    const tsConfig = this.readTsConfig();
    if (!tsConfig) {
      return {};
    }

    const compilerOptions = tsConfig.compilerOptions;
    if (!compilerOptions || typeof compilerOptions !== 'object') {
      return {};
    }

    const paths = (compilerOptions as Record<string, unknown>).paths;
    if (!paths || typeof paths !== 'object' || Array.isArray(paths)) {
      return {};
    }

    const aliases: Record<string, string> = {};
    for (const [alias, targets] of Object.entries(
      paths as Record<string, unknown>,
    )) {
      if (
        targets &&
        Array.isArray(targets) &&
        targets.length > 0 &&
        typeof targets[0] === 'string'
      ) {
        aliases[alias] = targets[0] as string;
      }
    }

    return aliases;
  }

  detectMonorepo(): {
    isMonorepo: boolean;
    workspaces?: readonly string[];
    root?: string;
  } {
    const root = this.getRoot();

    const monorepoConfigs = [
      { file: 'pnpm-workspace.yaml', type: 'pnpm' },
      { file: 'turbo.json', type: 'turbo' },
      { file: 'nx.json', type: 'nx' },
    ];

    for (const { file } of monorepoConfigs) {
      if (fs.existsSync(path.join(root, file))) {
        return {
          isMonorepo: true,
          root,
        };
      }
    }

    const pkg = this.readPackageJson();
    if (pkg) {
      const workspaces = pkg.workspaces;
      if (
        workspaces &&
        typeof workspaces === 'object' &&
        !Array.isArray(workspaces)
      ) {
        const wsObj = workspaces as Record<string, unknown>;
        if ('packages' in wsObj) {
          const packages = wsObj.packages;
          if (Array.isArray(packages)) {
            return {
              isMonorepo: true,
              workspaces: packages as readonly string[],
              root,
            };
          }
        }
      } else if (Array.isArray(workspaces)) {
        return {
          isMonorepo: true,
          workspaces: workspaces as readonly string[],
          root,
        };
      }
    }

    return { isMonorepo: false };
  }

  detectSimplifyConfig(): boolean {
    const root = this.getRoot();
    return fs.existsSync(path.join(root, 'simplify.config.json'));
  }

  detectAll(): ProjectDetectionResult {
    if (this.projectRoot === null) {
      this.detectProjectRoot();
    }
    const projectRoot = this.projectRoot as string;

    return {
      projectRoot,
      language: this.detectLanguage(),
      framework: this.detectFramework(),
      packageManager: this.detectPackageManager(),
      versions: this.detectVersions(),
      sourceDirectories: this.detectSourceDirectories(),
      importAliases: this.detectImportAliases(),
      monorepo: this.detectMonorepo(),
      simplifyConfig: this.detectSimplifyConfig(),
    };
  }

  private listDirectory(dir: string): string[] {
    try {
      return fs.readdirSync(dir);
    } catch {
      return [];
    }
  }
}
