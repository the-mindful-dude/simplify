import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import {
  breakpointSuffix,
  responsiveVarsFrom,
  spacingVars,
  visibilityAttributes,
} from '../../internal/responsive';
import type {
  Breakpoint,
  ResponsiveValue,
  ResponsiveVisibilityProps,
  SpacingValue,
} from '../../internal/responsive';
import styles from './SplitView.module.css';

export type SplitRatio = readonly [number, number];

export interface SplitViewProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'>, ResponsiveVisibilityProps {
  children?: ReactNode;
  /** Flex weights of the two sides, optionally overridden per breakpoint. */
  ratio?: SplitRatio | ResponsiveValue<SplitRatio>;
  /** Breakpoint at which the two sides are shown side by side. */
  splitAt?: Breakpoint;
  /** Swap side order while the layout is stacked. */
  reverseOnMobile?: boolean;
  gap?: SpacingValue | ResponsiveValue<SpacingValue>;
}

export interface SplitViewSideProps
  extends HTMLAttributes<HTMLDivElement>, ResponsiveVisibilityProps {
  children?: ReactNode;
}

export const SplitViewSide = forwardRef<HTMLDivElement, SplitViewSideProps>(function SplitViewSide(
  { className, hiddenBelow, hiddenAbove, collapsedBelow, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(styles.side, responsiveStyles.root, className)}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
      {...rest}
    />
  );
});

const SplitViewRoot = forwardRef<HTMLDivElement, SplitViewProps>(function SplitView(
  {
    children,
    ratio = [1, 1],
    splitAt = 'md',
    reverseOnMobile = false,
    gap = '4',
    className,
    style,
    hiddenBelow,
    hiddenAbove,
    collapsedBelow,
    ...rest
  },
  ref,
) {
  const suffix = breakpointSuffix(splitAt);

  return (
    <div
      ref={ref}
      data-split-at={splitAt}
      data-reverse-on-mobile={reverseOnMobile || undefined}
      className={cn(
        styles.root,
        styles[`splitAt${suffix}`],
        reverseOnMobile && styles[`reverse${suffix}`],
        responsiveStyles.root,
        className,
      )}
      style={{
        ...responsiveVarsFrom('--sd-split-cols', ratio, ([start, end]) => `${start}fr ${end}fr`),
        ...spacingVars('--sd-split-gap', gap),
        ...style,
      }}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
      {...rest}
    >
      {children}
    </div>
  );
});

/** A two-pane layout that stacks below `splitAt` and supports responsive ratios. */
export const SplitView = Object.assign(SplitViewRoot, { Side: SplitViewSide });
