import type {
  AssetCategory,
  AssetFilters,
  AssetStatus,
  CategoryCount,
  RegistryAssetView,
  TargetView,
} from './types.js';

/** Status-to-color mapping compatible with the UI Badge variant contract. */
export type StatusVariant = 'neutral' | 'success' | 'warning' | 'danger';

/** Map a real registry status to a restrained semantic badge variant. */
export function statusVariant(status: AssetStatus): StatusVariant {
  switch (status) {
    case 'official':
    case 'verified':
      return 'success';
    case 'deprecated':
      return 'warning';
    case 'compromised':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** Stable display order for the six registry categories. */
export const CATEGORY_ORDER: readonly AssetCategory[] = [
  'ui',
  'blocks',
  'logic',
  'integrations',
  'recipes',
  'templates',
];

/** Human-readable labels for the six registry categories. */
export const CATEGORY_LABELS: Readonly<Record<AssetCategory, string>> = {
  ui: 'UI',
  blocks: 'Blocks',
  logic: 'Logic',
  integrations: 'Integrations',
  recipes: 'Recipes',
  templates: 'Templates',
};

/** Sort labels used by the browser sort control. */
export const SORT_LABELS: Readonly<Record<AssetFilters['sort'], string>> = {
  name: 'Name',
  category: 'Category',
  version: 'Version',
};

interface TargetInput {
  readonly language: string;
  readonly framework?: string;
  readonly runtime?: string;
  readonly platform?: string;
}

/** Render a target as a compact, human-readable label using only real field values. */
export function formatTargetLabel(target: TargetInput): string {
  const language = target.language === 'typescript' ? 'TypeScript' : target.language;
  const parts = [language];
  if (target.framework) {
    parts.push(target.framework);
  }
  if (target.runtime) {
    parts.push(target.runtime);
  }
  if (target.platform) {
    parts.push(target.platform);
  }
  return parts.join(' · ');
}

/** Convert a manifest/index target into a serializable view with a display label. */
export function toTargetView(target: TargetInput): TargetView {
  return {
    language: target.language,
    ...(target.framework ? { framework: target.framework } : {}),
    ...(target.runtime ? { runtime: target.runtime } : {}),
    label: formatTargetLabel(target),
  };
}

/** Count assets per category, always emitting all six categories in display order. */
export function buildCategoryCounts(
  assets: readonly RegistryAssetView[],
): readonly CategoryCount[] {
  const counts = new Map<AssetCategory, number>(CATEGORY_ORDER.map((category) => [category, 0]));
  for (const asset of assets) {
    counts.set(asset.category, (counts.get(asset.category) ?? 0) + 1);
  }
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    count: counts.get(category) ?? 0,
  }));
}

/** Build searchable tags from real target fields, without duplicates. */
export function buildTags(targets: readonly TargetView[]): readonly string[] {
  const tags = new Set<string>();
  for (const target of targets) {
    if (target.language) {
      tags.add(target.language);
    }
    if (target.framework) {
      tags.add(target.framework);
    }
    if (target.runtime) {
      tags.add(target.runtime);
    }
  }
  return [...tags];
}

function compareVersions(left: string, right: string): number {
  const parse = (value: string): readonly number[] =>
    value
      .split(/[.+-]/)
      .slice(0, 3)
      .map((part) => {
        const parsed = Number.parseInt(part, 10);
        return Number.isNaN(parsed) ? 0 : parsed;
      });

  const leftParts = parse(left);
  const rightParts = parse(right);
  for (let index = 0; index < 3; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart !== rightPart) {
      return rightPart - leftPart;
    }
  }
  return 0;
}

function searchableText(asset: RegistryAssetView): string {
  return [
    asset.id,
    asset.name,
    asset.description,
    CATEGORY_LABELS[asset.category],
    asset.category,
    asset.version,
    ...asset.tags,
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * Filter and sort the real asset list. Search terms are ANDed so that multiple
 * words narrow results, and all matching is case-insensitive.
 */
export function filterAndSortAssets(
  assets: readonly RegistryAssetView[],
  filters: AssetFilters,
): readonly RegistryAssetView[] {
  const terms = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const filtered = assets.filter((asset) => {
    if (filters.category !== 'all' && asset.category !== filters.category) {
      return false;
    }
    if (filters.libraryId !== 'all' && !asset.libraryIds.includes(filters.libraryId)) {
      return false;
    }
    if (terms.length === 0) {
      return true;
    }
    const haystack = searchableText(asset);
    return terms.every((term) => haystack.includes(term));
  });

  return [...filtered].sort((left, right) => {
    if (filters.sort === 'category') {
      const byCategory =
        CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category);
      if (byCategory !== 0) {
        return byCategory;
      }
    }
    if (filters.sort === 'version') {
      const byVersion = compareVersions(left.version, right.version);
      if (byVersion !== 0) {
        return byVersion;
      }
    }
    return left.name.localeCompare(right.name);
  });
}

/** Format an ISO timestamp deterministically for display without hydration drift. */
export function formatGeneratedAt(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}
