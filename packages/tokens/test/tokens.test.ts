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
