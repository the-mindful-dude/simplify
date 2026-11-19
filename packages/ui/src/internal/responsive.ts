import { breakpoints } from '@simplify-dev/tokens';
import type { spacing } from '@simplify-dev/tokens';
import type { CSSProperties } from 'react';

/** Breakpoint names shared by every responsive component API. */
export type Breakpoint = keyof typeof breakpoints;
export type ResponsiveKey = Breakpoint | 'base';

/** A value plus optional per-breakpoint overrides. */
export type ResponsiveValue<T> = { base?: T } & { [K in Breakpoint]?: T };

/** Visibility/collapse flags implemented entirely by CSS media queries. */
export interface ResponsiveVisibilityProps {
  hiddenBelow?: Breakpoint | undefined;
  hiddenAbove?: Breakpoint | undefined;
  collapsedBelow?: Breakpoint | undefined;
}

const BREAKPOINTS = Object.keys(breakpoints) as Breakpoint[];

function isResponsiveValue<T>(value: T | ResponsiveValue<T>): value is ResponsiveValue<T> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return 'base' in candidate || BREAKPOINTS.some((key) => key in candidate);
}

/** Normalize a scalar or responsive object into a keyed map. */
export function normalizeResponsive<T>(
  value: T | ResponsiveValue<T> | undefined,
): Partial<Record<ResponsiveKey, T>> {
  if (value === undefined) return {};
  if (isResponsiveValue(value)) return value;
  return { base: value };
}

/** Spacing scale step accepted by layout components. */
export type SpacingValue = keyof typeof spacing;

/**
 * Emit one CSS custom property per provided breakpoint, converting each value
 * to its CSS representation. Components read these variables inside their own
 * media queries, so no viewport listeners are needed.
 *
 * React types custom properties as valid styles at runtime but not in
 * `CSSProperties`, hence the single assertion at this boundary.
 */
export function responsiveVarsFrom<T>(
  name: `--${string}`,
  value: T | ResponsiveValue<T> | undefined,
  toCss: (item: T) => string,
): CSSProperties {
  const normalized = normalizeResponsive(value);
  const vars: Record<string, string> = {};

  for (const key of ['base', ...BREAKPOINTS] as const) {
    const current = normalized[key];
    if (current !== undefined) {
      vars[key === 'base' ? name : `${name}-${key}`] = toCss(current);
    }
  }

  return vars as CSSProperties;
}

/** Emit raw string/number CSS variables for a responsive value. */
export function responsiveVars<T extends string | number>(
  name: `--${string}`,
  value: T | ResponsiveValue<T> | undefined,
): CSSProperties {
  return responsiveVarsFrom(name, value, (item) => String(item));
}

/** Emit variables whose values reference the canonical spacing tokens. */
export function spacingVars(
  name: `--${string}`,
  value: SpacingValue | ResponsiveValue<SpacingValue> | undefined,
): CSSProperties {
  return responsiveVarsFrom(name, value, (step) => `var(--sd-spacing-${step})`);
}

/** CSS class-name fragment for a breakpoint, including the `2xl` edge case. */
export function breakpointSuffix(breakpoint: Breakpoint): string {
  return breakpoint === '2xl' ? '2Xl' : breakpoint.charAt(0).toUpperCase() + breakpoint.slice(1);
}

type VisibilityAttributes = Record<
  'data-sd-hidden-below' | 'data-sd-hidden-above' | 'data-sd-collapsed-below',
  string | undefined
>;

/** Data attributes consumed by the shared responsive CSS module. */
export function visibilityAttributes(props: ResponsiveVisibilityProps): VisibilityAttributes {
  return {
    'data-sd-hidden-below': props.hiddenBelow,
    'data-sd-hidden-above': props.hiddenAbove,
    'data-sd-collapsed-below': props.collapsedBelow,
  };
}
