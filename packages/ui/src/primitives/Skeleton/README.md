# Skeleton

A non-interactive placeholder that reserves space while content loads.

## Import

```tsx
import { Skeleton } from '@simplify-dev/ui';
import type { SkeletonProps, SkeletonVariant } from '@simplify-dev/ui';
```

## Props

`SkeletonProps` extends `Omit<HTMLAttributes<HTMLDivElement>, 'children'>` and the shared responsive
visibility props. Standard div attributes except `children` are forwarded.

| Name             | Type                           | Default  | Description                                                                               |
| ---------------- | ------------------------------ | -------- | ----------------------------------------------------------------------------------------- |
| `variant`        | `'text' \| 'rect' \| 'circle'` | `'text'` | Shape of each placeholder; exposed as `data-variant`.                                     |
| `width`          | `string \| number`             | —        | Inline CSS `width` applied to the root.                                                   |
| `height`         | `string \| number`             | —        | Inline CSS `height` applied to the root.                                                  |
| `lines`          | `number`                       | `1`      | Number of placeholder rows when `variant="text"`; values are floored with a minimum of 1. |
| `animate`        | `boolean`                      | `true`   | Enables the pulse animation; exposed as `data-animate` and toggles the static class.      |
| `label`          | `string`                       | —        | Accessible status name. Supplying it switches the root to `role="status"`.                |
| `className`      | `string`                       | —        | Appended to the generated CSS Module classes.                                             |
| `style`          | `CSSProperties`                | —        | Merged after the generated `width`/`height` values.                                       |
| `hiddenBelow`    | `Breakpoint`                   | —        | Hide below the given breakpoint.                                                          |
| `hiddenAbove`    | `Breakpoint`                   | —        | Hide at and above the given breakpoint.                                                   |
| `collapsedBelow` | `Breakpoint`                   | —        | Allow the placeholder to shrink below the given breakpoint.                               |

## Shapes and states

- `text`: one or more full-width rows with a height of `var(--sd-font-size-md)`.
- `rect`: a rectangle with `min-height: 3rem` and a medium radius.
- `circle`: a square with `aspect-ratio: 1` and a full radius.
- With no `label`, the root is `aria-hidden="true"`. With a `label`, it becomes a `role="status"`
  region named by that label.
- `animate={false}` removes the pulse entirely; reduced-motion preferences also disable the pulse
  and set a fixed opacity.

## Responsive behavior

The three visibility flags are forwarded as `data-sd-*` attributes and handled by the shared CSS
media-query module. `width` and `height` accept any CSS length value or number, which can be used to
reserve exact layout space at each viewport.

## Accessibility

- Loading placeholders are hidden from assistive technology by default to avoid announcing
  decorative shapes repeatedly.
- Provide `label` when the loading state itself is meaningful, for example `"Loading registry
results"`. The element is then announced once as a status region.
- The component is never interactive and does not receive focus.

## Token dependencies

`--sd-color-surface-hover`, `--sd-spacing-2`, `--sd-font-size-md`, `--sd-radius-sm`,
`--sd-radius-md`, `--sd-radius-full`, `--sd-motion-duration-slow`,
`--sd-motion-duration-instant`, `--sd-motion-ease-standard`.

## Example

```tsx
import { Card, Skeleton, Stack } from '@simplify-dev/ui';

export function AssetCardSkeleton() {
  return (
    <Card>
      <Stack gap="3">
        <Skeleton variant="rect" height="7rem" label="Loading asset preview" />
        <Skeleton variant="text" lines={2} width="85%" />
        <Skeleton variant="text" width="45%" />
      </Stack>
    </Card>
  );
}
```
