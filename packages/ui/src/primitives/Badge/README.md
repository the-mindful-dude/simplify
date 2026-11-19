# Badge

A compact status or category label with optional status dot.

## Import

```tsx
import { Badge } from '@simplify-dev/ui';
import type { BadgeProps, BadgeSize, BadgeVariant } from '@simplify-dev/ui';
```

## Props

`BadgeProps` extends `HTMLAttributes<HTMLSpanElement>` and the shared responsive visibility props.
Standard span attributes (`title`, `aria-*`, event handlers, and so on) are forwarded.

| Name             | Type                                                        | Default     | Description                                                        |
| ---------------- | ----------------------------------------------------------- | ----------- | ------------------------------------------------------------------ |
| `variant`        | `'neutral' \| 'success' \| 'warning' \| 'danger' \| 'info'` | `'neutral'` | Semantic color role; exposed as `data-variant`.                    |
| `size`           | `'sm' \| 'md'`                                              | `'md'`      | Padding and font size; exposed as `data-size`.                     |
| `dot`            | `boolean`                                                   | `false`     | Renders a leading status dot that inherits the current text color. |
| `className`      | `string`                                                    | —           | Appended to the generated CSS Module classes.                      |
| `hiddenBelow`    | `Breakpoint`                                                | —           | Hide below the given breakpoint.                                   |
| `hiddenAbove`    | `Breakpoint`                                                | —           | Hide at and above the given breakpoint.                            |
| `collapsedBelow` | `Breakpoint`                                                | —           | Allow the badge to shrink below the given breakpoint.              |

## Variants and sizes

- **Variants:** `neutral` (muted surface), `success`, `warning`, `danger`, and `info`. Each status
  variant uses a matching `/surface` token pair for background and border with the solid status
  token for text.
- **Sizes:** `sm` and `md`.
- **Dot:** when `dot` is true, a small circle is rendered before the label using `currentColor`,
  so it always matches the active variant's foreground.

## Responsive behavior

`hiddenBelow`, `hiddenAbove`, and `collapsedBelow` are emitted as `data-sd-*` attributes and applied
by the shared responsive CSS media queries, with no JavaScript viewport tracking.

## Accessibility

- Renders a non-interactive `<span>`; it is not focusable and has no implicit role. If the badge
  conveys state that must be announced, supply an explicit `aria-label` or visible adjacent text.
- The decorative status dot is `aria-hidden="true"` because the variant and label already carry the
  meaning.
- Color is not the only signal by default: pair the badge with a text label rather than relying on
  the dot color alone.

## Token dependencies

`--sd-color-border`, `--sd-color-accent-muted`, `--sd-color-foreground-muted`,
`--sd-color-success`, `--sd-color-success-surface`, `--sd-color-warning`,
`--sd-color-warning-surface`, `--sd-color-danger`, `--sd-color-danger-surface`,
`--sd-color-info`, `--sd-color-info-surface`, `--sd-spacing-0`, `--sd-spacing-1`,
`--sd-spacing-2`, `--sd-spacing-3`, `--sd-radius-full`, `--sd-font-family-sans`,
`--sd-font-size-xs`, `--sd-font-size-sm`, `--sd-font-weight-medium`,
`--sd-font-leading-tight`.

## Example

```tsx
import { Badge, Stack } from '@simplify-dev/ui';

export function AssetStatus({ verified }: { verified: boolean }) {
  return (
    <Stack direction="row" gap="2">
      <Badge variant={verified ? 'success' : 'warning'} dot>
        {verified ? 'Verified' : 'Community'}
      </Badge>
      <Badge variant="neutral" hiddenBelow="md">
        v1.4.0
      </Badge>
    </Stack>
  );
}
```
