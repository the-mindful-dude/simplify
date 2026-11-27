import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { visibilityAttributes } from '../../internal/responsive';
import type { ResponsiveVisibilityProps } from '../../internal/responsive';
import styles from './Separator.module.css';

export interface SeparatorProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'content'>, ResponsiveVisibilityProps {
  orientation?: 'horizontal' | 'vertical';
  /** Decorative separators are hidden from assistive technology. */
  decorative?: boolean;
}

/** A themed divider between adjacent content. */
export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(function Separator(
  {
    orientation = 'horizontal',
    decorative = true,
    className,
    role,
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
      role={decorative ? 'none' : (role ?? 'separator')}
      aria-orientation={decorative ? undefined : orientation}
      data-orientation={orientation}
      className={cn(styles.root, styles[orientation], responsiveStyles.root, className)}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
      {...rest}
    />
  );
});
