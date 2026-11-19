import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

afterEach(cleanup);

describe('Button', () => {
  it('fires click and forwards its ref and className', () => {
    const onClick = vi.fn();
    const ref = createRef<HTMLButtonElement>();

    render(
      <Button ref={ref} className="custom" onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledOnce();
    expect(ref.current).toBe(button);
    expect(button).toHaveClass('custom');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('cannot be activated while disabled', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables itself, announces busy state and shows a spinner while loading', () => {
    const onClick = vi.fn();
    render(
      <Button loading loadingLabel="Saving data" onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status', { name: 'Saving data' })).toBeInTheDocument();
  });

  it('renders as a single child element with asChild', () => {
    render(
      <Button asChild variant="ghost">
        <a href="/docs">Docs</a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: 'Docs' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/docs');
    expect(link).toHaveAttribute('data-variant', 'ghost');
  });

  it('exposes responsive visibility flags as data attributes', () => {
    render(
      <Button hiddenBelow="md" hiddenAbove="2xl" collapsedBelow="sm">
        Filter
      </Button>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-sd-hidden-below', 'md');
    expect(button).toHaveAttribute('data-sd-hidden-above', '2xl');
    expect(button).toHaveAttribute('data-sd-collapsed-below', 'sm');
  });
});
