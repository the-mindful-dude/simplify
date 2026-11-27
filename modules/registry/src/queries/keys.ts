/** Stable query-key factory; consumers must never build registry keys by hand. */
export const registryQueryKeys = {
  all: ['registry'] as const,
  snapshot: () => [...registryQueryKeys.all, 'snapshot'] as const,
} as const;
