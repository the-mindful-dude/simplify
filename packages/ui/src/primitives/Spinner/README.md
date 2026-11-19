# Spinner

An indeterminate loading indicator with a static fallback for reduced-motion users.

## Import

```tsx
import { Spinner } from '@simplify-dev/ui';
import type { SpinnerProps, SpinnerSize } from '@simplify-dev/ui';
```

## Props

`SpinnerProps` extends `HTMLAttributes<HTMLSpanElement>` and the shared responsive visibility props.
Standard span attributes are forwarded.

| Name             | Type                     | Default      | Description                                                                    |
| ---------------- | ------------------------ | ------------ | ------------------------------------------------------------------------------ |
| `size`           | `'sm' \| 'md' \| 'lg'`   | `'md'`       | Visual size (`0.75rem`, `1rem`, or `1.5rem`); exposed as `data-size`.            |
| `label`          | `string`                 | `'Loading'`  | Accessible name announced while the indicator is visible.                      |
| `role`           | `string`                 | `'status'`   | Override to make the indicator decorative, for example `role="presentation"`.   |
| `className`      | `string`                 | —            | Appended to the generated CSS Module classes.                                   |
| `hiddenBelow`    | `Breakpoint`             | —            | Hide below the given breakpoint.                                                |
| `hiddenAbove`    | `Breakpoint`             | —            | Hide at and above the given breakpoint.                                         |
| `collapsedBelow` | `Breakpoint`             | —            | Allow the indicator to shrink below the given breakpoint.                       |

## Sizes and states

- `sm` uses a `0.75rem` circle, `md` uses `1rem`, and `lg` uses `1.5rem` with a thicker border.
- The rotation animation runs continuously. Under `prefers-reduced-motion: reduce` the animation is
  removed, leaving a static ring.

## Responsive behavior

The three visibility flags are emitted as `data-sd-*` attributes and resolved by the shared CSS
media-query module.

## Accessibility

- Renders with `role="status"` and `aria-label={label}` by default, so the loading state is
  announced and can be queried by name.
- When another element already communicates the pending state, set `role="presentation"` and an
  empty `label` to make the spinner decorative.
- Button uses this component internally with a small size and the caller's `loadingLabel`.

## Token dependencies

`--sd-color-border-strong`, `--sd-color-accent`, `--sd-radius-full`, `--sd-motion-duration-slow`.

## Example

```tsx
import { Spinner, Text } from '@simplify-dev/ui';

export function PendingState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Spinner size="sm" label="Fetching assets" />
      <Text as="span" tone="muted">
        Fetching assets
      </Text>
    </div>
  );
}
```
