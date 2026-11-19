# Text

Semantic typography rendered entirely from the typography tokens, with a choice of semantic element,
variant, tone, and weight.

## Import

```tsx
import { Text } from '@simplify-dev/ui';
import type { TextElement, TextProps, TextTone, TextVariant, TextWeight } from '@simplify-dev/ui';
```

## Props

`TextProps` extends `HTMLAttributes<HTMLElement>` and the shared responsive visibility props. Any
standard HTML attribute valid for the chosen element is forwarded.

| Name             | Type                                                                                | Default     | Description                                                                       |
| ---------------- | ----------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| `as`             | `'p' \| 'span' \| 'div' \| 'h1' \| 'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6' \| 'small'` | `'p'`       | Semantic element rendered. Pick the heading level that fits the document outline. |
| `variant`        | `'body' \| 'lead' \| 'caption' \| 'code' \| 'label'`                                | `'body'`    | Typographic role; exposed as `data-variant`.                                      |
| `tone`           | `'default' \| 'muted' \| 'subtle'`                                                  | `'default'` | Foreground color role; exposed as `data-tone`.                                    |
| `weight`         | `'regular' \| 'medium' \| 'semibold' \| 'bold'`                                     | `'regular'` | Font weight token applied to the text.                                            |
| `truncate`       | `boolean`                                                                           | `false`     | Clips a single line with an ellipsis.                                             |
| `className`      | `string`                                                                            | —           | Appended to the generated CSS Module classes.                                     |
| `hiddenBelow`    | `Breakpoint`                                                                        | —           | Hide below the given breakpoint.                                                  |
| `hiddenAbove`    | `Breakpoint`                                                                        | —           | Hide at and above the given breakpoint.                                           |
| `collapsedBelow` | `Breakpoint`                                                                        | —           | Allow the element to shrink below the given breakpoint.                           |

## Variants and tones

- **Variants:** `body` (base size, normal leading), `lead` (large, relaxed leading), `caption`
  (extra-small), `code` (monospace family, small size), and `label` (small, medium weight).
- **Tones:** `default`, `muted`, and `subtle` map to the corresponding foreground color tokens.
- **Weights:** `regular`, `medium`, `semibold`, and `bold`.
- `truncate` sets `overflow: hidden`, `text-overflow: ellipsis`, and `white-space: nowrap`; use it
  only when the element has a constrained width.

## Responsive behavior

The three visibility flags are forwarded as `data-sd-*` attributes and handled by the shared CSS
media-query module. Text does not accept responsive value objects; use the layout components for
per-breakpoint value overrides.

## Accessibility

- The rendered tag is under the caller's control through `as`, so headings remain real headings and
  assistive technology sees the correct semantics. Do not use `variant` alone to imply a heading.
- Color contrast is inherited from the semantic foreground tokens; keep `tone` consistent with the
  surrounding surface.
- The `code` variant switches only the font family; no fabricated code semantics are added. If the
  content is code, use `variant="code"` with a supported element, for example
  `<Text as="span" variant="code">`.

## Token dependencies

`--sd-font-family-sans`, `--sd-font-family-mono`, `--sd-color-foreground`,
`--sd-color-foreground-muted`, `--sd-color-foreground-subtle`, `--sd-font-size-xs/sm/md/lg`,
`--sd-font-leading-tight`, `--sd-font-leading-normal`, `--sd-font-leading-relaxed`,
`--sd-font-weight-regular`, `--sd-font-weight-medium`, `--sd-font-weight-semibold`,
`--sd-font-weight-bold`.

## Example

```tsx
import { Stack, Text } from '@simplify-dev/ui';

export function AssetHeading({ name }: { name: string }) {
  return (
    <Stack gap="1">
      <Text as="h2" variant="lead" weight="semibold">
        {name}
      </Text>
      <Text tone="muted" truncate>
        Registry asset summary
      </Text>
    </Stack>
  );
}
```
