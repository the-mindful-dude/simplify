import type {
  AssetCategory,
  AssetManifest,
  ConfigurationChange,
  EnvironmentVariable,
  InstallationMode,
  InstallationModeDefinition,
  PackageDependency,
  ProjectConfiguration,
  RegistryDependency,
} from '@simplify-dev/schemas';

export interface ResolvedAsset {
  readonly id: string;
  readonly version: string;
  readonly category: AssetCategory;
}

export interface InstallationModeAssignment {
  readonly assetId: string;
  readonly mode: InstallationMode;
}

export interface FileMapping {
  readonly source: string;
  readonly target: string;
  readonly assetId: string;
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

export interface GraphNode {
  readonly id: string;
  readonly version: string;
}

export interface GraphEdge {
  readonly from: string;
  readonly to: string;
  readonly versionConstraint: string;
}

export interface DependencyGraph {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
}

export interface Conflict {
  readonly type: 'cycle' | 'version' | 'file-target' | 'missing-dependency';
  readonly message: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export interface ResolverOptions {
  readonly defaultMode?: InstallationMode;
}

export type AssetManifestLoader = (
  id: string,
  version?: string,
) => Promise<AssetManifest | undefined>;

export class ResolutionError extends Error {
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, details: Readonly<Record<string, unknown>> = {}) {
    super(message);
    this.name = 'ResolutionError';
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Semver range support
// ---------------------------------------------------------------------------

interface SemVer {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

function parseVersion(version: string): SemVer | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1] ?? '0'),
    minor: Number(match[2] ?? '0'),
    patch: Number(match[3] ?? '0'),
  };
}

function compare(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) {
    return a.major < b.major ? -1 : 1;
  }
  if (a.minor !== b.minor) {
    return a.minor < b.minor ? -1 : 1;
  }
  if (a.patch !== b.patch) {
    return a.patch < b.patch ? -1 : 1;
  }
  return 0;
}

function sameVersion(a: SemVer, b: SemVer): boolean {
  return a.major === b.major && a.minor === b.minor && a.patch === b.patch;
}

interface Bound {
  readonly version: SemVer;
  readonly inclusive: boolean;
}

interface ParsedRange {
  readonly lower: Bound | null;
  readonly upper: Bound | null;
  readonly exact: SemVer | null;
}

function nextBreaking(version: SemVer): SemVer {
  if (version.major === 0 && version.minor === 0) {
    return { major: 0, minor: 0, patch: version.patch + 1 };
  }
  if (version.major === 0) {
    return { major: 0, minor: version.minor + 1, patch: 0 };
  }
  return { major: version.major + 1, minor: 0, patch: 0 };
}

function mergeLower(current: Bound | null, next: Bound): Bound {
  if (!current) {
    return next;
  }
  const ordering = compare(current.version, next.version);
  if (ordering < 0) {
    return next;
  }
  if (ordering > 0) {
    return current;
  }
  return {
    version: current.version,
    inclusive: current.inclusive && next.inclusive,
  };
}

function mergeUpper(current: Bound | null, next: Bound): Bound {
  if (!current) {
    return next;
  }
  const ordering = compare(current.version, next.version);
  if (ordering > 0) {
    return next;
  }
  if (ordering < 0) {
    return current;
  }
  return {
    version: current.version,
    inclusive: current.inclusive && next.inclusive,
  };
}

function parseRange(range: string): ParsedRange | null {
  const trimmed = range.trim();
  if (trimmed === '' || trimmed === '*') {
    return { lower: null, upper: null, exact: null };
  }
  if (trimmed.includes('||')) {
    return null;
  }

  let lower: Bound | null = null;
  let upper: Bound | null = null;
  let exact: SemVer | null = null;

  const parts = trimmed.split(/\s+/);
  for (const part of parts) {
    if (part === '') {
      continue;
    }
    const match = /^(>=|<=|\^|~|>|<|=)?(\d+)\.(\d+)\.(\d+)$/.exec(part);
    if (!match) {
      return null;
    }
    const version: SemVer = {
      major: Number(match[2] ?? '0'),
      minor: Number(match[3] ?? '0'),
      patch: Number(match[4] ?? '0'),
    };
    const operator = (match[1] ?? '') as '>=' | '<=' | '^' | '~' | '>' | '<' | '=' | '';

    switch (operator) {
      case '^': {
        const ceiling = nextBreaking(version);
        lower = mergeLower(lower, { version, inclusive: true });
        upper = mergeUpper(upper, { version: ceiling, inclusive: false });
        break;
      }
      case '~': {
        const ceiling = {
          major: version.major,
          minor: version.minor + 1,
          patch: 0,
        };
        lower = mergeLower(lower, { version, inclusive: true });
        upper = mergeUpper(upper, { version: ceiling, inclusive: false });
        break;
      }
      case '>=':
        lower = mergeLower(lower, { version, inclusive: true });
        break;
      case '>':
        lower = mergeLower(lower, { version, inclusive: false });
        break;
      case '<=':
        upper = mergeUpper(upper, { version, inclusive: true });
        break;
      case '<':
        upper = mergeUpper(upper, { version, inclusive: false });
        break;
      case '=':
      case '': {
        if (exact !== null && !sameVersion(exact, version)) {
          return null;
        }
        exact = version;
        break;
      }
    }
  }

  return { lower, upper, exact };
}

function satisfies(version: SemVer, range: ParsedRange): boolean {
  if (range.exact) {
    return sameVersion(version, range.exact);
  }
  if (range.lower) {
    const ordering = compare(version, range.lower.version);
    if (ordering < 0) {
      return false;
    }
    if (ordering === 0 && !range.lower.inclusive) {
      return false;
    }
  }
  if (range.upper) {
    const ordering = compare(version, range.upper.version);
    if (ordering > 0) {
      return false;
    }
    if (ordering === 0 && !range.upper.inclusive) {
      return false;
    }
  }
  return true;
}

function rangeString(range: ParsedRange): string {
  const parts: string[] = [];
  if (range.exact) {
    parts.push(`=${range.exact.major}.${range.exact.minor}.${range.exact.patch}`);
  }
  if (range.lower) {
    parts.push(
      `${range.lower.inclusive ? '>=' : '>'}${range.lower.version.major}.${range.lower.version.minor}.${range.lower.version.patch}`,
    );
  }
  if (range.upper) {
    parts.push(
      `${range.upper.inclusive ? '<=' : '<'}${range.upper.version.major}.${range.upper.version.minor}.${range.upper.version.patch}`,
    );
  }
  return parts.length > 0 ? parts.join(' ') : '*';
}

function rangeIntersects(a: ParsedRange, b: ParsedRange): boolean {
  if (a.exact && b.exact) {
    return sameVersion(a.exact, b.exact);
  }
  if (a.exact) {
    return satisfies(a.exact, b);
  }
  if (b.exact) {
    return satisfies(b.exact, a);
  }

  let lower: Bound | null = null;
  if (a.lower && b.lower) {
    lower = compare(a.lower.version, b.lower.version) >= 0 ? a.lower : b.lower;
  } else if (a.lower) {
    lower = a.lower;
  } else if (b.lower) {
    lower = b.lower;
  }

  let upper: Bound | null = null;
  if (a.upper && b.upper) {
    upper = compare(a.upper.version, b.upper.version) <= 0 ? a.upper : b.upper;
  } else if (a.upper) {
    upper = a.upper;
  } else if (b.upper) {
    upper = b.upper;
  }

  if (lower && upper) {
    const ordering = compare(lower.version, upper.version);
    if (ordering < 0) {
      return true;
    }
    if (ordering === 0) {
      return lower.inclusive && upper.inclusive;
    }
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Dependency resolver
// ---------------------------------------------------------------------------

export class DependencyResolver {
  private readonly loadAsset: AssetManifestLoader;
  private readonly options: Readonly<ResolverOptions>;

  constructor(loadAsset: AssetManifestLoader, options: Readonly<ResolverOptions> = {}) {
    this.loadAsset = loadAsset;
    this.options = options;
  }

  async resolve(
    assetIds: string[],
    projectConfig: ProjectConfiguration,
  ): Promise<ResolutionResult> {
    const defaultMode = this.options.defaultMode ?? projectConfig.installation.defaultMode;
    const visited = new Map<string, AssetManifest>();
    const visiting = new Set<string>();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const registryDependencies: RegistryDependency[] = [];
    const packageDependencies: PackageDependency[] = [];
    const installationModes: InstallationModeAssignment[] = [];
    const fileMappings: FileMapping[] = [];
    const environmentVariables: EnvironmentVariable[] = [];
    const configurationChanges: ConfigurationChange[] = [];
    const seenFileTargets = new Set<string>();

    const visit = async (id: string): Promise<void> => {
      if (visited.has(id)) {
        return;
      }
      if (visiting.has(id)) {
        throw new ResolutionError(
          'CYCLE_DETECTED',
          `Circular dependency detected involving "${id}".`,
          { assetId: id },
        );
      }
      visiting.add(id);
      try {
        const manifest = await this.loadAsset(id);
        if (!manifest) {
          throw new ResolutionError('MISSING_ASSET', `Registry asset "${id}" was not found.`, {
            assetId: id,
          });
        }

        const registryDeps = [...(manifest.dependencies?.registry ?? [])];
        const packageDeps = [...(manifest.dependencies?.packages ?? [])];

        for (const dependency of registryDeps) {
          registryDependencies.push(dependency);
          edges.push({
            from: manifest.id,
            to: dependency.id,
            versionConstraint: dependency.version,
          });
          await visit(dependency.id);
        }

        for (const dependency of packageDeps) {
          packageDependencies.push(dependency);
        }

        visiting.delete(id);
        visited.set(manifest.id, manifest);
        nodes.push({ id: manifest.id, version: manifest.version });

        const mode = selectInstallationMode(manifest, defaultMode);
        installationModes.push({ assetId: manifest.id, mode: mode.mode });

        for (const dependency of mode.dependencies?.registry ?? []) {
          registryDependencies.push(dependency);
          edges.push({
            from: manifest.id,
            to: dependency.id,
            versionConstraint: dependency.version,
          });
          await visit(dependency.id);
        }
        for (const dependency of mode.dependencies?.packages ?? []) {
          packageDependencies.push(dependency);
        }

        for (const file of mode.files ?? []) {
          if (seenFileTargets.has(file.target)) {
            throw new ResolutionError(
              'DUPLICATE_FILE_TARGET',
              `Duplicate file target "${file.target}".`,
              { target: file.target, assetId: manifest.id },
            );
          }
          seenFileTargets.add(file.target);
          fileMappings.push({
            source: file.source,
            target: file.target,
            assetId: manifest.id,
          });
        }
        for (const variable of mode.environment ?? []) {
          environmentVariables.push(variable);
        }
        for (const change of mode.configuration ?? []) {
          configurationChanges.push(change);
        }
      } finally {
        visiting.delete(id);
      }
    };

    for (const assetId of assetIds) {
      await visit(assetId);
    }

    return {
      assets: [...visited.values()].map((manifest) => ({
        id: manifest.id,
        version: manifest.version,
        category: manifest.category,
      })),
      registryDependencies: deduplicateRegistryDependencies(registryDependencies),
      packageDependencies: deduplicatePackageDependencies(packageDependencies),
      installationModes,
      fileMappings,
      environmentVariables,
      configurationChanges,
    };
  }

  async resolveAssetGraph(assetId: string, version: string): Promise<DependencyGraph> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = async (id: string, versionConstraint?: string, from?: string): Promise<void> => {
      if (visited.has(id)) {
        return;
      }
      if (visiting.has(id)) {
        return;
      }
      visiting.add(id);
      try {
        const manifest = await this.loadAsset(id, version);
        if (!manifest) {
          return;
        }
        visiting.delete(id);
        visited.add(id);
        nodes.push({ id: manifest.id, version: manifest.version });
        if (from) {
          edges.push({
            from,
            to: manifest.id,
            versionConstraint: versionConstraint ?? manifest.version,
          });
        }
        for (const dependency of manifest.dependencies?.registry ?? []) {
          await visit(dependency.id, dependency.version, manifest.id);
        }
      } finally {
        visiting.delete(id);
      }
    };

    await visit(assetId, undefined, undefined);
    return { nodes, edges };
  }

  detectCycles(graph: DependencyGraph): boolean {
    const adjacency = new Map<string, string[]>();
    for (const node of graph.nodes) {
      adjacency.set(node.id, []);
    }
    for (const edge of graph.edges) {
      const targets = adjacency.get(edge.from) ?? [];
      targets.push(edge.to);
      adjacency.set(edge.from, targets);
    }

    const visited = new Set<string>();
    const stack = new Set<string>();

    const walk = (id: string): boolean => {
      if (stack.has(id)) {
        return true;
      }
      if (visited.has(id)) {
        return false;
      }
      visited.add(id);
      stack.add(id);
      for (const target of adjacency.get(id) ?? []) {
        if (walk(target)) {
          return true;
        }
      }
      stack.delete(id);
      return false;
    };

    for (const node of graph.nodes) {
      if (!visited.has(node.id) && walk(node.id)) {
        return true;
      }
    }
    return false;
  }

  detectConflicts(graph: DependencyGraph): Conflict[] {
    const conflicts: Conflict[] = [];

    const byTarget = new Map<string, GraphEdge[]>();
    for (const edge of graph.edges) {
      const list = byTarget.get(edge.to) ?? [];
      list.push(edge);
      byTarget.set(edge.to, list);
    }

    const nodeById = new Map<string, GraphNode>();
    for (const node of graph.nodes) {
      nodeById.set(node.id, node);
    }

    for (const [targetId, incoming] of byTarget) {
      const constraints = incoming.map((edge) => edge.versionConstraint);
      const parsed = constraints.map((constraint) => parseRange(constraint));

      for (let i = 0; i < parsed.length; i += 1) {
        for (let j = i + 1; j < parsed.length; j += 1) {
          const left = parsed[i];
          const right = parsed[j];
          if (!left || !right || !rangeIntersects(left, right)) {
            conflicts.push({
              type: 'version',
              message: `Incompatible version constraints for "${targetId}": ${rangeString(
                left ?? { lower: null, upper: null, exact: null },
              )} vs ${rangeString(right ?? { lower: null, upper: null, exact: null })}.`,
              details: {
                dependencyId: targetId,
                left: rangeString(left ?? { lower: null, upper: null, exact: null }),
                right: rangeString(right ?? { lower: null, upper: null, exact: null }),
              },
            });
          }
        }
      }

      const node = nodeById.get(targetId);
      if (node) {
        const nodeVersion = parseVersion(node.version);
        if (nodeVersion) {
          for (const edge of incoming) {
            const parsed = parseRange(edge.versionConstraint);
            if (parsed && !satisfies(nodeVersion, parsed)) {
              conflicts.push({
                type: 'version',
                message: `Resolved version "${node.version}" of "${targetId}" does not satisfy constraint "${edge.versionConstraint}" required by "${edge.from}".`,
                details: {
                  dependencyId: targetId,
                  resolvedVersion: node.version,
                  requiredBy: edge.from,
                  constraint: edge.versionConstraint,
                },
              });
            }
          }
        }
      }
    }

    return conflicts;
  }
}

function selectInstallationMode(
  manifest: AssetManifest,
  defaultMode: InstallationMode,
): InstallationModeDefinition {
  const modes = manifest.installation?.modes ?? [];
  const matched = modes.find((mode) => mode.mode === defaultMode);
  if (matched) {
    return matched;
  }
  if (modes.length > 0) {
    return modes[0]!;
  }
  return { mode: defaultMode };
}

function deduplicateRegistryDependencies(
  dependencies: readonly RegistryDependency[],
): RegistryDependency[] {
  const seen = new Set<string>();
  const result: RegistryDependency[] = [];
  for (const dependency of dependencies) {
    if (seen.has(dependency.id)) {
      continue;
    }
    seen.add(dependency.id);
    result.push(dependency);
  }
  return result;
}

function deduplicatePackageDependencies(
  dependencies: readonly PackageDependency[],
): PackageDependency[] {
  const seen = new Set<string>();
  const result: PackageDependency[] = [];
  for (const dependency of dependencies) {
    if (seen.has(dependency.name)) {
      continue;
    }
    seen.add(dependency.name);
    result.push(dependency);
  }
  return result;
}
