import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import source from '../src/source/tokens.json';
import { breakpoints, cssVariables, tokenCss } from '../src/index';

const generatedCss = readFileSync(new URL('../src/outputs/tokens.css', import.meta.url), 'utf8');

describe('canonical token source', () => {
  it('exposes every source value as a namespaced CSS custom property', () => {
    const expected = new Map<string, string>();

    for (const [group, values] of Object.entries(source)) {
      for (const [key, value] of Object.entries(values)) {
        const segment = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        expected.set(`--sd-${group.replace(/([A-Z])/g, '-$1').toLowerCase()}-${segment}`, value);
      }
    }

    expect(Object.keys(cssVariables)).toHaveLength(expected.size);
    for (const [name, value] of expected) {
      expect(cssVariables[name]).toBe(value);
      expect(generatedCss).toContain(`${name}: ${value};`);
    }
  });

  it('keeps the generated stylesheet identical to the exported CSS string', () => {
    expect(generatedCss).toBe(tokenCss);
  });

  it('defines the five breakpoint values used by responsive component APIs', () => {
    expect(breakpoints).toEqual({
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    });
  });
});

/** WCAG relative luminance for a canonical `#rrggbb` token value. */
function relativeLuminance(hex: string): number {
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(hex.slice(offset + 1, offset + 3), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio between two canonical token values. */
function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

const darkSurfaces = [
  'background',
  'backgroundSubtle',
  'surface',
  'surfaceRaised',
  'surfaceHover',
  'surfaceOverlay',
  'accentMuted',
  'dangerSurface',
  'successSurface',
  'warningSurface',
  'infoSurface',
  'overlay',
] as const;

describe('semantic token contrast', () => {
  it('keeps subtle text at WCAG AA normal-text contrast on every dark surface', () => {
    for (const surface of darkSurfaces) {
      const ratio = contrastRatio(source.color.foregroundSubtle, source.color[surface]);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps strong borders at WCAG 1.4.11 non-text contrast on every dark surface', () => {
    for (const surface of darkSurfaces) {
      const ratio = contrastRatio(source.color.borderStrong, source.color[surface]);
      expect(ratio).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps both destructive button states readable', () => {
    expect(
      contrastRatio(source.color.foregroundOnAccent, source.color.danger),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(source.color.foreground, source.color.dangerSurface),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
