import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { visibilityAttributes } from '../../internal/responsive';
import type { ResponsiveVisibilityProps } from '../../internal/responsive';
import styles from './Badge.module.css';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, ResponsiveVisibilityProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Render a leading status dot. */
  dot?: boolean;
}

/** Compact status or category label. */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  {
    variant = 'neutral',
    size = 'md',
    dot = false,
    className,
    children,
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
      data-variant={variant}
      data-size={size}
      className={cn(styles.root, styles[variant], styles[size], responsiveStyles.root, className)}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
      {...rest}
    >
      {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
      {children}
    </span>
  );
});
