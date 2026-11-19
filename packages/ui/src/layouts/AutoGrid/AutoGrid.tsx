import { Children, forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../internal/cn';
import responsiveStyles from '../../internal/responsive.module.css';
import { responsiveVarsFrom, spacingVars, visibilityAttributes } from '../../internal/responsive';
import type {
  ResponsiveValue,
  ResponsiveVisibilityProps,
  SpacingValue,
} from '../../internal/responsive';
import styles from './AutoGrid.module.css';

export type ColumnCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface AutoGridProps extends HTMLAttributes<HTMLDivElement>, ResponsiveVisibilityProps {
  children?: ReactNode;
  /** Column count, optionally overridden per breakpoint. */
  columns?: ColumnCount | ResponsiveValue<ColumnCount>;
  gap?: SpacingValue | ResponsiveValue<SpacingValue>;
  /** `fixed` uses `columns`; `fit` fills each row with items of at least `minItemWidth`. */
  mode?: 'fixed' | 'fit';
  minItemWidth?: string;
  /** Force the empty state even when children are present. */
  isEmpty?: boolean;
  emptyState?: ReactNode;
  autoRows?: CSSProperties['gridAutoRows'];
}

export interface AutoGridItemProps
  extends HTMLAttributes<HTMLDivElement>, ResponsiveVisibilityProps {
  children?: ReactNode;
  /** Number of columns this item spans, optionally overridden per breakpoint. */
  span?: ColumnCount | ResponsiveValue<ColumnCount>;
}

export const AutoGridItem = forwardRef<HTMLDivElement, AutoGridItemProps>(function AutoGridItem(
  { span, className, style, hiddenBelow, hiddenAbove, collapsedBelow, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(styles.item, responsiveStyles.root, className)}
      style={{ ...responsiveVarsFrom('--sd-grid-span', span, String), ...style }}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
      {...rest}
    />
  );
});

const AutoGridRoot = forwardRef<HTMLDivElement, AutoGridProps>(function AutoGrid(
  {
    children,
    columns = 1,
    gap = '4',
    mode = 'fixed',
    minItemWidth,
    isEmpty = false,
    emptyState,
    autoRows,
    className,
    style,
    hiddenBelow,
    hiddenAbove,
    collapsedBelow,
    ...rest
  },
  ref,
) {
  const showEmpty = isEmpty || (emptyState !== undefined && Children.count(children) === 0);

  return (
    <div
      ref={ref}
      data-mode={mode}
      data-empty={showEmpty || undefined}
      className={cn(styles.root, styles[mode], responsiveStyles.root, className)}
      style={{
        ...responsiveVarsFrom('--sd-grid-columns', columns, String),
        ...spacingVars('--sd-grid-gap', gap),
        ...(minItemWidth !== undefined ? { '--sd-grid-min-width': minItemWidth } : {}),
        ...(autoRows !== undefined ? { gridAutoRows: autoRows } : {}),
        ...style,
      }}
      {...visibilityAttributes({ hiddenBelow, hiddenAbove, collapsedBelow })}
      {...rest}
    >
      {showEmpty ? (
        <div role="status" className={styles.empty}>
          {emptyState}
        </div>
      ) : (
        children
      )}
    </div>
  );
});

/** A responsive grid with a typed column API and an explicit empty state. */
export const AutoGrid = Object.assign(AutoGridRoot, { Item: AutoGridItem });
