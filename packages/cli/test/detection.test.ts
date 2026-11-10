import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { ProjectDetector } from '../src/detection/index.js';
import { DetectionError } from '../src/detection/types.js';
import type { ProjectDetectionResult } from '../src/detection/types.js';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'simplify-detect-'));
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function writeJson(filePath: string, data: unknown): void {
  writeFile(filePath, JSON.stringify(data, null, 2));
}

describe('ProjectDetector', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectProjectRoot', () => {
    it('finds project root via package.json', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'test-app' });
      const detector = new ProjectDetector();
      expect(detector.detectProjectRoot(tempDir)).toBe(tempDir);
    });

    it('finds project root via simplify.config.json', () => {
      writeJson(path.join(tempDir, 'simplify.config.json'), {
        schemaVersion: 1,
        installation: {
          defaultMode: 'source',
          paths: {
            ui: 'ui',
            blocks: 'blocks',
            logic: 'logic',
            integrations: 'integrations',
            hooks: 'hooks',
            styles: 'styles',
          },
        },
      });
      const detector = new ProjectDetector();
      expect(detector.detectProjectRoot(tempDir)).toBe(tempDir);
    });

    it('finds project root via .git directory', () => {
      fs.mkdirSync(path.join(tempDir, '.git'), { recursive: true });
      const detector = new ProjectDetector();
      expect(detector.detectProjectRoot(tempDir)).toBe(tempDir);
    });

    it('walks up to find project root in parent directory', () => {
      const childDir = path.join(tempDir, 'sub', 'deep');
      fs.mkdirSync(childDir, { recursive: true });
      writeJson(path.join(tempDir, 'package.json'), { name: 'parent-app' });
      const detector = new ProjectDetector();
      expect(detector.detectProjectRoot(childDir)).toBe(tempDir);
    });

    it('throws DetectionError when no project files exist', () => {
      const detector = new ProjectDetector();
      expect(() => detector.detectProjectRoot(tempDir)).toThrow(/No project root found/);
      expect(() => detector.detectProjectRoot(tempDir)).toThrow(DetectionError);
    });

    it('uses process.cwd() when cwd is not provided', () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      try {
        writeJson(path.join(tempDir, 'package.json'), { name: 'cwd-app' });
        const detector = new ProjectDetector();
        expect(detector.detectProjectRoot()).toBe(tempDir);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('detectLanguage', () => {
    it('detects typescript from tsconfig.json', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'ts-app' });
      writeJson(path.join(tempDir, 'tsconfig.json'), {
        compilerOptions: { target: 'ES2022' },
      });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectLanguage()).toBe('typescript');
    });

    it('detects typescript from typescript dependency', () => {
      writeJson(path.join(tempDir, 'package.json'), {
        name: 'ts-app',
        devDependencies: { typescript: '^5.0.0' },
      });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectLanguage()).toBe('typescript');
    });

    it('detects typescript from @types dependency', () => {
      writeJson(path.join(tempDir, 'package.json'), {
        name: 'ts-app',
        devDependencies: { '@types/node': '^20.0.0' },
      });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectLanguage()).toBe('typescript');
    });

    it('detects javascript from .js files', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'js-app' });
      writeFile(path.join(tempDir, 'index.js'), 'console.log("hi");');
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectLanguage()).toBe('javascript');
    });

    it('returns unknown when no language indicators exist', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'bare-app' });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectLanguage()).toBe('unknown');
    });
  });

  describe('detectFramework', () => {
    it('detects next.js from next.config.js', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'next-app' });
      writeFile(path.join(tempDir, 'next.config.js'), 'module.exports = {}');
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectFramework()).toBe('next');
    });

    it('detects next.js from next dependency', () => {
      writeJson(path.join(tempDir, 'package.json'), {
        name: 'next-app',
        dependencies: { next: '^14.0.0' },
      });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectFramework()).toBe('next');
    });

    it('detects react from react dependency', () => {
      writeJson(path.join(tempDir, 'package.json'), {
        name: 'react-app',
        dependencies: { react: '^18.0.0' },
      });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectFramework()).toBe('react');
    });

    it('detects vue from vue dependency', () => {
      writeJson(path.join(tempDir, 'package.json'), {
        name: 'vue-app',
        dependencies: { vue: '^3.0.0' },
      });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectFramework()).toBe('vue');
    });

    it('detects vue from vue.config.js', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'vue-app' });
      writeFile(path.join(tempDir, 'vue.config.js'), 'module.exports = {}');
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectFramework()).toBe('vue');
    });

    it('returns unknown when no framework indicators exist', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'plain-app' });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectFramework()).toBe('unknown');
    });

    it('prioritizes next over react when both configs exist', () => {
      writeJson(path.join(tempDir, 'package.json'), {
        name: 'mixed-app',
        dependencies: { next: '^14.0.0', react: '^18.0.0' },
      });
      writeFile(path.join(tempDir, 'next.config.js'), 'module.exports = {}');
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectFramework()).toBe('next');
    });
  });

  describe('detectPackageManager', () => {
    it('detects pnpm from pnpm-lock.yaml', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'app' });
      writeFile(path.join(tempDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9');
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectPackageManager()).toBe('pnpm');
    });

    it('detects npm from package-lock.json', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'app' });
      writeFile(path.join(tempDir, 'package-lock.json'), '{}');
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectPackageManager()).toBe('npm');
    });

    it('detects yarn from yarn.lock', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'app' });
      writeFile(path.join(tempDir, 'yarn.lock'), '# This file is generated');
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectPackageManager()).toBe('yarn');
    });

    it('returns unknown when no lockfile exists', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'app' });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectPackageManager()).toBe('unknown');
    });
  });

  describe('detectVersions', () => {
    it('detects node version', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'app' });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      const versions = detector.detectVersions();
      expect(versions.node).toBeDefined();
      expect(versions.node).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('detects framework version from package.json', () => {
      writeJson(path.join(tempDir, 'package.json'), {
        name: 'app',
        dependencies: { react: '^18.2.0' },
      });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      const versions = detector.detectVersions();
      expect(versions.framework).toBe('^18.2.0');
    });

    it('detects typescript version from devDependencies', () => {
      writeJson(path.join(tempDir, 'package.json'), {
        name: 'app',
        devDependencies: { typescript: '^5.3.0' },
      });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      const versions = detector.detectVersions();
      expect(versions.typescript).toBe('^5.3.0');
    });
  });

  describe('detectSourceDirectories', () => {
    it('detects common source directories', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'app' });
      for (const dir of ['src', 'app', 'pages', 'lib', 'components']) {
        fs.mkdirSync(path.join(tempDir, dir), { recursive: true });
      }
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      const dirs = detector.detectSourceDirectories();
      expect(dirs).toContain('src');
      expect(dirs).toContain('app');
      expect(dirs).toContain('pages');
      expect(dirs).toContain('lib');
      expect(dirs).toContain('components');
    });

    it('returns empty array when no source directories exist', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'app' });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectSourceDirectories()).toEqual([]);
    });
  });

  describe('detectImportAliases', () => {
    it('detects import aliases from tsconfig paths', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'app' });
      writeJson(path.join(tempDir, 'tsconfig.json'), {
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@components/*': ['src/components/*'],
            '@utils/*': ['src/lib/utils/*'],
          },
        },
      });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      const aliases = detector.detectImportAliases();
      expect(aliases['@components/*']).toBe('src/components/*');
      expect(aliases['@utils/*']).toBe('src/lib/utils/*');
    });

    it('returns empty object when no tsconfig exists', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'app' });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectImportAliases()).toEqual({});
    });
  });

  describe('detectMonorepo', () => {
    it('detects pnpm monorepo from pnpm-workspace.yaml', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'root' });
      writeFile(path.join(tempDir, 'pnpm-workspace.yaml'), 'packages:\n  - "apps/*"');
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      const result = detector.detectMonorepo();
      expect(result.isMonorepo).toBe(true);
      expect(result.root).toBe(tempDir);
    });

    it('detects turbo monorepo from turbo.json', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'root' });
      writeFile(path.join(tempDir, 'turbo.json'), '{}');
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      const result = detector.detectMonorepo();
      expect(result.isMonorepo).toBe(true);
    });

    it('detects workspaces from package.json array', () => {
      writeJson(path.join(tempDir, 'package.json'), {
        name: 'root',
        workspaces: ['apps/*', 'packages/*'],
      });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      const result = detector.detectMonorepo();
      expect(result.isMonorepo).toBe(true);
      expect(result.workspaces).toEqual(['apps/*', 'packages/*']);
    });

    it('detects workspaces from package.json object', () => {
      writeJson(path.join(tempDir, 'package.json'), {
        name: 'root',
        workspaces: { packages: ['apps/*'] },
      });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      const result = detector.detectMonorepo();
      expect(result.isMonorepo).toBe(true);
      expect(result.workspaces).toEqual(['apps/*']);
    });

    it('returns not monorepo when no indicators exist', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'app' });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      const result = detector.detectMonorepo();
      expect(result.isMonorepo).toBe(false);
    });
  });

  describe('detectSimplifyConfig', () => {
    it('returns true when simplify.config.json exists', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'app' });
      writeJson(path.join(tempDir, 'simplify.config.json'), {
        schemaVersion: 1,
        installation: {
          defaultMode: 'source',
          paths: {
            ui: 'ui',
            blocks: 'blocks',
            logic: 'logic',
            integrations: 'integrations',
            hooks: 'hooks',
            styles: 'styles',
          },
        },
      });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectSimplifyConfig()).toBe(true);
    });

    it('returns false when simplify.config.json does not exist', () => {
      writeJson(path.join(tempDir, 'package.json'), { name: 'app' });
      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      expect(detector.detectSimplifyConfig()).toBe(false);
    });
  });

  describe('detectAll', () => {
    it('returns combined detection result', () => {
      writeJson(path.join(tempDir, 'package.json'), {
        name: 'next-app',
        dependencies: { next: '^14.0.0', react: '^18.0.0' },
        devDependencies: { typescript: '^5.0.0' },
      });
      writeFile(path.join(tempDir, 'next.config.js'), 'module.exports = {}');
      writeFile(path.join(tempDir, 'pnpm-lock.yaml'), '');
      fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
      writeJson(path.join(tempDir, 'tsconfig.json'), {
        compilerOptions: { paths: { '@/*': ['src/*'] } },
      });

      const detector = new ProjectDetector();
      detector.detectProjectRoot(tempDir);
      const result = detector.detectAll();

      expect(result.projectRoot).toBe(tempDir);
      expect(result.language).toBe('typescript');
      expect(result.framework).toBe('next');
      expect(result.packageManager).toBe('pnpm');
      expect(result.versions.node).toBeDefined();
      expect(result.versions.framework).toBe('^14.0.0');
      expect(result.versions.typescript).toBe('^5.0.0');
      expect(result.sourceDirectories).toContain('src');
      expect(result.importAliases['@/*']).toBe('src/*');
      expect(result.simplifyConfig).toBe(false);
    });

    it('throws DetectionError when no project root exists', () => {
      const originalCwd = process.cwd();
      process.chdir(tempDir);
      try {
        const detector = new ProjectDetector();
        expect(() => detector.detectAll()).toThrow(/No project root found/);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});
