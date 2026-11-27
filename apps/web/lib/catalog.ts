/** Compatibility shim: view helpers are owned by the registry domain module. */
export {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  SORT_LABELS,
  buildCategoryCounts,
  buildTags,
  filterAndSortAssets,
  formatGeneratedAt,
  formatTargetLabel,
  statusVariant,
  toTargetView,
} from '@simplify-dev/module-registry';
export type { StatusVariant } from '@simplify-dev/module-registry';
