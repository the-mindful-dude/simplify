import { access, readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import {
  validateAssetManifest as validateAssetManifestSchema,
  validateLibraryManifest as validateLibraryManifestSchema,
  type AssetManifest,
  type DependencySet,
  type LibraryManifest,
  type ValidationIssue,
  type ValidationResult,
} from '@simplify-dev/registry';

const LIBRARY_MANIFEST_CANDIDATES = ['library.json', 'simplify/library.json'];
const TEST_FILE_PATTERNS = ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx'];
const semverPattern = new RegExp(
  '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$',
);

export interface LibraryValidationIssue extends ValidationIssue {
  readonly manifest?: string;
}

export interface AssetValidationResult {
  readonly manifest: string;
  readonly valid: boolean;
  readonly asset?: AssetManifest;
  readonly issues: readonly ValidationIssue[];
}

export interface LibraryValidationResult {
  readonly valid: boolean;
  readonly library?: LibraryManifest;
  readonly assets: readonly AssetValidationResult[];
  readonly issues: readonly LibraryValidationIssue[];
}

export { type ValidationIssue, type ValidationResult };

interface ManifestFileResult<T> {
  readonly result: ValidationResult<T>;
  readonly raw: unknown;
}

function isSafeRelativePath(value: string): boolean {
  if (value.startsWith('/') || value.startsWith('\\') || /^[A-Za-z]:/.test(value)) {
    return false;
  }

  return !value.split(/[\\/]+/).includes('..');
}

function prefixIssues(issues: readonly ValidationIssue[], prefix: string): ValidationIssue[] {
  return issues.map((issue) => ({ ...issue, path: `${prefix}${issue.path}` }));
}

async function readJsonFile(filePath: string): Promise<unknown> {
  let content: string;
  try {
    content = await readFile(filePath, 'utf8');
  } catch (err) {
    const nodeError = err as NodeJS.ErrnoException;
    throw new Error(
      `Cannot read manifest "${filePath}": ${
        nodeError.code === 'ENOENT' ? 'file not found' : nodeError.message
      }`,
    );
  }

  try {
    return JSON.parse(content);
  } catch (err) {
    throw new Error(`Cannot parse manifest "${filePath}" as JSON: ${(err as Error).message}`);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function validateAssetManifestFile(
  readPath: string,
  issuePrefix: string,
): Promise<ManifestFileResult<AssetManifest>> {
  const raw = await readJsonFile(readPath);
  const result = validateAssetManifestSchema(raw);
  if (!result.valid) {
    return { result: { valid: false, issues: prefixIssues(result.issues, issuePrefix) }, raw };
  }
  if (!result.value) {
    return { result: { valid: false, issues: [] }, raw };
  }

  return { result: { valid: true, value: result.value, issues: [] }, raw };
}

export async function validateAssetManifest(
  manifestPath: string,
): Promise<ValidationResult<AssetManifest>> {
  return (await validateAssetManifestFile(manifestPath, manifestPath)).result;
}

async function validateLibraryManifestFile(
  readPath: string,
  issuePrefix: string,
): Promise<ManifestFileResult<LibraryManifest>> {
  const raw = await readJsonFile(readPath);
  const result = validateLibraryManifestSchema(raw);
  if (!result.valid) {
    return { result: { valid: false, issues: prefixIssues(result.issues, issuePrefix) }, raw };
  }
  if (!result.value) {
    return { result: { valid: false, issues: [] }, raw };
  }

  return { result: { valid: true, value: result.value, issues: [] }, raw };
}

export async function validateLibraryManifest(
  manifestPath: string,
): Promise<ValidationResult<LibraryManifest>> {
  return (await validateLibraryManifestFile(manifestPath, manifestPath)).result;
}

function dependencyVersionIssues(
  dependencies: readonly { readonly version: string }[],
  pointer: string,
): LibraryValidationIssue[] {
  const issues: LibraryValidationIssue[] = [];

  for (const [index, dependency] of dependencies.entries()) {
    if (!semverPattern.test(dependency.version)) {
      issues.push({
        path: `${pointer}/${index}/version`,
        message: `Dependency version "${dependency.version}" is not semantic versioning.`,
        keyword: 'invalidDependencyVersion',
      });
    }
  }

  return issues;
}

function packageDependencyIssues(
  dependencies: readonly {
    readonly name: string;
    readonly version: string;
    readonly kind: string;
  }[],
  pointer: string,
): LibraryValidationIssue[] {
  const issues: LibraryValidationIssue[] = [];

  for (const [index, dependency] of dependencies.entries()) {
    if (!semverPattern.test(dependency.version)) {
      issues.push({
        path: `${pointer}/${index}/version`,
        message: `Package dependency version "${dependency.version}" is not semantic versioning.`,
        keyword: 'invalidDependencyVersion',
      });
    }
  }

  return issues;
}

function validateDependencySet(
  dependencies: DependencySet | undefined,
  pointer: string,
): LibraryValidationIssue[] {
  const issues: LibraryValidationIssue[] = [];
  issues.push(...dependencyVersionIssues(dependencies?.registry ?? [], `${pointer}/registry`));
  issues.push(...packageDependencyIssues(dependencies?.packages ?? [], `${pointer}/packages`));
  return issues;
}

function versionIssue(
  pointer: string,
  version: string,
  keyword: string,
  manifest?: string,
): LibraryValidationIssue {
  return {
    path: `${pointer}/version`,
    message: `Version "${version}" is not semantic versioning.`,
    keyword,
    ...(manifest === undefined ? {} : { manifest }),
  };
}

async function verifyAssetReferencedFiles(
  assetDir: string,
  asset: AssetManifest,
  pointer: string,
): Promise<LibraryValidationIssue[]> {
  const issues: LibraryValidationIssue[] = [];

  for (const [index, implementation] of asset.implementations.entries()) {
    const implementationPointer = `${pointer}/implementations/${index}`;

    if (!isSafeRelativePath(implementation.entry)) {
      issues.push({
        path: `${implementationPointer}/entry`,
        message: 'Implementation entry must be a safe relative path within the asset.',
        keyword: 'safePath',
      });
      continue;
    }

    if (!(await fileExists(join(assetDir, implementation.entry)))) {
      issues.push({
        path: `${implementationPointer}/entry`,
        message: `Implementation entry "${implementation.entry}" does not exist.`,
        keyword: 'missingEntry',
      });
    }
  }

  for (const [modeIndex, mode] of (asset.installation?.modes ?? []).entries()) {
    const modePointer = `${pointer}/installation/modes/${modeIndex}`;

    for (const [fileIndex, file] of (mode.files ?? []).entries()) {
      const filePointer = `${modePointer}/files/${fileIndex}`;

      if (!isSafeRelativePath(file.source)) {
        issues.push({
          path: `${filePointer}/source`,
          message: 'Installation source must be a safe relative path within the project.',
          keyword: 'safePath',
        });
      } else if (!(await fileExists(join(assetDir, file.source)))) {
        issues.push({
          path: `${filePointer}/source`,
          message: `Installation source "${file.source}" does not exist.`,
          keyword: 'missingSource',
        });
      }

      if (!isSafeRelativePath(file.target)) {
        issues.push({
          path: `${filePointer}/target`,
          message: 'Installation target must be a safe relative path within the project.',
          keyword: 'safePath',
        });
      }
    }

    if (mode.dependencies) {
      issues.push(...validateDependencySet(mode.dependencies, `${modePointer}/dependencies`));
    }
  }

  if (asset.documentation) {
    const documentationPointer = `${pointer}/documentation`;

    if (asset.documentation.readme && !isSafeRelativePath(asset.documentation.readme)) {
      issues.push({
        path: `${documentationPointer}/readme`,
        message: 'README path must be a safe relative path within the asset.',
        keyword: 'safePath',
      });
    } else if (
      asset.documentation.readme &&
      !(await fileExists(join(assetDir, asset.documentation.readme)))
    ) {
      issues.push({
        path: `${documentationPointer}/readme`,
        message: `Declared README "${asset.documentation.readme}" does not exist.`,
        keyword: 'missingDocumentation',
      });
    }

    if (asset.documentation.changelog && !isSafeRelativePath(asset.documentation.changelog)) {
      issues.push({
        path: `${documentationPointer}/changelog`,
        message: 'Changelog path must be a safe relative path within the asset.',
        keyword: 'safePath',
      });
    } else if (
      asset.documentation.changelog &&
      !(await fileExists(join(assetDir, asset.documentation.changelog)))
    ) {
      issues.push({
        path: `${documentationPointer}/changelog`,
        message: `Declared changelog "${asset.documentation.changelog}" does not exist.`,
        keyword: 'missingDocumentation',
      });
    }

    for (const [index, example] of (asset.documentation.examples ?? []).entries()) {
      const examplePointer = `${documentationPointer}/examples/${index}`;

      if (!isSafeRelativePath(example)) {
        issues.push({
          path: examplePointer,
          message: 'Example path must be a safe relative path within the asset.',
          keyword: 'safePath',
        });
      } else if (!(await fileExists(join(assetDir, example)))) {
        issues.push({
          path: examplePointer,
          message: `Declared example "${example}" does not exist.`,
          keyword: 'missingDocumentation',
        });
      }
    }
  }

  const hasTestFile = await findTestFile(assetDir, asset.implementations);
  if (!hasTestFile) {
    issues.push({
      path: `${pointer}/tests`,
      message: 'No test files found for the asset.',
      keyword: 'missingTests',
    });
  }

  return issues;
}

async function findTestFile(
  assetDir: string,
  implementations: readonly { readonly entry: string }[],
): Promise<boolean> {
  const directories = new Set<string>([assetDir]);

  for (const implementation of implementations) {
    directories.add(dirname(join(assetDir, implementation.entry)));
  }

  for (const directory of directories) {
    let entries: string[];
    try {
      entries = await readdir(directory);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (TEST_FILE_PATTERNS.some((pattern) => matchPattern(entry, pattern))) {
        return true;
      }
    }
  }

  return false;
}

function matchPattern(fileName: string, pattern: string): boolean {
  const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
  return regex.test(fileName);
}

async function findLibraryManifest(root: string): Promise<string | undefined> {
  for (const candidate of LIBRARY_MANIFEST_CANDIDATES) {
    const candidatePath = join(root, candidate);
    if (await fileExists(candidatePath)) {
      return candidatePath;
    }
  }

  return undefined;
}

export async function validateLibrary(libraryRoot: string): Promise<LibraryValidationResult> {
  const root = resolve(libraryRoot);
  const issues: LibraryValidationIssue[] = [];

  const libraryManifestPath = await findLibraryManifest(root);
  if (!libraryManifestPath) {
    issues.push({
      path: '/',
      message: 'No library manifest found (expected library.json or simplify/library.json).',
      keyword: 'missingLibraryManifest',
    });

    return { valid: false, assets: [], issues };
  }

  const libraryManifestPointer = relative(root, libraryManifestPath);
  const libraryFile = await validateLibraryManifestFile(
    libraryManifestPath,
    libraryManifestPointer,
  );

  const rawLibrary = libraryFile.raw as { readonly version?: string } | undefined;
  const libraryVersion = libraryFile.result.value?.version ?? rawLibrary?.version;

  for (const issue of prefixIssues(libraryFile.result.issues, libraryManifestPointer)) {
    issues.push({ ...issue, manifest: libraryManifestPointer });
  }

  if (typeof libraryVersion === 'string' && !semverPattern.test(libraryVersion)) {
    issues.push(
      versionIssue(
        `${libraryManifestPointer}/version`,
        libraryVersion,
        'invalidLibraryVersion',
        libraryManifestPointer,
      ),
    );
  }

  if (!libraryFile.result.valid || !libraryFile.result.value) {
    return {
      valid: issues.length === 0,
      assets: [],
      issues,
    };
  }

  const library = libraryFile.result.value;

  issues.push(
    ...validateDependencySet(library.dependencies, `${libraryManifestPointer}/dependencies`),
  );

  const assets: AssetValidationResult[] = [];
  const seenAssets = new Set<string>();

  for (const [index, assetPath] of library.assets.entries()) {
    const assetPointer = `${libraryManifestPointer}/assets/${index}`;

    if (!isSafeRelativePath(assetPath)) {
      issues.push({
        path: assetPointer,
        message: 'Asset manifest paths must stay within the repository.',
        keyword: 'safePath',
        manifest: libraryManifestPointer,
      });
      continue;
    }

    if (seenAssets.has(assetPath)) {
      issues.push({
        path: assetPointer,
        message: `Asset manifest path "${assetPath}" is listed more than once.`,
        keyword: 'duplicateAsset',
        manifest: libraryManifestPointer,
      });
      continue;
    }
    seenAssets.add(assetPath);

    const fullAssetPath = join(root, assetPath);
    if (!(await fileExists(fullAssetPath))) {
      issues.push({
        path: assetPointer,
        message: `Asset manifest "${assetPath}" does not exist.`,
        keyword: 'missingAssetManifest',
        manifest: libraryManifestPointer,
      });
      continue;
    }

    const assetStat = await stat(fullAssetPath);
    if (!assetStat.isFile()) {
      issues.push({
        path: assetPointer,
        message: `Asset manifest "${assetPath}" is not a file.`,
        keyword: 'notAFile',
        manifest: libraryManifestPointer,
      });
      continue;
    }

    const assetFile = await validateAssetManifestFile(fullAssetPath, assetPath);
    const rawAsset = assetFile.raw as { readonly version?: string } | undefined;
    const assetVersion = assetFile.result.value?.version ?? rawAsset?.version;

    for (const issue of assetFile.result.issues) {
      issues.push({ ...issue, manifest: assetPath });
    }

    if (typeof assetVersion === 'string' && !semverPattern.test(assetVersion)) {
      issues.push(
        versionIssue(`${assetPointer}/version`, assetVersion, 'invalidAssetVersion', assetPath),
      );
    }

    const assetValid = assetFile.result.valid && assetFile.result.value !== undefined;

    assets.push({
      manifest: assetPath,
      valid: assetValid,
      ...(assetFile.result.value !== undefined ? { asset: assetFile.result.value } : {}),
      issues: assetFile.result.issues,
    });

    if (!assetValid) {
      continue;
    }

    const asset: AssetManifest = assetFile.result.value;
    const assetDir = dirname(fullAssetPath);

    issues.push(
      ...(await verifyAssetReferencedFiles(assetDir, asset, assetPointer)).map((issue) => ({
        ...issue,
        manifest: assetPath,
      })),
    );

    issues.push(
      ...validateDependencySet(asset.dependencies, `${assetPointer}/dependencies`).map((issue) => ({
        ...issue,
        manifest: assetPath,
      })),
    );
  }

  return {
    valid: issues.length === 0,
    library,
    assets,
    issues,
  };
}
