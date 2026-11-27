import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SplitView, SplitViewSide } from './SplitView';

afterEach(cleanup);

describe('SplitView', () => {
  it('maps ratios and gaps to CSS variables and renders both sides', () => {
    render(
      <SplitView
        data-testid="split"
        ratio={{ base: [1, 1], md: [3, 7] }}
        gap={{ base: '2', lg: '6' }}
        splitAt="lg"
      >
        <SplitViewSide>Primary</SplitViewSide>
        <SplitViewSide>Secondary</SplitViewSide>
      </SplitView>,
    );

    const split = screen.getByTestId('split');
    expect(split).toHaveAttribute('data-split-at', 'lg');
    expect(split.style.getPropertyValue('--sd-split-cols')).toBe('1fr 1fr');
    expect(split.style.getPropertyValue('--sd-split-cols-md')).toBe('3fr 7fr');
    expect(split.style.getPropertyValue('--sd-split-gap')).toBe('var(--sd-spacing-2)');
    expect(split.style.getPropertyValue('--sd-split-gap-lg')).toBe('var(--sd-spacing-6)');
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Secondary')).toBeInTheDocument();
  });

  it('exposes mobile reversal and responsive flags', () => {
    render(
      <SplitView data-testid="split" ratio={[2, 8]} reverseOnMobile hiddenAbove="sm">
        <SplitViewSide>Left</SplitViewSide>
        <SplitViewSide>Right</SplitViewSide>
      </SplitView>,
    );

    const split = screen.getByTestId('split');
    expect(split).toHaveAttribute('data-reverse-on-mobile', 'true');
    expect(split).toHaveAttribute('data-sd-hidden-above', 'sm');
    expect(split.style.getPropertyValue('--sd-split-cols')).toBe('2fr 8fr');
  });
});
