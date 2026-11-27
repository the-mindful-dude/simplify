import type { breakpoints, spacing } from '@simplify-dev/tokens';

/** Breakpoint names shared by every responsive component API. */
export type Breakpoint = keyof typeof breakpoints;

/** A value plus optional per-breakpoint overrides. */
export type ResponsiveValue<T> = { base?: T } & { [K in Breakpoint]?: T };

/** Visibility/collapse flags implemented entirely by CSS media queries. */
export interface ResponsiveVisibilityProps {
  hiddenBelow?: Breakpoint | undefined;
  hiddenAbove?: Breakpoint | undefined;
  collapsedBelow?: Breakpoint | undefined;
}

/** Spacing scale step accepted by layout components. */
export type SpacingValue = keyof typeof spacing;
