# InputField

A labelled text input with an accessible description, leading/trailing adornments, and validation
messaging.

## Import

```tsx
import { InputField } from '@simplify-dev/ui';
import type {
  InputFieldProps,
  InputFieldSize,
  InputFieldSlotProps,
  InputFieldSlots,
} from '@simplify-dev/ui';
```

## Props

`InputFieldProps` extends `Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>` and the
shared responsive visibility props. Native input attributes (`value`, `onChange`, `placeholder`,
`type`, `autoComplete`, `maxLength`, `disabled`, and so on) are forwarded to the `<input>`. `size`
is omitted here because it is the field's own size API.

| Name               | Type                                                      | Default   | Description                                                                                                        |
| ------------------ | --------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| `label`            | `ReactNode`                                               | —         | Renders a `<label>` linked to the input with `htmlFor`.                                                            |
| `description`      | `ReactNode`                                               | —         | Helper text rendered in a `<p>` and referenced by the input's `aria-describedby`.                                  |
| `error`            | `ReactNode`                                               | —         | Validation message in a `role="alert"` `<p>`; also switches the field to its invalid presentation.                 |
| `invalid`          | `boolean`                                                 | `false`   | Forces the invalid presentation without requiring an `error` message.                                              |
| `size`             | `'sm' \| 'md' \| 'lg'`                                    | `'md'`    | Input padding and font size.                                                                                       |
| `leading`          | `ReactNode`                                               | —         | Adornment before the input, wrapped in `aria-hidden="true"`.                                                       |
| `trailing`         | `ReactNode`                                               | —         | Adornment after the input.                                                                                         |
| `slots`            | `InputFieldSlots`                                         | —         | Class names for the `root`, `label`, `description`, `control`, `input`, `leading`, `trailing`, and `error` parts.  |
| `slotProps`        | `InputFieldSlotProps`                                     | —         | Native props and class names forwarded to each rendered part.                                                      |
| `id`               | `string`                                                  | generated | Input id. When omitted, a stable id is derived from React `useId()` and reused for label/description/error wiring. |
| `required`         | `boolean`                                                 | `false`   | Marks the input required and renders a visual `*` next to the label.                                               |
| `className`        | `string`                                                  | —         | Appended to the root CSS Module classes.                                                                           |
| `aria-describedby` | `string`                                                  | —         | Merged with the generated description and error ids rather than overwritten.                                       |
| `aria-invalid`     | `boolean \| 'false' \| 'grammar' \| 'spelling' \| 'true'` | —         | Merged with the computed invalid state.                                                                            |
| `hiddenBelow`      | `Breakpoint`                                              | —         | Hide below the given breakpoint.                                                                                   |
| `hiddenAbove`      | `Breakpoint`                                              | —         | Hide at and above the given breakpoint.                                                                            |
| `collapsedBelow`   | `Breakpoint`                                              | —         | Allow the field to shrink below the given breakpoint.                                                              |

`InputFieldSlots` and `InputFieldSlotProps` each expose the keys `root`, `label`, `description`,
`control`, `input`, `leading`, `trailing`, and `error`.

## States and sizing

- **Sizes:** `sm`, `md`, and `lg` change the input padding and font size.
- **Invalid state:** either `invalid` or a non-null `error` sets `data-invalid="true"` on the root,
  applies the danger border, and sets `aria-invalid="true"` on the input.
- **Focus:** the control wrapper uses `:focus-within` to apply the focus border and outline, so the
  focus ring surrounds the input and its adornments.
- **Disabled:** the native `disabled` attribute is forwarded; the input uses reduced opacity and a
  not-allowed cursor.

## Responsive behavior

The three visibility flags are forwarded as `data-sd-*` attributes and applied through the shared
CSS media-query module. Slot class names and slot props let consumers override any part of the
field without depending on internal DOM structure.

## Accessibility

- The label is programmatically associated with the input via a generated `htmlFor`/`id` pair.
- Description and error ids are appended to any caller-supplied `aria-describedby` value.
- The error message uses `role="alert"` so assistive technology announces validation changes.
- `required` sets the native attribute; the `*` marker is `aria-hidden` because the native state is
  already announced.
- Leading adornments are decorative (`aria-hidden`); trailing adornments are announced.
- The control transitions are disabled under `prefers-reduced-motion: reduce`.

## Token dependencies

`--sd-color-foreground`, `--sd-color-foreground-muted`, `--sd-color-foreground-subtle`,
`--sd-color-background-subtle`, `--sd-color-border`, `--sd-color-border-focus`,
`--sd-color-danger`, `--sd-spacing-1`, `--sd-spacing-2`, `--sd-spacing-3`, `--sd-spacing-4`,
`--sd-radius-md`, `--sd-font-family-sans`, `--sd-font-size-xs/sm/md`, `--sd-font-weight-medium`,
`--sd-font-leading-tight`, `--sd-font-leading-normal`, `--sd-motion-duration-fast`,
`--sd-motion-duration-instant`, `--sd-motion-ease-standard`.

## Example

```tsx
import { InputField } from '@simplify-dev/ui';

export function EmailField() {
  return (
    <InputField
      label="Email address"
      description="We use this only for account notices."
      error={undefined}
      placeholder="you@example.com"
      leading="@"
      slots={{ input: 'tracking-tight' }}
      slotProps={{ input: { type: 'email', autoComplete: 'email' } }}
      required
    />
  );
}
```
