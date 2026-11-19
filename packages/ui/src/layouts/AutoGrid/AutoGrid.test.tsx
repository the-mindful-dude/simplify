import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AutoGrid, AutoGridItem } from './AutoGrid';

afterEach(cleanup);

describe('AutoGrid', () => {
  it('maps responsive column and gap values to CSS variables', () => {
    render(
      <AutoGrid data-testid="grid" columns={{ base: 1, md: 2, lg: 3 }} gap={{ base: '2', xl: '8' }}>
        <div>Item one</div>
      </AutoGrid>,
    );

    const grid = screen.getByTestId('grid');
    expect(grid.style.getPropertyValue('--sd-grid-columns')).toBe('1');
    expect(grid.style.getPropertyValue('--sd-grid-columns-md')).toBe('2');
    expect(grid.style.getPropertyValue('--sd-grid-columns-lg')).toBe('3');
    expect(grid.style.getPropertyValue('--sd-grid-gap')).toBe('var(--sd-spacing-2)');
    expect(grid.style.getPropertyValue('--sd-grid-gap-xl')).toBe('var(--sd-spacing-8)');
  });

  it('renders the empty state when forced and when there are no children', () => {
    const { unmount } = render(
      <AutoGrid isEmpty emptyState="No matching assets">
        <div>Hidden item</div>
      </AutoGrid>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('No matching assets');
    expect(screen.queryByText('Hidden item')).not.toBeInTheDocument();

    unmount();

    render(<AutoGrid emptyState="Nothing to show" />);
    expect(screen.getByRole('status')).toHaveTextContent('Nothing to show');
  });

  it('supports fit mode and responsive item spans', () => {
    render(
      <AutoGrid mode="fit" minItemWidth="12rem" data-testid="grid">
        <AutoGridItem data-testid="item" span={{ base: 1, md: 2 }}>
          Wide item
        </AutoGridItem>
      </AutoGrid>,
    );

    const grid = screen.getByTestId('grid');
    const item = screen.getByTestId('item');
    expect(grid).toHaveAttribute('data-mode', 'fit');
    expect(grid.style.getPropertyValue('--sd-grid-min-width')).toBe('12rem');
    expect(item.style.getPropertyValue('--sd-grid-span')).toBe('1');
    expect(item.style.getPropertyValue('--sd-grid-span-md')).toBe('2');
  });
});
