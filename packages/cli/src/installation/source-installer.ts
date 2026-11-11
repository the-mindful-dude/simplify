import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { RegistryClient } from '@simplify-dev/registry';
import type { ProjectConfiguration } from '@simplify-dev/schemas';
import { CONFIG_FILE_NAME, getInstallationPaths, loadConfig } from './config.js';
import { isSafePath, validateTargetPath } from './path-safety.js';
import { rollback, safeWrite, SafeWriteError, type BackupRecord } from './safe-write.js';
import type { FileChange } from './types.js';

export type SourceConflictPolicy = 'reject' | 'skip' | 'replace';

export type SourceInstallerErrorCode =
  | 'SOURCE_NOT_FOUND'
  | 'TARGET_EXISTS'
  | 'PERMISSION_DENIED'
  | 'WRITE_FAILED'
  | 'UNSAFE_PATH'
  | 'ALIAS_RESOLUTION_FAILED';

export class SourceInstallerError extends Error {
  readonly code: SourceInstallerErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: SourceInstallerErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = 'SourceInstallerError';
    this.code = code;
    this.details = details ?? {};
  }
}

export interface SourceInstallerOptions {
  readonly assetId: string;
  readonly version: string;
  readonly files: readonly FileChange[];
  readonly conflictPolicy?: SourceConflictPolicy;
  readonly cwd?: string;
  readonly dryRun?: boolean;
  readonly verbose?: boolean;
  /** Optional per-asset versions, used for dependency file mappings. */
  readonly versions?: Readonly<Record<string, string>>;
  /** Injected for tests; otherwise a client is constructed from registryRoot. */
  readonly client?: RegistryClient;
  readonly registryRoot?: string;
}

export interface SourceInstallResult {
  /** Total number of files written, including replacements. */
  readonly filesWritten: number;
  readonly filesSkipped: number;
  readonly filesReplaced: number;
  readonly filesFailed: number;
  readonly warnings?: readonly string[];
  /** Targets that would be written during a dry run. */
  readonly filesPlanned?: readonly string[];
}

export interface SourceInstallerDefaults {
  readonly cwd?: string;
  readonly dryRun?: boolean;
  readonly verbose?: boolean;
  readonly conflictPolicy?: SourceConflictPolicy;
  readonly client?: RegistryClient;
  readonly registryRoot?: string;
}

interface TsconfigInfo {
  readonly filePath: string;
  readonly baseDir: string;
  readonly paths: Readonly<Record<string, readonly string[]>>;
}

interface AliasContext {
  readonly cwd: string;
  readonly config: ProjectConfiguration | null;
  readonly configuredPaths: Readonly<Record<string, string>> | null;
  readonly configuredPrefix: string | undefined;
  readonly preferredAlias: string | undefined;
  readonly tsconfig: TsconfigInfo | null;
}

type FileAction = 'write' | 'replace' | 'skip';

interface FileOperation {
  readonly change: FileChange;
  readonly target: string;
  readonly action: FileAction;
  content?: Uint8Array;
}

interface SourceInstallFileRecord {
  readonly source: string;
  readonly target: string;
  readonly assetId: string;
  readonly version: string;
  readonly status: 'written' | 'replaced' | 'skipped';
}

interface SourceInstallationEntry {
  readonly assetId: string;
  readonly version: string;
  readonly installedAt: string;
  readonly files: readonly SourceInstallFileRecord[];
}

const SIMPLIFY_DIR = '.simplify';
const SOURCE_INSTALLATIONS_FILE = 'source-installations.json';

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.vue',
  '.svelte',
  '.astro',
]);

function getErrorCode(error: unknown): string | undefined {
  if (error !== null && typeof error === 'object' && 'code' in error) {
    const code = (error as { readonly code?: unknown }).code;
    if (typeof code === 'string') {
      return code;
    }
  }
  return undefined;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function unsafePath(
  message: string,
  details?: Readonly<Record<string, unknown>>,
): SourceInstallerError {
  return new SourceInstallerError('UNSAFE_PATH', message, details);
}

function stripJsonComments(input: string): string {
  let output = '';
  let inString = false;
  let quote = '';
  let escaped = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]!;
    const next = input[index + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      output += char;
      continue;
    }

    if (char === '/' && next === '/') {
      while (index < input.length && input[index] !== '\n') {
        index += 1;
      }
      if (index < input.length) {
        output += '\n';
      }
      continue;
    }

    if (char === '/' && next === '*') {
      index += 2;
      while (index < input.length && !(input[index] === '*' && input[index + 1] === '/')) {
        index += 1;
      }
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function parseJsonc(raw: string): unknown {
  const withoutBom = raw.replace(/^\uFEFF/, '');
  const withoutComments = stripJsonComments(withoutBom);
  const withoutTrailingCommas = withoutComments.replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(withoutTrailingCommas);
}

function readJsonc(filePath: string): unknown {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new SourceInstallerError(
      'ALIAS_RESOLUTION_FAILED',
      `Failed to read TypeScript configuration "${filePath}": ${getErrorMessage(error)}`,
      { filePath },
    );
  }

  try {
    return parseJsonc(raw);
  } catch (error) {
    throw new SourceInstallerError(
      'ALIAS_RESOLUTION_FAILED',
      `Failed to parse TypeScript configuration "${filePath}": ${getErrorMessage(error)}`,
      { filePath },
    );
  }
}

function resolveExtendsPath(specifier: string, fromDirectory: string): string {
  const base = resolve(fromDirectory, specifier);
  const candidates = [base, `${base}.json`, join(base, 'tsconfig.json')];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return base;
}

function loadTsconfig(filePath: string, warnings: string[], seen: Set<string>): TsconfigInfo {
  const absolutePath = resolve(filePath);
  if (seen.has(absolutePath)) {
    throw new SourceInstallerError(
      'ALIAS_RESOLUTION_FAILED',
      `Circular "extends" chain detected in TypeScript configuration "${absolutePath}".`,
      { filePath: absolutePath },
    );
  }
  seen.add(absolutePath);

  const parsed = readJsonc(absolutePath);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SourceInstallerError(
      'ALIAS_RESOLUTION_FAILED',
      `Invalid TypeScript configuration "${absolutePath}": expected a JSON object.`,
      { filePath: absolutePath },
    );
  }

  const record = parsed as Record<string, unknown>;
  const compilerOptions =
    record.compilerOptions !== null &&
    typeof record.compilerOptions === 'object' &&
    !Array.isArray(record.compilerOptions)
      ? (record.compilerOptions as Record<string, unknown>)
      : {};

  const paths: Record<string, readonly string[]> = {};
  let baseUrl: string | undefined;

  const extendsValue = record.extends;
  const extendsList =
    typeof extendsValue === 'string'
      ? [extendsValue]
      : Array.isArray(extendsValue)
        ? extendsValue.filter((value): value is string => typeof value === 'string')
        : [];

  for (const extended of extendsList) {
    const extendedPath = resolveExtendsPath(extended, dirname(absolutePath));
    if (!existsSync(extendedPath)) {
      warnings.push(
        `TypeScript configuration "${absolutePath}" extends missing file "${extended}"; skipping it.`,
      );
      continue;
    }
    const parent = loadTsconfig(extendedPath, warnings, seen);
    Object.assign(paths, parent.paths);
    if (parent.baseDir !== dirname(absolutePath)) {
      baseUrl = parent.baseDir;
    }
  }

  const rawPaths = compilerOptions.paths;
  if (rawPaths !== undefined) {
    if (rawPaths === null || typeof rawPaths !== 'object' || Array.isArray(rawPaths)) {
      throw new SourceInstallerError(
        'ALIAS_RESOLUTION_FAILED',
        `Invalid "compilerOptions.paths" in TypeScript configuration "${absolutePath}".`,
        { filePath: absolutePath },
      );
    }
    for (const [alias, targets] of Object.entries(rawPaths as Record<string, unknown>)) {
      if (!Array.isArray(targets) || targets.some((t) => typeof t !== 'string')) {
        throw new SourceInstallerError(
          'ALIAS_RESOLUTION_FAILED',
          `Invalid path mapping for alias "${alias}" in TypeScript configuration "${absolutePath}".`,
          { filePath: absolutePath, alias },
        );
      }
      paths[alias] = targets as string[];
    }
  }

  const rawBaseUrl = compilerOptions.baseUrl;
  if (rawBaseUrl !== undefined) {
    if (typeof rawBaseUrl !== 'string') {
      throw new SourceInstallerError(
        'ALIAS_RESOLUTION_FAILED',
        `Invalid "compilerOptions.baseUrl" in TypeScript configuration "${absolutePath}".`,
        { filePath: absolutePath },
      );
    }
    baseUrl = resolve(dirname(absolutePath), rawBaseUrl);
  }

  return {
    filePath: absolutePath,
    baseDir: baseUrl ?? dirname(absolutePath),
    paths,
  };
}

function discoverTsconfig(cwd: string, warnings: string[]): TsconfigInfo | null {
  for (const fileName of ['tsconfig.json', 'jsconfig.json']) {
    const filePath = join(cwd, fileName);
    if (existsSync(filePath)) {
      return loadTsconfig(filePath, warnings, new Set<string>());
    }
  }
  return null;
}

function toConfiguredPaths(config: ProjectConfiguration): Readonly<Record<string, string>> {
  return { ...getInstallationPaths(config) };
}

function deriveAliasPrefix(values: readonly string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (typeof value !== 'string' || value.length === 0) {
      continue;
    }
    if (value.startsWith('.') || isAbsolute(value) || /^[A-Za-z]:/.test(value)) {
      continue;
    }
    if (!/^[@~#$]/.test(value)) {
      continue;
    }
    const slash = value.indexOf('/');
    if (slash <= 0) {
      continue;
    }
    const prefix = value.slice(0, slash + 1);
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
  }

  let best: string | undefined;
  let bestCount = 0;
  for (const [prefix, count] of counts) {
    if (count > bestCount) {
      best = prefix;
      bestCount = count;
    }
  }
  return best;
}

function choosePreferredAlias(
  tsconfig: TsconfigInfo | null,
  configuredPrefix: string | undefined,
): string | undefined {
  if (tsconfig === null) {
    return undefined;
  }

  const prefixes: string[] = [];
  for (const pattern of Object.keys(tsconfig.paths)) {
    const star = pattern.indexOf('*');
    if (star < 0) {
      continue;
    }
    const prefix = pattern.slice(0, star);
    if (prefix.length === 0 || prefix.startsWith('.') || isAbsolute(prefix)) {
      continue;
    }
    prefixes.push(prefix);
  }

  if (configuredPrefix !== undefined && prefixes.includes(configuredPrefix)) {
    return configuredPrefix;
  }

  return prefixes[0];
}

function createAliasContext(cwd: string, warnings: string[]): AliasContext {
  let config: ProjectConfiguration | null = null;
  if (existsSync(join(cwd, CONFIG_FILE_NAME))) {
    try {
      config = loadConfig(cwd);
    } catch (error) {
      warnings.push(
        `Could not load ${CONFIG_FILE_NAME}; continuing without configured install paths: ${getErrorMessage(error)}`,
      );
    }
  }

  const configuredPaths = config === null ? null : toConfiguredPaths(config);
  const configuredPrefix =
    configuredPaths === null ? undefined : deriveAliasPrefix(Object.values(configuredPaths));
  const tsconfig = discoverTsconfig(cwd, warnings);

  return {
    cwd,
    config,
    configuredPaths,
    configuredPrefix,
    preferredAlias: choosePreferredAlias(tsconfig, configuredPrefix),
    tsconfig,
  };
}

function normalizeAliasPrefix(value: string, context: AliasContext): string {
  if (
    context.configuredPrefix !== undefined &&
    context.preferredAlias !== undefined &&
    context.configuredPrefix !== context.preferredAlias &&
    value.startsWith(context.configuredPrefix)
  ) {
    return context.preferredAlias + value.slice(context.configuredPrefix.length);
  }
  return value;
}

function matchTsconfigAlias(value: string, context: AliasContext): string | undefined {
  if (context.tsconfig === null) {
    return undefined;
  }

  const entries = Object.entries(context.tsconfig.paths).sort((a, b) => b[0].length - a[0].length);

  for (const [pattern, targets] of entries) {
    let wildcard: string | undefined;
    const star = pattern.indexOf('*');
    if (star >= 0) {
      const prefix = pattern.slice(0, star);
      const suffix = pattern.slice(star + 1);
      if (
        value.length < prefix.length + suffix.length ||
        !value.startsWith(prefix) ||
        !value.endsWith(suffix)
      ) {
        continue;
      }
      wildcard = value.slice(prefix.length, value.length - suffix.length);
    } else if (value !== pattern) {
      continue;
    }

    for (const target of targets) {
      const candidate = wildcard === undefined ? target : target.replace('*', wildcard);
      const absolute = resolve(context.tsconfig.baseDir, candidate);
      const relativePath = relative(context.cwd, absolute);
      if (
        relativePath.length === 0 ||
        relativePath === '..' ||
        relativePath.startsWith(`..${'/'}`) ||
        relativePath.startsWith(`..${'\\'}`) ||
        isAbsolute(relativePath)
      ) {
        throw unsafePath(`Alias "${pattern}" resolves outside the project root: "${value}".`, {
          value,
          pattern,
          resolved: absolute,
        });
      }
      return relativePath;
    }
  }

  return undefined;
}

function stripAliasPrefix(value: string, context: AliasContext): string {
  const prefix = context.configuredPrefix;
  if (prefix !== undefined && value.startsWith(prefix)) {
    return value.slice(prefix.length);
  }

  const generic = /^([@~#$][^/\\]*[\\/])/.exec(value);
  if (generic !== null) {
    return value.slice(generic[1]!.length);
  }
  return value;
}

function resolveAliasPath(value: string, context: AliasContext): string {
  const normalized = normalizeAliasPrefix(value, context);
  const fromTsconfig = matchTsconfigAlias(normalized, context);
  if (fromTsconfig !== undefined) {
    return fromTsconfig;
  }
  return stripAliasPrefix(normalized, context);
}

function joinRelative(base: string, child: string): string {
  const normalizedBase = base.replace(/[\\/]+$/, '');
  const normalizedChild = child.replace(/^[\\/]+/, '');
  if (normalizedBase.length === 0) {
    return normalizedChild;
  }
  if (normalizedChild.length === 0) {
    return normalizedBase;
  }
  return `${normalizedBase}/${normalizedChild}`;
}

function mapTargetPath(rawTarget: string, assetId: string, context: AliasContext): string {
  if (!isSafePath(rawTarget)) {
    throw unsafePath(
      `Unsafe target path: "${rawTarget}". Paths must be relative and stay within the project root.`,
      { target: rawTarget },
    );
  }

  let target = rawTarget;
  const targetNormalized = target.replace(/\\/g, '/');
  const category = assetId.split('/')[0] ?? '';
  const configuredPaths = context.configuredPaths;

  if (configuredPaths !== null) {
    const entries = Object.entries(configuredPaths).sort((a, b) => b[1].length - a[1].length);

    let mapped = false;
    for (const [, configured] of entries) {
      if (typeof configured !== 'string' || configured.length === 0) {
        continue;
      }
      const configuredNormalized = configured.replace(/\\/g, '/').replace(/\/+$/, '');

      if (
        targetNormalized === configuredNormalized ||
        targetNormalized.startsWith(`${configuredNormalized}/`)
      ) {
        mapped = true;
        break;
      }

      let suffix = configuredNormalized;
      if (context.configuredPrefix !== undefined && suffix.startsWith(context.configuredPrefix)) {
        suffix = suffix.slice(context.configuredPrefix.length);
      }
      if (
        suffix.length > 0 &&
        (targetNormalized === suffix || targetNormalized.startsWith(`${suffix}/`))
      ) {
        const resolvedDirectory = resolveAliasPath(configured, context);
        const rest = targetNormalized.slice(suffix.length).replace(/^\/+/, '');
        target = joinRelative(resolvedDirectory, rest);
        mapped = true;
        break;
      }
    }

    if (!mapped && category.length > 0) {
      const configured = configuredPaths[category];
      if (configured !== undefined) {
        const categoryPrefix = `${category}/`;
        if (targetNormalized.startsWith(categoryPrefix)) {
          target = joinRelative(configured, targetNormalized.slice(categoryPrefix.length));
        } else if (!targetNormalized.includes('/')) {
          target = joinRelative(configured, targetNormalized);
        }
      }
    }
  }

  target = resolveAliasPath(target, context);

  if (!isSafePath(target) || !validateTargetPath(target, context.cwd)) {
    throw unsafePath(
      `Unsafe target path: "${rawTarget}". Resolved path "${target}" escapes the project root.`,
      { target: rawTarget, resolved: target },
    );
  }

  return target;
}

function matchesProjectAlias(value: string, context: AliasContext): boolean {
  if (context.tsconfig === null) {
    return false;
  }
  return Object.keys(context.tsconfig.paths).some((pattern) => {
    const star = pattern.indexOf('*');
    if (star < 0) {
      return value === pattern;
    }
    const prefix = pattern.slice(0, star);
    const suffix = pattern.slice(star + 1);
    return (
      value.length >= prefix.length + suffix.length &&
      value.startsWith(prefix) &&
      value.endsWith(suffix)
    );
  });
}

function rewriteSpecifier(specifier: string, context: AliasContext): string {
  let result = specifier;

  const registryAliases = context.config?.registry?.aliases;
  if (registryAliases !== undefined) {
    const keys = Object.keys(registryAliases).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      const replacement = registryAliases[key];
      if (typeof replacement !== 'string') {
        continue;
      }
      if (result === key) {
        result = replacement;
        break;
      }
      const prefix = key.endsWith('/') ? key : `${key}/`;
      if (result.startsWith(prefix)) {
        result = replacement.replace(/\/+$/, '') + '/' + result.slice(prefix.length);
        break;
      }
    }
  }

  if (matchesProjectAlias(result, context)) {
    return result;
  }

  return normalizeAliasPrefix(result, context);
}

function rewriteImports(
  content: Uint8Array,
  sourcePath: string,
  context: AliasContext,
): Uint8Array {
  const extension = extname(sourcePath).toLowerCase();
  if (!TEXT_EXTENSIONS.has(extension)) {
    return content;
  }

  const text = Buffer.from(content.buffer, content.byteOffset, content.byteLength).toString('utf8');

  const patterns = [
    /(\bfrom\s*)(["'])([^"'\r\n]+)\2/g,
    /(\bimport\s*\(\s*)(["'])([^"'\r\n]+)\2/g,
    /(\brequire\s*\(\s*)(["'])([^"'\r\n]+)\2/g,
    /(\bimport\s+)(["'])([^"'\r\n]+)\2/g,
  ];

  let rewritten = text;
  for (const pattern of patterns) {
    rewritten = rewritten.replace(
      pattern,
      (match, prefix: string, quote: string, specifier: string) => {
        const next = rewriteSpecifier(specifier, context);
        if (next === specifier) {
          return match;
        }
        return `${prefix}${quote}${next}${quote}`;
      },
    );
  }

  if (rewritten === text) {
    return content;
  }

  return new Uint8Array(Buffer.from(rewritten, 'utf8'));
}

function toSourceNotFoundError(
  error: unknown,
  source: string,
  assetId: string,
  version: string,
): SourceInstallerError {
  const code = getErrorCode(error);
  if (code === 'INVALID_SOURCE_PATH') {
    return unsafePath(
      `Unsafe source path: "${source}". Paths must be relative and stay within the registry asset directory.`,
      { source, assetId, version },
    );
  }

  return new SourceInstallerError(
    'SOURCE_NOT_FOUND',
    `Source file "${source}" for asset "${assetId}@${version}" could not be read from the registry: ${getErrorMessage(error)}`,
    { source, assetId, version, causeCode: code },
  );
}

function toWriteError(error: unknown, target: string, source: string): SourceInstallerError {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  const isPermissionError =
    code === 'EACCES' || code === 'EPERM' || /EACCES|EPERM|permission denied/i.test(message);

  if (error instanceof SafeWriteError) {
    if (error.code === 'UNSAFE_PATH') {
      return unsafePath(error.message, { ...error.details, target, source });
    }
    if (isPermissionError) {
      return new SourceInstallerError(
        'PERMISSION_DENIED',
        `Permission denied while writing "${target}": ${message}`,
        { target, source, ...error.details },
      );
    }
    return new SourceInstallerError('WRITE_FAILED', `Failed to write "${target}": ${message}`, {
      target,
      source,
      ...error.details,
    });
  }

  if (isPermissionError) {
    return new SourceInstallerError(
      'PERMISSION_DENIED',
      `Permission denied while writing "${target}": ${message}`,
      { target, source, causeCode: code },
    );
  }

  return new SourceInstallerError('WRITE_FAILED', `Failed to write "${target}": ${message}`, {
    target,
    source,
    causeCode: code,
  });
}

function readInstallationEntries(cwd: string, warnings: string[]): SourceInstallationEntry[] {
  const filePath = join(cwd, SIMPLIFY_DIR, SOURCE_INSTALLATIONS_FILE);
  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!Array.isArray(parsed)) {
      warnings.push(
        `Ignoring malformed source installation metadata "${filePath}": expected an array.`,
      );
      return [];
    }
    return parsed.filter(
      (entry): entry is SourceInstallationEntry =>
        entry !== null &&
        typeof entry === 'object' &&
        'assetId' in entry &&
        typeof (entry as { readonly assetId?: unknown }).assetId === 'string',
    );
  } catch (error) {
    warnings.push(
      `Ignoring unreadable source installation metadata "${filePath}": ${getErrorMessage(error)}`,
    );
    return [];
  }
}

async function recordSourceInstallation(
  cwd: string,
  records: readonly SourceInstallFileRecord[],
  warnings: string[],
): Promise<BackupRecord | undefined> {
  if (records.length === 0) {
    return undefined;
  }

  const groups = new Map<string, SourceInstallFileRecord[]>();
  for (const record of records) {
    const group = groups.get(record.assetId);
    if (group === undefined) {
      groups.set(record.assetId, [record]);
    } else {
      group.push(record);
    }
  }

  const entries = readInstallationEntries(cwd, warnings);
  const installedAt = new Date().toISOString();

  for (const [assetId, files] of groups) {
    const entry: SourceInstallationEntry = {
      assetId,
      version: files[0]?.version ?? 'unknown',
      installedAt,
      files,
    };
    const index = entries.findIndex((existing) => existing.assetId === assetId);
    if (index >= 0) {
      entries[index] = entry;
    } else {
      entries.push(entry);
    }
  }

  const metadataPath = join(SIMPLIFY_DIR, SOURCE_INSTALLATIONS_FILE);
  const absolutePath = resolve(cwd, metadataPath);
  const existed = existsSync(absolutePath);
  const result = await safeWrite({
    targetPath: metadataPath,
    content: `${JSON.stringify(entries, null, 2)}\n`,
    backup: existed,
    cwd,
  });

  if (result.backupPath !== undefined) {
    return {
      originalPath: absolutePath,
      backupPath: result.backupPath,
      timestamp: installedAt,
    };
  }
  return undefined;
}

async function cleanupFailedInstallation(
  createdTargets: readonly string[],
  backups: readonly BackupRecord[],
): Promise<string[]> {
  const errors: string[] = [];

  for (let index = createdTargets.length - 1; index >= 0; index -= 1) {
    const target = createdTargets[index]!;
    try {
      if (existsSync(target)) {
        unlinkSync(target);
      }
    } catch (error) {
      errors.push(`Failed to remove "${target}": ${getErrorMessage(error)}`);
    }
  }

  if (backups.length > 0) {
    try {
      await rollback([...backups]);
    } catch (error) {
      errors.push(`Failed to restore backups: ${getErrorMessage(error)}`);
    }
  }

  return errors;
}

export class SourceInstaller {
  private readonly defaultCwd: string;
  private readonly defaultDryRun: boolean;
  private readonly defaultVerbose: boolean;
  private readonly defaultConflictPolicy: SourceConflictPolicy;
  private readonly defaultClient: RegistryClient | undefined;
  private readonly defaultRegistryRoot: string | undefined;

  constructor(options: SourceInstallerDefaults = {}) {
    this.defaultCwd = options.cwd ?? process.cwd();
    this.defaultDryRun = options.dryRun ?? false;
    this.defaultVerbose = options.verbose ?? false;
    this.defaultConflictPolicy = options.conflictPolicy ?? 'reject';
    this.defaultClient = options.client;
    this.defaultRegistryRoot = options.registryRoot;
  }

  async install(options: SourceInstallerOptions): Promise<SourceInstallResult> {
    const cwd = options.cwd ?? this.defaultCwd;
    const dryRun = options.dryRun ?? this.defaultDryRun;
    const verbose = options.verbose ?? this.defaultVerbose;
    const conflictPolicy = options.conflictPolicy ?? this.defaultConflictPolicy;
    const warnings: string[] = [];

    const registryRoot = options.registryRoot ?? this.defaultRegistryRoot;
    const client =
      options.client ??
      this.defaultClient ??
      new RegistryClient(registryRoot !== undefined ? { registryRoot } : {});

    const aliasContext = createAliasContext(cwd, warnings);
    const operations: FileOperation[] = [];
    const seenTargets = new Set<string>();

    for (const change of options.files) {
      if (!isSafePath(change.source)) {
        throw unsafePath(
          `Unsafe source path: "${change.source}". Paths must be relative and stay within the registry asset directory.`,
          { source: change.source, assetId: change.assetId },
        );
      }

      const target = mapTargetPath(change.target, change.assetId || options.assetId, aliasContext);
      if (seenTargets.has(target)) {
        throw new SourceInstallerError(
          'WRITE_FAILED',
          `Duplicate install target "${target}". Refusing to write the same file twice.`,
          { target, source: change.source },
        );
      }
      seenTargets.add(target);

      const absoluteTarget = resolve(cwd, target);
      const exists = existsSync(absoluteTarget);

      let action: FileAction;
      if (!exists) {
        action = 'write';
      } else if (conflictPolicy === 'reject') {
        throw new SourceInstallerError(
          'TARGET_EXISTS',
          `Target file already exists: "${target}". Use conflictPolicy "skip" to keep it or "replace" to overwrite it.`,
          {
            target,
            source: change.source,
            status: change.status,
          },
        );
      } else if (conflictPolicy === 'skip') {
        action = 'skip';
        warnings.push(`Skipped existing file "${target}" (conflict policy: skip).`);
      } else {
        action = 'replace';
        if (change.status === 'modified' || change.status === 'user-owned') {
          warnings.push(`Replacing ${change.status} file "${target}" (conflict policy: replace).`);
        }
      }

      operations.push({ change, target, action });
    }

    const versions = options.versions ?? {};
    for (const operation of operations) {
      if (operation.action === 'skip') {
        continue;
      }

      const assetId = operation.change.assetId || options.assetId;
      const version = versions[assetId] ?? options.version;

      let content: Uint8Array;
      try {
        content = await client.getAssetFile(assetId, version, operation.change.source);
      } catch (error) {
        throw toSourceNotFoundError(error, operation.change.source, assetId, version);
      }

      operation.content = rewriteImports(content, operation.target, aliasContext);
    }

    const skippedCount = operations.filter((operation) => operation.action === 'skip').length;
    const planned = operations
      .filter((operation) => operation.action !== 'skip')
      .map((operation) => operation.target);

    if (dryRun) {
      if (verbose) {
        for (const target of planned) {
          console.log(`[simplify:source] would write ${target}`);
        }
      }
      warnings.push(
        `Dry run: ${planned.length} file(s) would be written, ${skippedCount} skipped.`,
      );
      return {
        filesWritten: 0,
        filesSkipped: skippedCount,
        filesReplaced: 0,
        filesFailed: 0,
        ...(warnings.length > 0 ? { warnings } : {}),
        ...(planned.length > 0 ? { filesPlanned: planned } : {}),
      };
    }

    const backups: BackupRecord[] = [];
    const createdTargets: string[] = [];
    const records: SourceInstallFileRecord[] = [];
    let filesWritten = 0;
    let filesReplaced = 0;
    let filesSkipped = 0;

    try {
      for (const operation of operations) {
        const { change, target, action } = operation;
        const assetId = change.assetId || options.assetId;
        const version = versions[assetId] ?? options.version;

        if (action === 'skip') {
          filesSkipped += 1;
          continue;
        }

        if (operation.content === undefined) {
          throw new SourceInstallerError(
            'SOURCE_NOT_FOUND',
            `Source file "${change.source}" for asset "${assetId}@${version}" was not loaded.`,
            { source: change.source, assetId, version },
          );
        }

        const absoluteTarget = resolve(cwd, target);
        let result;
        try {
          result = await safeWrite({
            targetPath: target,
            content: operation.content,
            backup: action === 'replace',
            cwd,
          });
        } catch (error) {
          throw toWriteError(error, target, change.source);
        }

        filesWritten += 1;
        if (action === 'replace') {
          filesReplaced += 1;
          if (result.backupPath !== undefined) {
            backups.push({
              originalPath: absoluteTarget,
              backupPath: result.backupPath,
              timestamp: new Date().toISOString(),
            });
          }
        } else {
          createdTargets.push(absoluteTarget);
        }

        records.push({
          source: change.source,
          target,
          assetId,
          version,
          status: action === 'replace' ? 'replaced' : 'written',
        });

        if (verbose) {
          console.log(`[simplify:source] wrote ${target}`);
        }
      }

      for (const operation of operations) {
        if (operation.action === 'skip') {
          continue;
        }
        const absoluteTarget = resolve(cwd, operation.target);
        if (!existsSync(absoluteTarget)) {
          throw new SourceInstallerError(
            'WRITE_FAILED',
            `Verification failed: expected installed file is missing: "${operation.target}".`,
            { target: operation.target, source: operation.change.source },
          );
        }
      }

      let metadataBackup: BackupRecord | undefined;
      try {
        metadataBackup = await recordSourceInstallation(cwd, records, warnings);
      } catch (error) {
        throw toWriteError(error, join(SIMPLIFY_DIR, SOURCE_INSTALLATIONS_FILE), options.assetId);
      }
      if (metadataBackup !== undefined) {
        backups.push(metadataBackup);
      } else if (records.length > 0) {
        createdTargets.push(resolve(cwd, SIMPLIFY_DIR, SOURCE_INSTALLATIONS_FILE));
      }
    } catch (error) {
      const cleanupErrors = await cleanupFailedInstallation(createdTargets, backups);

      if (error instanceof SourceInstallerError) {
        if (cleanupErrors.length > 0) {
          throw new SourceInstallerError(error.code, error.message, {
            ...error.details,
            cleanupErrors,
          });
        }
        throw error;
      }

      const writeError = toWriteError(error, 'installation', options.assetId);
      throw new SourceInstallerError(writeError.code, writeError.message, {
        ...writeError.details,
        ...(cleanupErrors.length > 0 ? { cleanupErrors } : {}),
      });
    }

    return {
      filesWritten,
      filesSkipped,
      filesReplaced,
      filesFailed: 0,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }
}
