# Card

A surface container with composable header, body, and footer sections.

## Import

```tsx
import { Card } from '@simplify-dev/ui';
import type { CardProps, CardSectionProps, CardVariant } from '@simplify-dev/ui';
```

The sections are available as `Card.Root` / `Card`, `Card.Header` / `CardHeader`, `Card.Body` /
`CardBody`, and `Card.Footer` / `CardFooter`.

## Props

`CardProps` extends `HTMLAttributes<HTMLDivElement>` and the shared responsive visibility props.

| Name             | Type                                            | Default     | Description                                                                 |
| ---------------- | ----------------------------------------------- | ----------- | --------------------------------------------------------------------------- |
| `variant`        | `'default' \| 'elevated' \| 'outline'`          | `'default'` | Surface treatment; exposed as `data-variant`.                               |
| `padding`        | `SpacingValue \| ResponsiveValue<SpacingValue>` | `'6'`       | Inner padding; optionally overridden per breakpoint.                        |
| `interactive`    | `boolean`                                       | `false`     | Adds hover/focus affordances and makes the card keyboard focusable.         |
| `tabIndex`       | `number`                                        | `0` when interactive | Overrides the default `tabIndex` applied in interactive mode.       |
| `className`      | `string`                                        | —           | Appended to the generated CSS Module classes.                              |
| `style`          | `CSSProperties`                                 | —           | Merged after the generated padding custom properties.                      |
| `hiddenBelow`    | `Breakpoint`                                    | —           | Hide below the given breakpoint.                                           |
| `hiddenAbove`    | `Breakpoint`                                    | —           | Hide at and above the given breakpoint.                                    |
| `collapsedBelow` | `Breakpoint`                                    | —           | Allow the card to shrink below the given breakpoint.                       |

`CardSectionProps` is `HTMLAttributes<HTMLDivElement>` plus the same three responsive visibility
flags, so each section can be hidden or collapsed independently.

## Variants and states

- `default`: standard surface with a border.
- `elevated`: raised surface, stronger border, and an overlay-based shadow.
- `outline`: transparent background with the standard border.
- `interactive`: adds hover background changes, a visible `:focus-visible` outline, and a default
  `tabIndex={0}`. The state is mirrored as `data-interactive="true"`.
- Header, body, and footer sections apply their own padding and divider borders; the body grows to
  fill available space.

## Responsive behavior

`padding` accepts a scalar spacing step or a responsive value object. A scalar becomes
`--sd-card-padding`; overrides become `--sd-card-padding-<bp>`. Breakpoint widths are `sm` 640px,
`md` 768px, `lg` 1024px, `xl` 1280px, and `2xl` 1536px. All resolution is CSS-driven; no viewport
listeners are used. Sections support the shared visibility flags.

## Accessibility

- A plain Card is a presentational `<div>`; place headings and semantic content inside it.
- `interactive` only makes the card focusable and visually responsive — it does not add a role or
  click handler. Supply an accessible interaction yourself, preferably a real link or button inside
  the card rather than making the whole card a pseudo-button.
- The focus outline uses the focus token and transitions are removed under
  `prefers-reduced-motion: reduce`.

## Token dependencies

`--sd-color-surface`, `--sd-color-surface-raised`, `--sd-color-surface-hover`,
`--sd-color-foreground`, `--sd-color-border`, `--sd-color-border-strong`,
`--sd-color-border-focus`, `--sd-color-overlay`, `--sd-radius-lg`,
`--sd-spacing-2`, `--sd-spacing-4`, `--sd-spacing-6` (default padding), plus the spacing steps
supplied through `padding`, `--sd-font-family-sans`, `--sd-motion-duration-fast`,
`--sd-motion-duration-instant`, `--sd-motion-ease-standard`, and the shared responsive visibility
module.

## Example

```tsx
import { Badge, Card, Stack, Text } from '@simplify-dev/ui';

export function LibraryCard({ name, version }: { name: string; version: string }) {
  return (
    <Card variant="elevated" padding={{ base: '4', md: '6' }}>
      <Card.Header>
        <Text as="h3" variant="label" weight="semibold">
          {name}
        </Text>
      </Card.Header>
      <Card.Body>
        <Text tone="muted">A versioned collection of registry assets.</Text>
      </Card.Body>
      <Card.Footer>
        <Stack direction="row" gap="2" align="center">
          <Badge variant="neutral">{version}</Badge>
          <Text as="span" tone="subtle" variant="caption">
            Official
          </Text>
        </Stack>
      </Card.Footer>
    </Card>
  );
}
```
