import { forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { visibilityAttributes } from '../../internal/responsive';
import type { ResponsiveVisibilityProps } from '../../internal/responsive';
import styles from './Skeleton.module.css';

export type SkeletonVariant = 'text' | 'rect' | 'circle';

export interface SkeletonProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'>, ResponsiveVisibilityProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  /** Number of placeholder rows when `variant="text"`. */
  lines?: number;
  animate?: boolean;
  /** Announce the loading placeholder to assistive technology. */
  label?: string;
}

/** A non-interactive placeholder that reserves space while content loads. */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  {
    variant = 'text',
    width,
    height,
    lines = 1,
    animate = true,
    label,
    className,
    style,
    hiddenBelow,
    hiddenAbove,
    collapsedBelow,
    ...rest
  },
  ref,
) {
  const inlineStyle: CSSProperties = {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...style,
  };
  const lineCount = variant === 'text' ? Math.max(1, Math.floor(lines)) : 1;

  return (
    <div
      ref={ref}
      role={label === undefined ? undefined : 'status'}
      aria-label={label}
      aria-hidden={label === undefined ? true : undefined}
      data-variant={variant}
      data-animate={animate || undefined}
      className={cn(styles.root, responsiveStyles.root, className)}
      style={inlineStyle}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
      {...rest}
    >
      {Array.from({ length: lineCount }, (_, index) => (
        <span
          key={index}
          className={cn(styles.shape, styles[variant], !animate && styles.static)}
        />
      ))}
    </div>
  );
});
