# Tooltip

A Radix-backed tooltip that supplies its own timing provider, so no global provider is required.

## Import

```tsx
import { Tooltip } from '@simplify-dev/ui';
import type {
  TooltipContentProps,
  TooltipProviderProps,
  TooltipRootProps,
  TooltipTriggerProps,
} from '@simplify-dev/ui';
```

All parts are available as named exports (`TooltipProvider`, `TooltipRoot`, `TooltipTrigger`,
`TooltipContent`) and as properties of `Tooltip`: `Provider`, `Root`, `Trigger`, `Content`, `Arrow`,
and `Portal`.

## Props

### Root

| Name                | Type         | Default | Description                                                     |
| ------------------- | ------------ | ------- | --------------------------------------------------------------- |
| `delayDuration`     | `number`     | `200`   | Milliseconds before the tooltip opens.                          |
| `skipDelayDuration` | `number`     | `300`   | Milliseconds during which subsequent tooltips open immediately. |
| `hiddenBelow`       | `Breakpoint` | —       | Hide below the given breakpoint.                                |
| `hiddenAbove`       | `Breakpoint` | —       | Hide at and above the given breakpoint.                         |
| `collapsedBelow`    | `Breakpoint` | —       | Allow the trigger region to shrink below the given breakpoint.  |

The root also accepts all `TooltipPrimitive.Root` props, including `open`, `defaultOpen`, and
`onOpenChange`. It wraps the tree in its own `TooltipPrimitive.Provider` with the timing values
above, so an app-level provider is optional.

### Provider

`TooltipProviderProps` is `ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>`. It forwards
`delayDuration` (default `200`) and `skipDelayDuration` (default `300`) to Radix for consumers that
want one shared timing configuration.

### Trigger

`TooltipTriggerProps` extends the Radix trigger props plus the shared responsive visibility flags.

### Content

| Name         | Type      | Default | Description                                           |
| ------------ | --------- | ------- | ----------------------------------------------------- |
| `sideOffset` | `number`  | `6`     | Distance from the trigger.                            |
| `showArrow`  | `boolean` | `true`  | Renders a `TooltipPrimitive.Arrow` sized `10` by `5`. |
| `className`  | `string`  | —       | Appended to the styled content class.                 |

All other props are Radix content props. Content is rendered through a portal.

## States and behavior

- The tooltip opens on hover or keyboard focus and is announced by Radix.
- Content animates in with a short scale transition that is disabled under
  `prefers-reduced-motion: reduce`.
- `Tooltip.Arrow` fills with the same surface token as the content.

## Responsive behavior

Root and Trigger accept the shared `hiddenBelow`, `hiddenAbove`, and `collapsedBelow` flags,
emitted as `data-sd-*` attributes and handled by CSS media queries. Content has no responsive value
objects.

## Accessibility

- Always give the trigger an accessible name; `TooltipTrigger` renders a button by default.
- The tooltip content is associated with the trigger by Radix, so it is exposed as the accessible
  description. Do not put essential instructions only in a tooltip — they must be reachable on
  touch devices where hover does not exist.
- The trigger uses a `help` cursor and a visible focus ring.
- This component uses the `'use client'` boundary because the Radix tooltip is interactive.

## Token dependencies

`--sd-z-index-tooltip`, `--sd-color-border`, `--sd-color-border-strong`,
`--sd-color-surface-raised`, `--sd-color-surface-overlay`, `--sd-color-foreground`,
`--sd-color-border-focus`, `--sd-color-overlay`, `--sd-spacing-2`, `--sd-spacing-3`,
`--sd-radius-sm`, `--sd-radius-md`, `--sd-font-family-sans`, `--sd-font-size-sm`,
`--sd-font-size-xs`, `--sd-font-leading-normal`, `--sd-motion-duration-fast`,
`--sd-motion-duration-instant`, `--sd-motion-ease-out`, and the shared responsive visibility module.

## Example

```tsx
import { Button, Tooltip } from '@simplify-dev/ui';

export function PublishHint() {
  return (
    <Tooltip>
      <Tooltip.Trigger asChild>
        <Button variant="ghost" aria-label="About publishing">
          ?
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content sideOffset={8}>Published versions are immutable.</Tooltip.Content>
    </Tooltip>
  );
}
```
