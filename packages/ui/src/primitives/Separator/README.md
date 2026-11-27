# Separator

A themed divider for placing between adjacent content, either horizontal or vertical.

## Import

```tsx
import { Separator } from '@simplify-dev/ui';
import type { SeparatorProps } from '@simplify-dev/ui';
```

## Props

`SeparatorProps` extends `Omit<HTMLAttributes<HTMLDivElement>, 'content'>` and the shared responsive
visibility props. Standard div attributes are forwarded.

| Name             | Type                         | Default        | Description                                                                            |
| ---------------- | ---------------------------- | -------------- | -------------------------------------------------------------------------------------- |
| `orientation`    | `'horizontal' \| 'vertical'` | `'horizontal'` | Divider axis; exposed as `data-orientation` and, when semantic, as `aria-orientation`. |
| `decorative`     | `boolean`                    | `true`         | When true, sets `role="none"` and hides the divider from assistive technology.         |
| `role`           | `string`                     | —              | Used only when `decorative={false}`; defaults to `'separator'` in that case.           |
| `className`      | `string`                     | —              | Appended to the generated CSS Module classes.                                          |
| `hiddenBelow`    | `Breakpoint`                 | —              | Hide below the given breakpoint.                                                       |
| `hiddenAbove`    | `Breakpoint`                 | —              | Hide at and above the given breakpoint.                                                |
| `collapsedBelow` | `Breakpoint`                 | —              | Allow the divider to shrink below the given breakpoint.                                |

## Orientation

- `horizontal` renders a full-width, `1px` tall rule.
- `vertical` renders a `1px` wide rule that stretches to its container with a minimum height of
  `1rem`.

## Responsive behavior

The three visibility flags are emitted as `data-sd-*` attributes and resolved by the shared CSS
media-query module. Separator has no responsive value-object props.

## Accessibility

- By default `decorative` is true and the element receives `role="none"`, so it is ignored by
  assistive technology.
- Set `decorative={false}` when the divider communicates a real grouping boundary. It then uses
  `role="separator"` (or the supplied `role`) and advertises `aria-orientation`.
- A vertical separator inside a flex row should sit between focusable or labeled regions so its
  grouping meaning is clear.

## Token dependencies

`--sd-color-border`.

## Example

```tsx
import { Separator, Stack, Text } from '@simplify-dev/ui';

export function SectionDivider() {
  return (
    <Stack direction="row" align="center" gap="3">
      <Text as="span" tone="muted">
        Registry
      </Text>
      <Separator orientation="vertical" decorative={false} />
      <Text as="span" tone="muted">
        Assets
      </Text>
    </Stack>
  );
}
```
