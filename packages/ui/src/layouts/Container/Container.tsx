import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { spacingVars, visibilityAttributes } from '../../internal/responsive';
import type {
  ResponsiveValue,
  ResponsiveVisibilityProps,
  SpacingValue,
} from '../../internal/responsive';
import styles from './Container.module.css';

export type ContainerSize = 'sm' | 'md' | 'lg' | 'full';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement>, ResponsiveVisibilityProps {
  /** Maximum content width. */
  size?: ContainerSize;
  /** Inline padding, optionally overridden per breakpoint. */
  padding?: SpacingValue | ResponsiveValue<SpacingValue>;
  /** Center the content column inside the viewport. */
  center?: boolean;
}

/** A width-constrained content column with responsive inline padding. */
export const Container = forwardRef<HTMLDivElement, ContainerProps>(function Container(
  {
    size = 'lg',
    padding = '4',
    center = true,
    className,
    style,
    hiddenBelow,
    hiddenAbove,
    collapsedBelow,
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      data-size={size}
      className={cn(
        styles.root,
        styles[size],
        center && styles.center,
        responsiveStyles.root,
        className,
      )}
      style={{ ...spacingVars('--sd-container-padding', padding), ...style }}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
      {...rest}
    />
  );
});
