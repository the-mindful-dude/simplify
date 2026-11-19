import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { visibilityAttributes } from '../../internal/responsive';
import type { ResponsiveVisibilityProps } from '../../internal/responsive';
import styles from './Spinner.module.css';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement>, ResponsiveVisibilityProps {
  /** Visual size of the indicator. */
  size?: SpinnerSize;
  /** Accessible name announced while the indicator is visible. */
  label?: string;
}

/** An indeterminate loading indicator with a reduced-motion static fallback. */
export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner(
  {
    size = 'md',
    label = 'Loading',
    className,
    role = 'status',
    hiddenBelow,
    hiddenAbove,
    collapsedBelow,
    ...rest
  },
  ref,
) {
  return (
    <span
      ref={ref}
      role={role}
      aria-label={label}
      data-size={size}
      className={cn(styles.root, styles[size], responsiveStyles.root, className)}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
      {...rest}
    />
  );
});
