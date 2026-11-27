import { Slot, Slottable } from '@radix-ui/react-slot';
import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Spinner } from '../Spinner/Spinner';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { visibilityAttributes } from '../../internal/responsive';
import type { ResponsiveVisibilityProps } from '../../internal/responsive';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>, ResponsiveVisibilityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables interaction and shows the loading indicator. */
  loading?: boolean;
  /** Accessible name for the loading indicator. */
  loadingLabel?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  fullWidth?: boolean;
  /** Render the child element instead of a `button`, forwarding all props to it. */
  asChild?: boolean;
  children?: ReactNode;
}

/** A token-driven action control with loading, slot and `asChild` support. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingLabel = 'Loading',
    leading,
    trailing,
    fullWidth = false,
    asChild = false,
    className,
    children,
    disabled = false,
    type = 'button',
    hiddenBelow,
    hiddenAbove,
    collapsedBelow,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;
  const classes = cn(
    styles.root,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    responsiveStyles.root,
    className,
  );
  const attributes = {
    'data-variant': variant,
    'data-size': size,
    'data-loading': loading || undefined,
    'data-disabled': isDisabled || undefined,
    ...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow }),
  };

  /** Compose the visual slots around the label supplied by the rendered element. */
  const renderContent = (label: ReactNode) => (
    <>
      {loading ? (
        <Spinner size="sm" label={loadingLabel} />
      ) : leading ? (
        <span className={styles.slot} aria-hidden="true">
          {leading}
        </span>
      ) : null}
      <span className={styles.label}>{label}</span>
      {!loading && trailing ? (
        <span className={styles.slot} aria-hidden="true">
          {trailing}
        </span>
      ) : null}
    </>
  );

  if (asChild) {
    return (
      <Slot
        ref={ref as Ref<HTMLElement>}
        className={classes}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        {...attributes}
        {...rest}
      >
        <Slottable child={children}>{renderContent}</Slottable>
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={classes}
      aria-busy={loading || undefined}
      {...attributes}
      {...rest}
    >
      {renderContent(children)}
    </button>
  );
});
