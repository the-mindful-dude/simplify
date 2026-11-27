import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Badge } from './Badge';

afterEach(cleanup);

describe('Badge', () => {
  it('exposes its variant, size and optional status dot', () => {
    const ref = createRef<HTMLSpanElement>();
    render(
      <Badge ref={ref} variant="success" size="sm" dot className="custom">
        Verified
      </Badge>,
    );

    const badge = screen.getByText('Verified');
    expect(ref.current).toBe(badge);
    expect(badge).toHaveClass('custom');
    expect(badge).toHaveAttribute('data-variant', 'success');
    expect(badge).toHaveAttribute('data-size', 'sm');
    expect(badge.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('applies responsive visibility flags', () => {
    render(<Badge hiddenAbove="md">Beta</Badge>);
    expect(screen.getByText('Beta')).toHaveAttribute('data-sd-hidden-above', 'md');
  });
});
