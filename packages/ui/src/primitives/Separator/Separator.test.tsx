import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Separator } from './Separator';

afterEach(cleanup);

describe('Separator', () => {
  it('is decorative by default and hidden from assistive technology', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Separator ref={ref} className="custom" />);

    const separator = document.querySelector('[data-orientation="horizontal"]');
    expect(separator).not.toBeNull();
    expect(separator).toHaveAttribute('role', 'none');
    expect(separator).toHaveClass('custom');
    expect(ref.current).toBe(separator);
  });

  it('exposes orientation when semantic', () => {
    render(<Separator decorative={false} orientation="vertical" />);
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
  });
});
