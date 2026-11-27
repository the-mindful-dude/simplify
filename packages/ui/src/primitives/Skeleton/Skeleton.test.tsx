import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

afterEach(cleanup);

describe('Skeleton', () => {
  it('hidden by default and renders the requested number of lines', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Skeleton ref={ref} variant="text" lines={3} width="80%" className="custom" />);

    const skeleton = document.querySelector('[data-variant="text"]');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    expect(skeleton).toHaveClass('custom');
    expect(skeleton).toHaveStyle({ width: '80%' });
    expect(skeleton?.children).toHaveLength(3);
    expect(ref.current).toBe(skeleton);
  });

  it('announces itself as a status when a label is supplied', () => {
    render(<Skeleton label="Loading registry results" animate={false} />);

    const skeleton = screen.getByRole('status', { name: 'Loading registry results' });
    expect(skeleton).not.toHaveAttribute('aria-hidden');
    expect(skeleton).not.toHaveAttribute('data-animate');
  });
});
