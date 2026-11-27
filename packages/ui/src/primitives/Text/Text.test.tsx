import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Text } from './Text';

afterEach(cleanup);

describe('Text', () => {
  it('renders the requested semantic element with its content', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Text ref={ref} as="h2" variant="lead" tone="muted" className="custom">
        Registry assets
      </Text>,
    );

    const heading = screen.getByRole('heading', { level: 2, name: 'Registry assets' });
    expect(ref.current).toBe(heading);
    expect(heading.tagName).toBe('H2');
    expect(heading).toHaveClass('custom');
    expect(heading).toHaveAttribute('data-variant', 'lead');
    expect(heading).toHaveAttribute('data-tone', 'muted');
  });

  it('supports truncation and responsive visibility flags', () => {
    render(
      <Text as="span" truncate hiddenBelow="lg">
        Long label
      </Text>,
    );

    const text = screen.getByText('Long label');
    expect(text).toHaveAttribute('data-sd-hidden-below', 'lg');
  });
});
