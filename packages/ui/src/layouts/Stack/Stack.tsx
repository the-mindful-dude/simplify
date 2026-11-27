import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { responsiveVars, spacingVars, visibilityAttributes } from '../../internal/responsive';
import type {
  ResponsiveValue,
  ResponsiveVisibilityProps,
  SpacingValue,
} from '../../internal/responsive';
import styles from './Stack.module.css';

export type StackDirection = 'row' | 'column';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export interface StackProps extends HTMLAttributes<HTMLDivElement>, ResponsiveVisibilityProps {
  /** Flex direction, optionally overridden per breakpoint. */
  direction?: StackDirection | ResponsiveValue<StackDirection>;
  gap?: SpacingValue | ResponsiveValue<SpacingValue>;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
  /** Insert a themed divider between adjacent children. */
  divider?: boolean;
}

/** A one-dimensional flex layout with responsive direction and gap. */
export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  {
    direction = 'column',
    gap = '4',
    align = 'stretch',
    justify = 'start',
    wrap = false,
    divider = false,
    className,
    style,
    hiddenBelow,
    hiddenAbove,
    collapsedBelow,
    ...rest
  },
  ref,
) {
  const baseDirection = typeof direction === 'string' ? direction : (direction.base ?? 'column');

  return (
    <div
      ref={ref}
      data-align={align}
      data-justify={justify}
      data-wrap={wrap || undefined}
      data-divider={divider || undefined}
      data-divider-axis={baseDirection}
      className={cn(
        styles.root,
        wrap && styles.wrap,
        divider && styles.divider,
        responsiveStyles.root,
        className,
      )}
      style={{
        ...responsiveVars('--sd-stack-direction', direction),
        ...spacingVars('--sd-stack-gap', gap),
        ...style,
      }}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
      {...rest}
    />
  );
});
