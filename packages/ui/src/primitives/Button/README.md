# Button

A token-driven action control with loading, slot, and `asChild` support.

## Import

```tsx
import { Button } from '@simplify-dev/ui';
import type { ButtonProps, ButtonSize, ButtonVariant } from '@simplify-dev/ui';
```

## Props

`ButtonProps` extends `Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>` and the shared
responsive visibility props. All native button attributes (`onClick`, `name`, `value`, `form`,
`aria-*`, and so on) are forwarded to the rendered element.

| Name            | Type                                                              | Default     | Description                                                                                       |
| --------------- | ----------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `variant`       | `'primary' \| 'secondary' \| 'ghost' \| 'outline' \| 'destructive'` | `'primary'` | Visual treatment. Exposed as `data-variant`.                                                       |
| `size`          | `'sm' \| 'md' \| 'lg'`                                             | `'md'`      | Control height and text size. Exposed as `data-size`.                                              |
| `loading`       | `boolean`                                                         | `false`     | Sets `disabled`, sets `aria-busy`, and replaces the leading slot with a small `Spinner`.            |
| `loadingLabel`  | `string`                                                          | `'Loading'` | Accessible name passed to the loading `Spinner`.                                                   |
| `leading`       | `ReactNode`                                                       | —           | Content before the label; wrapped in `aria-hidden` so it is not announced twice.                    |
| `trailing`      | `ReactNode`                                                       | —           | Content after the label; wrapped in `aria-hidden`. Hidden while `loading` is true.                  |
| `fullWidth`     | `boolean`                                                         | `false`     | Sets the control width to `100%`.                                                                  |
| `asChild`       | `boolean`                                                         | `false`     | Renders the single child element via Radix `Slot`, forwarding classes, data attributes and props.   |
| `children`      | `ReactNode`                                                       | —           | Label content. With `asChild`, the child element itself is rendered.                                |
| `className`     | `string`                                                          | —           | Appended to the generated CSS Module classes.                                                      |
| `disabled`      | `boolean`                                                         | `false`     | Prevents interaction. `loading` also forces the disabled state.                                    |
| `type`          | `'button' \| 'submit' \| 'reset'`                                  | `'button'`  | Native button type.                                                                                |
| `hiddenBelow`   | `Breakpoint`                                                      | —           | Hide below the given breakpoint width. See [Responsive behavior](#responsive-behavior).            |
| `hiddenAbove`   | `Breakpoint`                                                      | —           | Hide at and above the given breakpoint width.                                                      |
| `collapsedBelow`| `Breakpoint`                                                      | —           | Allow the control to shrink below the given breakpoint.                                            |

`Breakpoint` is one of `sm`, `md`, `lg`, `xl`, `2xl`.

## Variants, sizes, and states

- **Variants:** `primary` (accent fill), `secondary` (raised surface with border), `ghost`
  (transparent, muted text), `outline` (transparent, strong border), and `destructive`
  (danger fill).
- **Sizes:** `sm` (min-height `1.75rem`), `md` (`2.25rem`), and `lg` (`2.75rem`).
- **States:** hover styles are applied for `:not(:disabled)`. The disabled state uses `opacity:
  0.55` and `cursor: not-allowed`; the loading state uses `cursor: progress`. `data-loading` and
  `data-disabled` attributes mirror the React state for styling.

## Responsive behavior

`hiddenBelow`, `hiddenAbove`, and `collapsedBelow` are emitted as `data-sd-hidden-below`,
`data-sd-hidden-above`, and `data-sd-collapsed-below` attributes. The shared responsive CSS module
drives them with media queries, so no viewport listener or JavaScript state is involved. This is a
scalar-only API on Button; responsive value objects are used by the layout components.

## Accessibility

- Renders a native `<button>` by default, so keyboard activation, focus, and form semantics come
  from the platform. `type` defaults to `'button'` to avoid accidental form submission.
- `loading` sets `disabled` and `aria-busy="true"`, and renders a `role="status"` spinner named by
  `loadingLabel`.
- `leading` and `trailing` are `aria-hidden="true"` because they are decorative relative to the
  text label.
- With `asChild`, `aria-busy` and `aria-disabled` are placed on the forwarded element. The consumer
  is responsible for making that element interactive (for example, an `<a href>`).
- A visible `:focus-visible` outline uses the focus token. Transitions and the active transform are
  removed under `prefers-reduced-motion: reduce`.

## Token dependencies

`--sd-color-accent`, `--sd-color-accent-hover`, `--sd-color-accent-muted`,
`--sd-color-foreground`, `--sd-color-foreground-on-accent`, `--sd-color-foreground-muted`,
`--sd-color-surface-raised`, `--sd-color-surface-hover`, `--sd-color-border`,
`--sd-color-border-strong`, `--sd-color-border-focus`, `--sd-color-danger`,
`--sd-color-danger-surface`, `--sd-spacing-1`, `--sd-spacing-2`, `--sd-spacing-3`,
`--sd-spacing-4`, `--sd-spacing-5`, `--sd-radius-md`, `--sd-font-family-sans`,
`--sd-font-size-xs/sm/md`, `--sd-font-weight-medium`, `--sd-font-leading-tight`,
`--sd-motion-duration-fast`, `--sd-motion-duration-instant`, `--sd-motion-ease-standard`. The
loading spinner additionally uses the Spinner token set.

## Example

```tsx
import { Button, Stack } from '@simplify-dev/ui';

export function SaveActions({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <Stack direction="row" gap="2">
      <Button variant="ghost">Cancel</Button>
      <Button loading={saving} loadingLabel="Saving settings" onClick={onSave}>
        Save settings
      </Button>
      <Button asChild variant="outline">
        <a href="/docs/registry">View docs</a>
      </Button>
    </Stack>
  );
}
```
