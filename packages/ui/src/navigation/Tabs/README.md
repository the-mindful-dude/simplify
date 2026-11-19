# Tabs

A compound, accessible tab set built on Radix with roving keyboard focus and controlled or
uncontrolled selection.

## Import

```tsx
import { Tabs } from '@simplify-dev/ui';
import type {
  TabsContentProps,
  TabsListProps,
  TabsRootProps,
  TabsTriggerProps,
} from '@simplify-dev/ui';
```

Every part is available as a named export (`TabsRoot`, `TabsList`, `TabsTrigger`, `TabsContent`) and
as a property of `Tabs`: `Root`, `List`, `Trigger`, and `Content`.

## Props

### Root

`TabsRootProps` extends `ComponentPropsWithoutRef<typeof TabsPrimitive.Root>` plus the shared
responsive visibility props. Radix state props are forwarded, including `value`, `defaultValue`, and
`onValueChange`, as well as `orientation` and `activationMode`.

| Name             | Type         | Default | Description                                                  |
| ---------------- | ------------ | ------- | ------------------------------------------------------------ |
| `hiddenBelow`    | `Breakpoint` | —       | Hide below the given breakpoint.                             |
| `hiddenAbove`    | `Breakpoint` | —       | Hide at and above the given breakpoint.                      |
| `collapsedBelow` | `Breakpoint` | —       | Allow the tab set to shrink below the given breakpoint.      |

### List, Trigger, and Content

`TabsListProps`, `TabsTriggerProps`, and `TabsContentProps` are the corresponding Radix component
props (`ComponentPropsWithoutRef` of `TabsPrimitive.List`, `.Trigger`, and `.Content`). Each accepts
`className`, which is appended to its CSS Module class, and all native Radix props such as `value`
on triggers and panels.

## States

- The active trigger is marked with `data-state="active"` by Radix and styled with a foreground
  color and an inset bottom accent bar.
- Triggers have hover and `:focus-visible` styles; the focus outline uses the focus token.
- Only the selected content panel is shown; panels are rendered with the Radix content semantics.
- Trigger transitions are removed under `prefers-reduced-motion: reduce`.

## Responsive behavior

Only the root accepts the shared visibility flags; they are emitted as `data-sd-*` attributes and
resolved by CSS media queries. Tabs have no responsive value objects. The list is an inline flex row
with a small gap; for narrow viewports, wrap the `Tabs` in a layout component if horizontal space
is constrained.

## Accessibility

- Radix implements WAI-ARIA tabs semantics: `role="tablist"`, `role="tab"`, `role="tabpanel"`,
  roving tabindex, arrow-key navigation, and `aria-controls`/`aria-labelledby` links.
- Each `Tabs.Trigger` needs a matching `value`, and each `Tabs.Content` needs the same `value`.
- Use `Tabs.List` to contain triggers so the tablist role is applied correctly.
- Triggers are buttons, so they are focusable and activatable by keyboard without extra work.
- This component uses the `'use client'` boundary because the Radix tab set is interactive.

## Token dependencies

`--sd-color-border`, `--sd-color-foreground`, `--sd-color-foreground-muted`,
`--sd-color-accent`, `--sd-color-border-focus`, `--sd-spacing-1`, `--sd-spacing-2`,
`--sd-spacing-4`, `--sd-font-family-sans`, `--sd-font-size-sm`, `--sd-font-weight-medium`,
`--sd-font-leading-normal`, `--sd-motion-duration-fast`, `--sd-motion-duration-instant`,
`--sd-motion-ease-standard`, and the shared responsive visibility module.

## Example

```tsx
import { Tabs, Text } from '@simplify-dev/ui';

export function AssetTabs() {
  return (
    <Tabs defaultValue="overview">
      <Tabs.List>
        <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
        <Tabs.Trigger value="dependencies">Dependencies</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="overview">
        <Text>Registry metadata and documentation.</Text>
      </Tabs.Content>
      <Tabs.Content value="dependencies">
        <Text>Package and registry dependencies.</Text>
      </Tabs.Content>
    </Tabs>
  );
}
```
