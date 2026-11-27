import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Stack } from './Stack';

afterEach(cleanup);

describe('Stack', () => {
  it('maps responsive direction and gap values to CSS variables', () => {
    render(
      <Stack
        data-testid="stack"
        direction={{ base: 'column', md: 'row' }}
        gap={{ base: '2', lg: '6' }}
        align="center"
        justify="between"
      >
        <span>One</span>
        <span>Two</span>
      </Stack>,
    );

    const stack = screen.getByTestId('stack');
    expect(stack.style.getPropertyValue('--sd-stack-direction')).toBe('column');
    expect(stack.style.getPropertyValue('--sd-stack-direction-md')).toBe('row');
    expect(stack.style.getPropertyValue('--sd-stack-gap')).toBe('var(--sd-spacing-2)');
    expect(stack.style.getPropertyValue('--sd-stack-gap-lg')).toBe('var(--sd-spacing-6)');
    expect(stack).toHaveAttribute('data-align', 'center');
    expect(stack).toHaveAttribute('data-justify', 'between');
  });

  it('supports wrapping, dividers and responsive flags', () => {
    render(
      <Stack data-testid="stack" direction="row" wrap divider hiddenBelow="sm" collapsedBelow="md">
        <span>A</span>
        <span>B</span>
      </Stack>,
    );

    const stack = screen.getByTestId('stack');
    expect(stack).toHaveAttribute('data-wrap', 'true');
    expect(stack).toHaveAttribute('data-divider', 'true');
    expect(stack).toHaveAttribute('data-divider-axis', 'row');
    expect(stack).toHaveAttribute('data-sd-hidden-below', 'sm');
    expect(stack).toHaveAttribute('data-sd-collapsed-below', 'md');
  });
});
