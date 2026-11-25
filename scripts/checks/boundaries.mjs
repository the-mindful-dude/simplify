#!/usr/bin/env node
/**
 * Report-only architecture boundary checker (I-F1.1).
 *
 * Scans repository source for import edges forbidden by ADR-007 and ADR-014:
 *   - web-module-internal:      apps/web importing a module's internal paths
 *   - core-forbidden-import:    modules/core importing React/Next/UI/fs/entities/other modules
 *   - core-jsx-source:          JSX/TSX inside framework-independent modules/core
 *   - module-cross-internal:    one module importing another module's internal paths
 *   - domain-next-import:       domain modules importing next/* (only module-app and web may)
 *   - packages-to-modules:      packages/* or apps/registry-api importing any modules/* package
 *   - app-to-domain-module:     modules/app importing any domain module (registry, dashboard,
 *                               assets, collections, compositions, publishers, settings); app
 *                               receives NavContribution[] data from the composition root instead
 *   - deep-package-import:      cross-project import into another package/module's internal/ path
 *                               or arbitrary deep src/ path where a public entry exists
 *
 * Policy: WARN ONLY. The checker prints deterministic findings and always exits 0
 * on ordinary runs; F2.4 will decide whether to promote findings to failures.
 *
 * Usage: node scripts/checks/boundaries.mjs [--self-test]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..', '..');

const SCAN_ROOTS = ['apps', 'packages', 'modules', 'schemas', 'test'];
const SKIP_DIR_NAMES = new Set([
  '.git',
  '.next',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
  'out',
]);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

/** Byte-order comparison: locale-independent so output is reproducible in CI. */
function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Collect source files in a stable order; missing roots (e.g. modules/) are fine. */
export function collectSourceFiles() {
  const collect = (absoluteDirectory, relativeDirectory) => {
    if (!fs.existsSync(absoluteDirectory)) {
      return [];
    }

    const collected = [];
    const entries = fs
      .readdirSync(absoluteDirectory, { withFileTypes: true })
      .sort((left, right) => compareStrings(left.name, right.name));

    for (const entry of entries) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        if (SKIP_DIR_NAMES.has(entry.name)) {
          continue;
        }
        collected.push(...collect(path.join(absoluteDirectory, entry.name), relativePath));
        continue;
      }

      if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        collected.push(relativePath);
      }
    }

    return collected;
  };

  return SCAN_ROOTS.flatMap((root) => collect(path.join(repoRoot, root), root)).sort(
    compareStrings,
  );
}

/** Blank out comments while preserving string literals, newlines and offsets. */
export function stripComments(source) {
  let output = '';
  let quote = null;
  let index = 0;

  while (index < source.length) {
    const character = source[index];
    const next = source[index + 1];

    if (quote !== null) {
      output += character;
      if (character === '\\' && next !== undefined) {
        output += next;
        index += 2;
        continue;
      }
      if (character === quote) {
        quote = null;
      }
      index += 1;
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      output += character;
      index += 1;
      continue;
    }

    if (character === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') {
        output += ' ';
        index += 1;
      }
      continue;
    }

    if (character === '/' && next === '*') {
      output += '  ';
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        output += source[index] === '\n' ? '\n' : ' ';
        index += 1;
      }
      if (index < source.length) {
        output += '  ';
        index += 2;
      }
      continue;
    }

    output += character;
    index += 1;
  }

  return output;
}

/** Extract import/export/require specifiers with 1-based line numbers. */
export function extractImports(source) {
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?[^;'"`]*?\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  const found = new Map();

  for (const pattern of patterns) {
    let match = pattern.exec(source);
    while (match !== null) {
      const specifier = match[1];
      const line = source.slice(0, match.index).split('\n').length;
      found.set(`${line}:${specifier}`, { line, specifier });
      match = pattern.exec(source);
    }
  }

  return [...found.values()].sort(
    (left, right) => left.line - right.line || compareStrings(left.specifier, right.specifier),
  );
}

export function sourceKind(relativePath) {
  if (relativePath.startsWith('apps/web/')) {
    return 'web';
  }
  if (relativePath.startsWith('apps/registry-api/')) {
    return 'registry-api';
  }

  const moduleMatch = /^modules\/([^/]+)\//.exec(relativePath);
  if (moduleMatch) {
    return `module:${moduleMatch[1]}`;
  }

  const packageMatch = /^packages\/([^/]+)\//.exec(relativePath);
  if (packageMatch) {
    return `package:${packageMatch[1]}`;
  }

  return relativePath.startsWith('schemas/') ? 'schemas' : 'other';
}

function resolvedRelativePath(specifier, sourcePath) {
  if (!specifier.startsWith('.')) {
    return null;
  }
  return path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), specifier));
}

function internalModuleTarget(specifier, sourcePath) {
  const qualified = /^@simplify-dev\/(module-[^/]+)\/(?:src\/)?internal(?:\/|$)/.exec(specifier);
  if (qualified) {
    return qualified[1];
  }

  const resolved = resolvedRelativePath(specifier, sourcePath);
  if (resolved) {
    const relative = /^modules\/([^/]+)\/(?:src\/)?internal(?:\/|$)/.exec(resolved);
    if (relative) {
      return `module-${relative[1]}`;
    }
  }
  return null;
}

function moduleTarget(specifier, sourcePath) {
  const qualified = /^@simplify-dev\/(module-[^/]+)(?:\/|$)/.exec(specifier);
  if (qualified) {
    return qualified[1];
  }

  const resolved = resolvedRelativePath(specifier, sourcePath);
  if (resolved) {
    const relative = /^modules\/([^/]+)(?:\/|$)/.exec(resolved);
    if (relative) {
      return `module-${relative[1]}`;
    }
  }
  return null;
}

/** Workspace project directory for a repo-relative path, or null outside the workspace. */
function projectDirectory(relativePath) {
  const match = /^(apps|packages|modules)\/([^/]+)(?:\/|$)/.exec(relativePath);
  if (match) {
    return `${match[1]}/${match[2]}`;
  }
  return relativePath === 'schemas' || relativePath.startsWith('schemas/') ? 'schemas' : null;
}

/** Published workspace name that matches the @simplify-dev/<name> specifier prefix. */
function projectName(relativePath) {
  const directory = projectDirectory(relativePath);
  if (directory === null) {
    return null;
  }
  if (directory === 'schemas') {
    return 'schemas';
  }
  const [kind, name] = directory.split('/');
  return kind === 'modules' ? `module-${name}` : name;
}

/** Deep means an internal/ segment or a src/ path past the public index entry. */
function isDeepSubpath(subpath) {
  const segments = subpath.split('/').filter(Boolean);
  if (segments.includes('internal')) {
    return true;
  }
  if (segments[0] !== 'src') {
    return false;
  }
  const remainder = segments.slice(1);
  return !(remainder.length === 1 && /^index(?:\.[cm]?[jt]sx?)?$/.test(remainder[0]));
}

/** Target of a qualified cross-project deep import; null for own or public entry imports. */
function qualifiedDeepTarget(specifier, sourcePath) {
  const match = /^@simplify-dev\/([^/]+)(?:\/(.+))?$/.exec(specifier);
  if (match === null || match[2] === undefined) {
    return null;
  }
  const [, name, subpath] = match;
  if (name === projectName(sourcePath) || !isDeepSubpath(subpath)) {
    return null;
  }
  return name;
}

/** Target of a relative cross-project deep import; null for local or public entry imports. */
function relativeDeepTarget(specifier, sourcePath) {
  const resolved = resolvedRelativePath(specifier, sourcePath);
  if (resolved === null) {
    return null;
  }
  const sourceProject = projectDirectory(sourcePath);
  const targetProject = projectDirectory(resolved);
  if (sourceProject === null || targetProject === null || sourceProject === targetProject) {
    return null;
  }
  const subpath = resolved.slice(targetProject.length).replace(/^\//, '');
  return isDeepSubpath(subpath) ? targetProject : null;
}

/** Evaluate a single import edge. Pure so it can be self-tested without fixtures. */
export function evaluateImport({ sourcePath, specifier }) {
  const kind = sourceKind(sourcePath);
  const warnings = [];
  const add = (rule, message) => warnings.push({ rule, message });
  const internalModule = internalModuleTarget(specifier, sourcePath);
  const targetModule = moduleTarget(specifier, sourcePath);

  if (kind === 'web' && internalModule) {
    add(
      'web-module-internal',
      `apps/web must use the public entry of @simplify-dev/${internalModule}, not its internal paths.`,
    );
  }

  if (kind === 'module:core') {
    const forbidden =
      /^(?:react|react-dom)(?:\/|$)/.test(specifier) ||
      /^next(?:\/|$)/.test(specifier) ||
      specifier === '@simplify-dev/ui' ||
      specifier === 'node:fs' ||
      /(?:^|\/)entities(?:\/|$)/.test(specifier) ||
      (targetModule !== null && targetModule !== 'module-core');

    if (forbidden) {
      add(
        'core-forbidden-import',
        'modules/core must stay framework-independent: no React/Next/UI, filesystem, domain entities or other modules.',
      );
    }
  }

  if (kind.startsWith('module:')) {
    const ownModule = `module-${kind.slice('module:'.length)}`;
    if (internalModule && internalModule !== ownModule) {
      add(
        'module-cross-internal',
        `a module must not import @simplify-dev/${internalModule} internal paths; use its public entry.`,
      );
    }
    if (
      ownModule !== 'module-app' &&
      ownModule !== 'module-core' &&
      /^next(?:\/|$)/.test(specifier)
    ) {
      add('domain-next-import', 'only module-app and apps/web may import next/*.');
    }
  }

  if ((kind.startsWith('package:') || kind === 'registry-api') && targetModule) {
    add(
      'packages-to-modules',
      `published packages and apps/registry-api must not depend on @simplify-dev/${targetModule}.`,
    );
  }

  if (
    kind === 'module:app' &&
    targetModule !== null &&
    targetModule !== 'module-app' &&
    targetModule !== 'module-core'
  ) {
    add(
      'app-to-domain-module',
      `modules/app must not depend on @simplify-dev/${targetModule}; domain contributions are passed as data from the composition root.`,
    );
  }

  const deepTarget =
    qualifiedDeepTarget(specifier, sourcePath) ?? relativeDeepTarget(specifier, sourcePath);
  if (deepTarget !== null) {
    add(
      'deep-package-import',
      `use the public entry of ${deepTarget}; internal/ and deep src/ paths are not cross-project imports.`,
    );
  }

  return warnings;
}

export function evaluateFile({ sourcePath, text }) {
  const warnings = [];

  if (sourceKind(sourcePath) === 'module:core' && sourcePath.endsWith('.tsx')) {
    warnings.push({
      rule: 'core-jsx-source',
      line: 1,
      specifier: sourcePath,
      message: 'modules/core must contain framework-independent TypeScript, not JSX.',
    });
  }

  for (const { line, specifier } of extractImports(stripComments(text))) {
    for (const warning of evaluateImport({ sourcePath, specifier })) {
      warnings.push({ ...warning, line, specifier });
    }
  }

  return warnings;
}

function formatWarnings(warnings) {
  return warnings.map(
    (warning) =>
      `[WARN] ${warning.rule} — ${warning.sourcePath}:${warning.line} -> ${warning.specifier} (${warning.message})`,
  );
}

function runCheck() {
  const files = collectSourceFiles();
  const warnings = [];

  for (const sourcePath of files) {
    const text = fs.readFileSync(path.join(repoRoot, sourcePath), 'utf8');
    for (const warning of evaluateFile({ sourcePath, text })) {
      warnings.push({ ...warning, sourcePath });
    }
  }

  warnings.sort(
    (left, right) =>
      compareStrings(left.rule, right.rule) ||
      compareStrings(left.sourcePath, right.sourcePath) ||
      left.line - right.line ||
      compareStrings(left.specifier, right.specifier),
  );

  process.stdout.write('architecture-boundary-check (report-only)\n');
  process.stdout.write(`scanned: ${files.length} source files across ${SCAN_ROOTS.join(', ')}\n`);
  for (const line of formatWarnings(warnings)) {
    process.stdout.write(`${line}\n`);
  }
  process.stdout.write(`summary: ${warnings.length} forbidden edge warning(s)\n`);
  process.stdout.write('result: PASS (report-only; exit 0)\n');
  process.exitCode = 0;
}

function runSelfTest() {
  const cases = [
    {
      expect: 'web-module-internal',
      sourcePath: 'apps/web/app/page.tsx',
      specifier: '@simplify-dev/module-core/internal/thing',
    },
    {
      expect: 'core-forbidden-import',
      sourcePath: 'modules/core/src/contracts.ts',
      specifier: 'react',
    },
    {
      expect: 'core-forbidden-import',
      sourcePath: 'modules/core/src/contracts.ts',
      specifier: 'next/link',
    },
    {
      expect: 'core-forbidden-import',
      sourcePath: 'modules/core/src/contracts.ts',
      specifier: '@simplify-dev/module-registry',
    },
    {
      expect: 'core-forbidden-import',
      sourcePath: 'modules/core/src/contracts.ts',
      specifier: '../domain/entities/user',
    },
    {
      expect: 'module-cross-internal',
      sourcePath: 'modules/registry/src/hooks/use-registry.ts',
      specifier: '../../../core/src/internal/types',
    },
    {
      expect: 'domain-next-import',
      sourcePath: 'modules/registry/src/hooks/use-registry.ts',
      specifier: 'next/navigation',
    },
    {
      expect: 'packages-to-modules',
      sourcePath: 'packages/ui/src/index.ts',
      specifier: '@simplify-dev/module-core',
    },
    {
      expect: 'packages-to-modules',
      sourcePath: 'apps/registry-api/src/app.ts',
      specifier: '@simplify-dev/module-registry',
    },
    { expect: null, sourcePath: 'apps/web/app/page.tsx', specifier: '@simplify-dev/ui' },
    { expect: null, sourcePath: 'modules/core/src/contracts.ts', specifier: './types' },

    // app-to-domain-module: positive (qualified and relative) and negative boundaries.
    {
      expect: 'app-to-domain-module',
      sourcePath: 'modules/app/src/shell.ts',
      specifier: '@simplify-dev/module-registry',
    },
    {
      expect: 'app-to-domain-module',
      sourcePath: 'modules/app/src/shell.ts',
      specifier: '../../registry/src/index',
    },
    {
      expect: null,
      sourcePath: 'modules/app/src/shell.ts',
      specifier: '@simplify-dev/module-core',
    },
    { expect: null, sourcePath: 'modules/app/src/shell.ts', specifier: '@simplify-dev/ui' },
    { expect: null, sourcePath: 'modules/app/src/shell.ts', specifier: './nav-config' },

    // deep-package-import: positive (qualified/relative, internal/ and src/) and negatives.
    {
      expect: 'deep-package-import',
      sourcePath: 'packages/cli/src/index.ts',
      specifier: '@simplify-dev/ui/internal/button',
    },
    {
      expect: 'deep-package-import',
      sourcePath: 'apps/web/app/page.tsx',
      specifier: '../../../packages/ui/src/button/button',
    },
    {
      expect: 'deep-package-import',
      sourcePath: 'modules/registry/src/hooks/use-registry.ts',
      specifier: '@simplify-dev/module-core/internal/types',
    },
    {
      expect: 'deep-package-import',
      sourcePath: 'packages/cli/src/index.ts',
      specifier: '../../ui/src/commands/build',
    },
    { expect: null, sourcePath: 'apps/web/app/page.tsx', specifier: '@simplify-dev/cli/cli' },
    {
      expect: null,
      sourcePath: 'apps/web/app/page.tsx',
      specifier: '@simplify-dev/module-registry/server',
    },
    {
      expect: null,
      sourcePath: 'modules/registry/src/hooks/use-registry.ts',
      specifier: '@simplify-dev/module-registry/server',
    },
    { expect: null, sourcePath: 'packages/cli/src/index.ts', specifier: '../../ui/src/index.js' },
    { expect: null, sourcePath: 'packages/cli/src/commands/build.ts', specifier: './utils' },
    {
      expect: null,
      sourcePath: 'test/workspace.test.ts',
      specifier: '../packages/ui/src/index.js',
    },
  ];

  let failures = 0;
  for (const testCase of cases) {
    const rules = evaluateImport(testCase).map((warning) => warning.rule);
    const passed = testCase.expect === null ? rules.length === 0 : rules.includes(testCase.expect);
    if (!passed) {
      failures += 1;
    }
    process.stdout.write(
      `${passed ? 'PASS' : 'FAIL'} ${testCase.sourcePath} -> ${testCase.specifier} (expected ${testCase.expect ?? 'no warning'}, got ${rules.join(', ') || 'none'})\n`,
    );
  }

  const jsxWarning = evaluateFile({
    sourcePath: 'modules/core/src/component.tsx',
    text: "import type { ReactNode } from 'react';\nexport const View = (props: { children: ReactNode }) => <div>{props.children}</div>;\n",
  }).some((warning) => warning.rule === 'core-jsx-source');
  process.stdout.write(`${jsxWarning ? 'PASS' : 'FAIL'} modules/core TSX source is reported\n`);
  if (!jsxWarning) {
    failures += 1;
  }

  process.stdout.write(`self-test: ${cases.length + 1} cases, ${failures} failure(s)\n`);
  process.exitCode = failures === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  if (process.argv.includes('--self-test')) {
    runSelfTest();
  } else {
    runCheck();
  }
}
