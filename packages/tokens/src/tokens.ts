import { tokenSource } from './outputs/tokens.generated';

/** Semantic surface, text, border, accent and state colors for the dark theme. */
export const colors = tokenSource.color;

/** Border-radius scale. */
export const radii = tokenSource.radius;

/** Spacing scale keyed by step. */
export const spacing = tokenSource.spacing;

/** Font families, sizes, line heights and weights. */
export const typography = tokenSource.font;

/** Animation durations and easing curves. */
export const motion = tokenSource.motion;

/** Stacking levels for layouts, overlays and feedback surfaces. */
export const zIndex = tokenSource.zIndex;

/** Minimum viewport widths, keyed by breakpoint name. */
export const breakpoints = tokenSource.breakpoint;

/** Every canonical token group, keyed by its CSS custom-property group segment. */
export const tokens = {
  color: colors,
  radius: radii,
  spacing,
  font: typography,
  motion,
  zIndex,
  breakpoint: breakpoints,
} as const;

export type ColorToken = keyof typeof colors;
export type RadiusToken = keyof typeof radii;
export type SpacingToken = keyof typeof spacing;
export type TypographyToken = keyof typeof typography;
export type MotionToken = keyof typeof motion;
export type ZIndexToken = keyof typeof zIndex;
export type Breakpoint = keyof typeof breakpoints;

/** Convert camelCase token keys into their CSS custom-property segment. */
function toKebabCase(key: string): string {
  return key.replace(/([A-Z])/g, '-$1').toLowerCase();
}

const groups: Readonly<Record<string, Readonly<Record<string, string>>>> = tokens;

/** Mapping of CSS custom-property name to its canonical value. */
export const cssVariables: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(groups).flatMap(([group, values]) =>
      Object.entries(values).map(
        ([key, value]) => [`--sd-${toKebabCase(group)}-${toKebabCase(key)}`, value] as const,
      ),
    ),
  ),
);

/**
 * Ready-to-inject stylesheet defining all `--sd-*` custom properties on `:root`
 * and on `[data-sd-theme='dark']`. It is generated from the same canonical source
 * as the `tokens.css` artifact, so the two can never disagree.
 */
export const tokenCss = `:root,\n[data-sd-theme='dark'] {\n${Object.entries(cssVariables)
  .map(([name, value]) => `  ${name}: ${value};`)
  .join('\n')}\n}\n`;
