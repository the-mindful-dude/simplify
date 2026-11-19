import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Spinner } from './Spinner';

afterEach(cleanup);

describe('Spinner', () => {
  it('announces its label and forwards className and ref', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<Spinner ref={ref} className="custom" label="Fetching results" size="lg" />);

    const spinner = screen.getByRole('status', { name: 'Fetching results' });
    expect(ref.current).toBe(spinner);
    expect(spinner).toHaveClass('custom');
    expect(spinner).toHaveAttribute('data-size', 'lg');
  });

  it('can be hidden from assistive technology when used decoratively', () => {
    render(<Spinner role="presentation" label="" />);
    expect(document.querySelector('[role="presentation"]')).toBeInTheDocument();
  });
});
