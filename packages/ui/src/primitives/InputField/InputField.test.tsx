import { cleanup, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { InputField } from './InputField';

afterEach(cleanup);

describe('InputField', () => {
  it('associates the label and description with the input', () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <InputField
        ref={ref}
        label="Email address"
        description="We never share it"
        placeholder="you@example.com"
      />,
    );

    const input = screen.getByLabelText(/Email address/);
    expect(ref.current).toBe(input);
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('-description'));
    expect(screen.getByText('We never share it')).toBeInTheDocument();
  });

  it('announces validation errors and marks the input invalid', () => {
    render(<InputField label="Email" error="Enter a valid email" />);

    const input = screen.getByLabelText('Email');
    const alert = screen.getByRole('alert');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', alert.id);
    expect(alert).toHaveTextContent('Enter a valid email');
  });

  it('supports forced invalid state and merges slot props and slot classes', () => {
    render(
      <InputField
        label="Name"
        invalid
        slots={{ root: 'slot-root', input: 'slot-input' }}
        slotProps={{
          root: { 'data-testid': 'field-root' },
          input: { 'data-testid': 'field-input', maxLength: 12 },
        }}
      />,
    );

    const root = screen.getByTestId('field-root');
    const input = screen.getByTestId('field-input');

    expect(root).toHaveClass('slot-root');
    expect(root).toHaveAttribute('data-invalid', 'true');
    expect(input).toHaveClass('slot-input');
    expect(input).toHaveAttribute('maxlength', '12');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders leading and trailing slots', () => {
    render(<InputField label="Search" leading="@" trailing="⌘K" />);
    expect(screen.getByText('@')).toBeInTheDocument();
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });
});
