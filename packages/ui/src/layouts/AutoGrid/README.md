# AutoGrid

A responsive grid with a typed column API, optional item spans, and an explicit empty state.

## Import

```tsx
import { AutoGrid } from '@simplify-dev/ui';
import type { AutoGridItemProps, AutoGridProps, ColumnCount } from '@simplify-dev/ui';
```

The item component is available as `AutoGrid.Item` and as the named export `AutoGridItem`.

## Props

`AutoGridProps` extends `HTMLAttributes<HTMLDivElement>` and the shared responsive visibility props.

| Name             | Type                                            | Default   | Description                                                                      |
| ---------------- | ----------------------------------------------- | --------- | -------------------------------------------------------------------------------- |
| `columns`        | `ColumnCount \| ResponsiveValue<ColumnCount>`   | `1`       | Number of equal columns; optionally overridden per breakpoint.                   |
| `gap`            | `SpacingValue \| ResponsiveValue<SpacingValue>` | `'4'`     | Grid gap; optionally overridden per breakpoint.                                  |
| `mode`           | `'fixed' \| 'fit'`                              | `'fixed'` | `fixed` uses `columns`; `fit` fills each row with items at least `minItemWidth`. |
| `minItemWidth`   | `string`                                        | `'16rem'` | Minimum item width in `fit` mode, set through `--sd-grid-min-width`.             |
| `isEmpty`        | `boolean`                                       | `false`   | Forces the empty state even when children are present.                           |
| `emptyState`     | `ReactNode`                                     | —         | Content shown in the empty state. With no children, its presence triggers it.    |
| `autoRows`       | `CSSProperties['gridAutoRows']`                 | —         | Native `grid-auto-rows` value.                                                   |
| `children`       | `ReactNode`                                     | —         | Grid children; use `AutoGrid.Item` for responsive spans.                         |
| `className`      | `string`                                        | —         | Appended to the generated CSS Module classes.                                    |
| `style`          | `CSSProperties`                                 | —         | Merged after the generated custom properties.                                    |
| `hiddenBelow`    | `Breakpoint`                                    | —         | Hide below the given breakpoint.                                                 |
| `hiddenAbove`    | `Breakpoint`                                    | —         | Hide at and above the given breakpoint.                                          |
| `collapsedBelow` | `Breakpoint`                                    | —         | Allow the grid to shrink below the given breakpoint.                             |

`ColumnCount` is the integer union `1` through `12`.

`AutoGridItemProps` extends `HTMLAttributes<HTMLDivElement>` and the shared responsive visibility
props, with one additional prop:

| Name   | Type                                          | Default | Description                                              |
| ------ | --------------------------------------------- | ------- | -------------------------------------------------------- |
| `span` | `ColumnCount \| ResponsiveValue<ColumnCount>` | `1`     | Columns spanned by this item; optionally per breakpoint. |

## Grid modes and states

- `fixed`: `grid-template-columns: repeat(var(--sd-grid-columns), minmax(0, 1fr))`.
- `fit`: `repeat(auto-fit, minmax(var(--sd-grid-min-width), 1fr))`, ignoring `columns`.
- The empty state is shown when `isEmpty` is true or when `emptyState` is supplied and there are no
  children. It renders a `role="status"` region spanning the full grid row with a dashed border.
- `data-mode` and `data-empty` mirror the current mode and empty state.

## Responsive behavior

`columns`, `gap`, and item `span` accept responsive value objects. Scalar values become
`--sd-grid-columns`, `--sd-grid-gap`, or `--sd-grid-span`; overrides become suffixed variants such as
`--sd-grid-columns-md`. Breakpoint widths are `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, and
`2xl` 1536px. All behavior is CSS-driven; there are no viewport listeners.

## Accessibility

- The grid itself is a plain `<div>` with no implicit role. Use a semantic container or list where
  the content calls for one.
- The empty state uses `role="status"`, so a change into the empty state is announced.
- Because spans change only visual placement, DOM order remains the reading and keyboard order.

## Token dependencies

`--sd-spacing-4` (fallback gap), plus the spacing steps supplied through `gap`;
`--sd-color-border`, `--sd-radius-md`, `--sd-color-foreground-muted`, `--sd-font-family-sans`, and
`--sd-font-size-sm` for the empty state; and the shared responsive visibility module.

## Example

```tsx
import { AutoGrid, Card, Text } from '@simplify-dev/ui';

export function AssetGrid({ names }: { names: string[] }) {
  return (
    <AutoGrid
      columns={{ base: 1, md: 2, xl: 3 }}
      gap={{ base: '3', lg: '6' }}
      emptyState={<Text tone="muted">No assets match this filter.</Text>}
    >
      {names.map((name) => (
        <AutoGrid.Item key={name} span={{ base: 1, xl: 2 }}>
          <Card>{name}</Card>
        </AutoGrid.Item>
      ))}
    </AutoGrid>
  );
}
```
