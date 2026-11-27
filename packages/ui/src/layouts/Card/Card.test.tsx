import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Card, CardBody, CardFooter, CardHeader } from './Card';

afterEach(cleanup);

describe('Card', () => {
  it('renders compound sections and responsive padding', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Card
        ref={ref}
        data-testid="card"
        variant="elevated"
        padding={{ base: '4', md: '8' }}
        className="custom"
      >
        <Card.Header>Header</Card.Header>
        <Card.Body>Body</Card.Body>
        <Card.Footer>Footer</Card.Footer>
      </Card>,
    );

    const card = screen.getByTestId('card');
    expect(ref.current).toBe(card);
    expect(card).toHaveClass('custom');
    expect(card).toHaveAttribute('data-variant', 'elevated');
    expect(card.style.getPropertyValue('--sd-card-padding')).toBe('var(--sd-spacing-4)');
    expect(card.style.getPropertyValue('--sd-card-padding-md')).toBe('var(--sd-spacing-8)');
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('renders the named compound part exports with their own props', () => {
    render(
      <Card>
        <CardHeader data-testid="card-header">Named header</CardHeader>
        <CardBody data-testid="card-body">Named body</CardBody>
        <CardFooter data-testid="card-footer" hiddenBelow="md">
          Named footer
        </CardFooter>
      </Card>,
    );

    expect(screen.getByTestId('card-header')).toHaveTextContent('Named header');
    expect(screen.getByTestId('card-body')).toHaveTextContent('Named body');
    const footer = screen.getByTestId('card-footer');
    expect(footer).toHaveTextContent('Named footer');
    expect(footer).toHaveAttribute('data-sd-hidden-below', 'md');
  });

  it('makes interactive cards keyboard focusable', () => {
    render(
      <Card interactive data-testid="card">
        Open details
      </Card>,
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('data-interactive', 'true');
    expect(card).toHaveAttribute('tabindex', '0');
  });
});
