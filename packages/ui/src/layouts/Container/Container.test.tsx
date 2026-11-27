import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Container } from './Container';

afterEach(cleanup);

describe('Container', () => {
  it('maps scalar and responsive padding values to CSS custom properties', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Container
        ref={ref}
        data-testid="container"
        size="md"
        padding={{ base: '2', md: '6' }}
        className="custom"
      >
        Content
      </Container>,
    );

    const container = screen.getByTestId('container');
    expect(ref.current).toBe(container);
    expect(container).toHaveClass('custom');
    expect(container).toHaveAttribute('data-size', 'md');
    expect(container.style.getPropertyValue('--sd-container-padding')).toBe('var(--sd-spacing-2)');
    expect(container.style.getPropertyValue('--sd-container-padding-md')).toBe(
      'var(--sd-spacing-6)',
    );
  });

  it('accepts a scalar padding and responsive visibility flags', () => {
    render(
      <Container data-testid="container" padding="8" hiddenBelow="lg" collapsedBelow="md">
        Content
      </Container>,
    );

    const container = screen.getByTestId('container');
    expect(container.style.getPropertyValue('--sd-container-padding')).toBe('var(--sd-spacing-8)');
    expect(container).toHaveAttribute('data-sd-hidden-below', 'lg');
    expect(container).toHaveAttribute('data-sd-collapsed-below', 'md');
  });
});
