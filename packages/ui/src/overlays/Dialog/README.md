# Dialog

A Radix-backed modal dialog with an overlay, focus trap, Escape-to-close, and composable sections.

## Import

```tsx
import { Dialog } from '@simplify-dev/ui';
import type {
  DialogCloseProps,
  DialogContentProps,
  DialogDescriptionProps,
  DialogOverlayProps,
  DialogRootProps,
  DialogSectionProps,
  DialogSize,
  DialogTitleProps,
  DialogTriggerProps,
} from '@simplify-dev/ui';
```

All parts are available as named exports (`DialogRoot`, `DialogTrigger`, `DialogOverlay`,
`DialogContent`, `DialogTitle`, `DialogDescription`, `DialogHeader`, `DialogFooter`, `DialogClose`)
and as properties of `Dialog` (for example, `Dialog.Content`). `Dialog.Portal` exposes the Radix
portal for custom composition.

## Props

### Root

`DialogRootProps` extends `ComponentPropsWithoutRef<typeof DialogPrimitive.Root>` and the shared
responsive visibility props. Radix state props such as `open`, `defaultOpen`, `onOpenChange`, and
`modal` are forwarded. The root wraps the Radix tree in a `<span>` that carries the visibility
attributes.

### Trigger and Close

`DialogTriggerProps` and `DialogCloseProps` extend their corresponding Radix component props plus
the shared responsive visibility flags. `className` is appended to the styled trigger classes.

### Content

| Name               | Type                   | Default | Description                                                           |
| ------------------ | ---------------------- | ------- | --------------------------------------------------------------------- |
| `size`             | `'sm' \| 'md' \| 'lg'` | `'md'`  | Maximum width (`24rem`, `32rem`, or `48rem`); exposed as `data-size`. |
| `showClose`        | `boolean`              | `true`  | Renders the built-in close button labeled `"Close dialog"`.           |
| `overlayClassName` | `string`               | —       | Additional class for the rendered overlay.                            |
| `className`        | `string`               | —       | Appended to the content CSS Module classes.                           |
| `hiddenBelow`      | `Breakpoint`           | —       | Hide below the given breakpoint.                                      |
| `hiddenAbove`      | `Breakpoint`           | —       | Hide at and above the given breakpoint.                               |
| `collapsedBelow`   | `Breakpoint`           | —       | Allow the content to shrink below the given breakpoint.               |

All other `DialogContent` props are Radix content props and are forwarded.

### Other parts

`DialogOverlayProps`, `DialogTitleProps`, and `DialogDescriptionProps` are the corresponding Radix
component props. `DialogSectionProps` (used by `DialogHeader` and `DialogFooter`) is
`HTMLAttributes<HTMLDivElement>` plus the shared responsive visibility flags.

## Sizes and behavior

- `sm`, `md`, and `lg` cap the content width; width is otherwise `calc(100% - spacing)` and height is
  capped similarly with internal scrolling.
- Content is rendered through a Radix portal so it escapes ancestor overflow and stacking contexts.
- The overlay and content have entry animations that are disabled under
  `prefers-reduced-motion: reduce`.
- `DialogHeader` reserves space for the built-in close button; `DialogFooter` aligns actions to the
  end.

## Responsive behavior

Root, Trigger, Content, Header, Footer, and Close accept the shared visibility flags, emitted as
`data-sd-*` attributes and resolved by CSS media queries. Sizes are fixed values rather than
responsive value objects; use `className` if a consumer needs per-breakpoint width overrides.

## Accessibility

- Radix provides the focus trap, focus restoration to the trigger on close, Escape-to-close, and
  correct `role="dialog"` semantics.
- Always render a `Dialog.Title`; it becomes the accessible name. Render `Dialog.Description` when
  additional context is needed; Radix wires it via `aria-describedby`.
- The built-in close control has `aria-label="Close dialog"` and a visible focus ring. Set
  `showClose={false}` only when another clearly accessible close control is provided.
- This component uses the `'use client'` boundary because it depends on Radix interactive behavior.

## Token dependencies

`--sd-z-index-modal`, `--sd-color-overlay`, `--sd-color-surface-overlay`,
`--sd-color-surface-raised`, `--sd-color-foreground`, `--sd-color-foreground-muted`,
`--sd-color-border`, `--sd-color-border-strong`, `--sd-color-border-focus`,
`--sd-color-accent-muted`, `--sd-radius-md`, `--sd-radius-lg`, `--sd-spacing-1`,
`--sd-spacing-2`, `--sd-spacing-3`, `--sd-spacing-4`, `--sd-spacing-6`, `--sd-spacing-8`,
`--sd-font-family-sans`, `--sd-font-size-lg`, `--sd-font-size-sm`, `--sd-font-weight-semibold`,
`--sd-font-leading-tight`, `--sd-font-leading-normal`, `--sd-motion-duration-normal`,
`--sd-motion-duration-fast`, `--sd-motion-duration-instant`, `--sd-motion-ease-out`,
`--sd-motion-ease-standard`, and the shared responsive visibility module.

## Example

```tsx
import { Button, Dialog } from '@simplify-dev/ui';

export function ConfirmPublish() {
  return (
    <Dialog>
      <Dialog.Trigger asChild>
        <Button>Publish version</Button>
      </Dialog.Trigger>
      <Dialog.Content size="sm">
        <Dialog.Header>
          <Dialog.Title>Publish this version?</Dialog.Title>
          <Dialog.Description>
            The published version is immutable and cannot be replaced.
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Dialog.Close asChild>
            <Button variant="ghost">Cancel</Button>
          </Dialog.Close>
          <Button variant="primary">Publish</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}
```
