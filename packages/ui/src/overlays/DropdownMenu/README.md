# DropdownMenu

A compound, keyboard-accessible dropdown menu built on Radix, with items, groups, checkable items,
and submenus.

## Import

```tsx
import { DropdownMenu } from '@simplify-dev/ui';
import type {
  DropdownMenuContentProps,
  DropdownMenuItemProps,
  DropdownMenuRootProps,
  DropdownMenuShortcutProps,
  DropdownMenuTriggerProps,
} from '@simplify-dev/ui';
```

Every part is available as a named export (for example, `DropdownMenuContent`, `DropdownMenuItem`)
and as a property of `DropdownMenu`: `Root`, `Trigger`, `Portal`, `Content`, `Item`, `Label`,
`Separator`, `Group`, `CheckboxItem`, `RadioGroup`, `RadioItem`, `Shortcut`, `Sub`, `SubTrigger`,
and `SubContent`.

## Props

### Root and Trigger

`DropdownMenuRootProps` extends `ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>` plus
the shared responsive visibility props. Radix state props such as `open`, `defaultOpen`, and
`onOpenChange` are forwarded. `DropdownMenuTriggerProps` extends the Radix trigger props plus the
same visibility flags.

### Content

`DropdownMenuContentProps` is `ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>`.
Content renders in a Radix portal. `sideOffset` defaults to `6` and `className` is appended to the
styled content class.

### Item

`DropdownMenuItemProps` extends the Radix item props with one addition:

| Name          | Type      | Default | Description                                                |
| ------------- | --------- | ------- | ---------------------------------------------------------- |
| `destructive` | `boolean` | `false` | Uses the danger color role. Exposed as `data-destructive`. |

### Shortcut

`DropdownMenuShortcutProps` is `HTMLAttributes<HTMLSpanElement>`; the rendered span is aligned to the
end of an item and uses the monospace token.

The remaining parts (`Label`, `Separator`, `Group`, `CheckboxItem`, `RadioGroup`, `RadioItem`,
`SubTrigger`, `SubContent`) accept their corresponding Radix component props plus `className`.
Checkbox and radio items render a checkmark indicator via `DropdownMenuPrimitive.ItemIndicator`.

## States

- `data-highlighted` on the currently focused item applies the accent-muted background.
- `data-disabled` reduces opacity and sets a not-allowed cursor.
- Destructive items use the danger color and a danger surface when highlighted.
- Content has a short entry animation that is removed under `prefers-reduced-motion: reduce`.

## Responsive behavior

Only the root and trigger accept the shared `hiddenBelow`, `hiddenAbove`, and `collapsedBelow` flags;
they are emitted as `data-sd-*` attributes and resolved by CSS media queries. Content and items have
no responsive value objects — menu layout is intentionally fixed.

## Accessibility

- Radix supplies menu semantics, roving keyboard focus, typeahead, arrow-key navigation, and
  focus restoration. Compose `DropdownMenu.Trigger` with a real button.
- Use `DropdownMenu.Label` for group headings and `DropdownMenu.Separator` between groups.
- `DropdownMenu.Shortcut` is visual only; the actual keyboard action must be implemented separately.
- Checkbox and radio items rely on Radix for `aria-checked` state; the check glyph itself is
  `aria-hidden`.
- Use `destructive` to reinforce, not replace, a clear text label for dangerous actions.
- This component uses the `'use client'` boundary because the Radix menu is interactive.

## Token dependencies

`--sd-z-index-dropdown`, `--sd-color-border`, `--sd-color-border-strong`,
`--sd-color-surface-raised`, `--sd-color-surface-overlay`, `--sd-color-foreground`,
`--sd-color-foreground-muted`, `--sd-color-foreground-subtle`, `--sd-color-accent`,
`--sd-color-accent-muted`, `--sd-color-danger`, `--sd-color-danger-surface`,
`--sd-color-overlay`, `--sd-color-border-focus`, `--sd-spacing-1`, `--sd-spacing-2`,
`--sd-spacing-3`, `--sd-spacing-4`, `--sd-spacing-8`, `--sd-radius-md`, `--sd-radius-sm`,
`--sd-font-family-sans`, `--sd-font-family-mono`, `--sd-font-size-sm`, `--sd-font-size-xs`,
`--sd-font-weight-semibold`, `--sd-font-leading-tight`, `--sd-motion-duration-fast`,
`--sd-motion-ease-out`, and the shared responsive visibility module.

## Example

```tsx
import { Button, DropdownMenu } from '@simplify-dev/ui';

export function AssetActions({ onCopy, onRemove }: { onCopy: () => void; onRemove: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline">Actions</Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Label>Asset</DropdownMenu.Label>
        <DropdownMenu.Item onSelect={onCopy}>
          Copy install command
          <DropdownMenu.Shortcut>⌘C</DropdownMenu.Shortcut>
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item destructive onSelect={onRemove}>
          Remove asset
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
```
