# SplitView

A two-pane layout that stacks below a chosen breakpoint and supports responsive flex ratios.

## Import

```tsx
import { SplitView } from '@simplify-dev/ui';
import type { SplitRatio, SplitViewProps, SplitViewSideProps } from '@simplify-dev/ui';
```

The side component is available as `SplitView.Side` and as the named export `SplitViewSide`.

## Props

`SplitViewProps` extends `Omit<HTMLAttributes<HTMLDivElement>, 'children'>` and the shared responsive
visibility props.

| Name              | Type                                            | Default   | Description                                                                    |
| ----------------- | ----------------------------------------------- | --------- | ------------------------------------------------------------------------------ |
| `ratio`           | `SplitRatio \| ResponsiveValue<SplitRatio>`     | `[1, 1]`  | Two flex weights, emitted as `<start>fr <end>fr`; optionally overridden per breakpoint. |
| `splitAt`         | `Breakpoint`                                    | `'md'`    | Minimum breakpoint at which the two sides render side by side.                  |
| `reverseOnMobile` | `boolean`                                       | `false`   | Swaps the first side to the end while the layout is still stacked.              |
| `gap`             | `SpacingValue \| ResponsiveValue<SpacingValue>` | `'4'`     | Gap between the two panes; optionally overridden per breakpoint.                |
| `children`        | `ReactNode`                                     | —         | Typically two `SplitView.Side` elements.                                        |
| `className`       | `string`                                        | —         | Appended to the generated CSS Module classes.                                   |
| `style`           | `CSSProperties`                                 | —         | Merged after the generated custom properties.                                   |
| `hiddenBelow`     | `Breakpoint`                                    | —         | Hide below the given breakpoint.                                                |
| `hiddenAbove`     | `Breakpoint`                                    | —         | Hide at and above the given breakpoint.                                         |
| `collapsedBelow`  | `Breakpoint`                                    | —         | Allow the layout to shrink below the given breakpoint.                          |

`SplitRatio` is a readonly tuple `[number, number]`. `SplitViewSideProps` extends
`HTMLAttributes<HTMLDivElement>` and the shared responsive visibility props, so each side can carry
its own `hiddenBelow`, `hiddenAbove`, and `collapsedBelow` flags.

## Layout behavior

- Below `splitAt`, the container uses a single `minmax(0, 1fr)` column and stacks the children.
- At and above `splitAt`, `grid-template-columns` uses the resolved ratio (default `1fr 1fr`).
- `reverseOnMobile` applies `order: 2` to the first `.side` child only below `splitAt`.
- `ratio` and `gap` accept responsive value objects, so both can change per breakpoint. Values are
  written as `--sd-split-cols`, `--sd-split-cols-<bp>`, `--sd-split-gap`, and
  `--sd-split-gap-<bp>`.
- `data-split-at` and `data-reverse-on-mobile` mirror the configuration for styling and tests.

## Responsive behavior

All breakpoint behavior is CSS-driven through media queries and custom properties; no resize
listeners are registered. Breakpoints are `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, and
`2xl` 1536px, matching the token scale.

## Accessibility

SplitView renders plain `<div>` elements and adds no roles. Use it to arrange content, and put
semantic structure inside each `SplitView.Side`. The `reverseOnMobile` option changes visual order
only; it does not change DOM order, so keyboard and screen-reader order remain the document order.
Avoid using it when visual order must match a meaningful reading sequence.

## Token dependencies

`--sd-spacing-4` (fallback gap), plus the spacing steps supplied through `gap`, and the shared
responsive visibility module. No color or typography tokens are used by this component.

## Example

```tsx
import { Card, SplitView } from '@simplify-dev/ui';

export function CatalogLayout() {
  return (
    <SplitView
      ratio={{ base: [1, 1], md: [3, 7] }}
      gap={{ base: '3', lg: '6' }}
      splitAt="md"
      reverseOnMobile
    >
      <SplitView.Side>
        <Card>Filters</Card>
      </SplitView.Side>
      <SplitView.Side>
        <Card>Asset results</Card>
      </SplitView.Side>
    </SplitView>
  );
}
```
