# Stack

A one-dimensional flex layout with responsive direction and gap.

## Import

```tsx
import { Stack } from '@simplify-dev/ui';
import type { StackAlign, StackDirection, StackJustify, StackProps } from '@simplify-dev/ui';
```

## Props

`StackProps` extends `HTMLAttributes<HTMLDivElement>` and the shared responsive visibility props.

| Name             | Type                                                          | Default     | Description                                                                    |
| ---------------- | ------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| `direction`      | `StackDirection \| ResponsiveValue<StackDirection>`           | `'column'`  | Flex direction; optionally overridden per breakpoint.                           |
| `gap`            | `SpacingValue \| ResponsiveValue<SpacingValue>`               | `'4'`       | Gap between children; optionally overridden per breakpoint.                    |
| `align`          | `'start' \| 'center' \| 'end' \| 'stretch' \| 'baseline'`      | `'stretch'` | Cross-axis alignment, applied at all breakpoints.                              |
| `justify`        | `'start' \| 'center' \| 'end' \| 'between' \| 'around' \| 'evenly'` | `'start'` | Main-axis distribution, applied at all breakpoints.                     |
| `wrap`           | `boolean`                                                     | `false`     | Enables `flex-wrap: wrap`.                                                     |
| `divider`        | `boolean`                                                     | `false`     | Inserts a themed divider between adjacent children.                            |
| `className`      | `string`                                                      | —           | Appended to the generated CSS Module classes.                                  |
| `style`          | `CSSProperties`                                               | —           | Merged after the generated custom properties.                                  |
| `hiddenBelow`    | `Breakpoint`                                                  | —           | Hide below the given breakpoint.                                               |
| `hiddenAbove`    | `Breakpoint`                                                  | —           | Hide at and above the given breakpoint.                                        |
| `collapsedBelow` | `Breakpoint`                                                  | —           | Allow the stack to shrink below the given breakpoint.                          |

`StackDirection` is `'row' | 'column'`.

## Alignment and dividers

- `align` maps directly to `align-items`; `justify` maps to `justify-content`.
- With `divider`, each child after the first receives a border and padding along the base
  direction: a top border for `column`, or a left border for `row`. The axis is taken from the base
  direction (the scalar value, or `direction.base`), so per-breakpoint direction changes do not
  flip the divider axis.
- `data-align`, `data-justify`, `data-wrap`, `data-divider`, and `data-divider-axis` mirror the
  resolved state.

## Responsive behavior

`direction` and `gap` accept responsive value objects. A scalar direction becomes
`--sd-stack-direction`; per-breakpoint values become `--sd-stack-direction-<bp>`. Gap values map to
`--sd-stack-gap` and `--sd-stack-gap-<bp>`. The CSS module resolves each breakpoint from `2xl` down
to `base`, so unspecified breakpoints inherit the next smaller value. Breakpoints are `sm` 640px,
`md` 768px, `lg` 1024px, `xl` 1280px, and `2xl` 1536px. No JavaScript viewport tracking is used.

## Accessibility

Stack is a layout-only `<div>` with no roles or focus behavior. When `divider` is used for visual
grouping, ensure the grouping is also conveyed semantically (for example, by list semantics or
headings). Changing `direction` per breakpoint affects visual order only, not DOM order.

## Token dependencies

`--sd-spacing-4` (default gap and divider padding), plus the spacing steps supplied through `gap`,
and `--sd-color-border` for dividers. The shared responsive visibility module supplies the
breakpoint flags.

## Example

```tsx
import { Badge, Stack, Text } from '@simplify-dev/ui';

export function AssetMeta({ category, version }: { category: string; version: string }) {
  return (
    <Stack direction={{ base: 'column', md: 'row' }} gap="2" align="center" divider>
      <Badge variant="neutral">{category}</Badge>
      <Text as="span" variant="label" tone="muted">
        {version}
      </Text>
    </Stack>
  );
}
```
