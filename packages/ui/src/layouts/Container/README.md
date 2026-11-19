# Container

A width-constrained content column with responsive inline padding.

## Import

```tsx
import { Container } from '@simplify-dev/ui';
import type { ContainerProps, ContainerSize } from '@simplify-dev/ui';
```

## Props

`ContainerProps` extends `HTMLAttributes<HTMLDivElement>` and the shared responsive visibility
props. Standard div attributes are forwarded.

| Name             | Type                                            | Default | Description                                            |
| ---------------- | ----------------------------------------------- | ------- | ------------------------------------------------------ |
| `size`           | `'sm' \| 'md' \| 'lg' \| 'full'`                | `'lg'`  | Maximum content width; exposed as `data-size`.         |
| `padding`        | `SpacingValue \| ResponsiveValue<SpacingValue>` | `'4'`   | Inline padding, optionally overridden per breakpoint.  |
| `center`         | `boolean`                                       | `true`  | Centers the content column with `margin-inline: auto`. |
| `className`      | `string`                                        | —       | Appended to the generated CSS Module classes.          |
| `style`          | `CSSProperties`                                 | —       | Merged after the generated padding custom properties.  |
| `hiddenBelow`    | `Breakpoint`                                    | —       | Hide below the given breakpoint.                       |
| `hiddenAbove`    | `Breakpoint`                                    | —       | Hide at and above the given breakpoint.                |
| `collapsedBelow` | `Breakpoint`                                    | —       | Allow the column to shrink below the given breakpoint. |

`SpacingValue` is a spacing scale key: `0`, `1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12`, `16`,
`20`, or `24`. `ResponsiveValue<T>` is `{ base?: T; sm?: T; md?: T; lg?: T; xl?: T; 2xl?: T }`.

## Sizes

- `sm`: `max-width: 40rem`
- `md`: `max-width: 64rem`
- `lg`: `max-width: 90rem` (default)
- `full`: no maximum width

## Responsive behavior

`padding` accepts either a scalar spacing step or a responsive value object. A scalar becomes
`--sd-container-padding`; each breakpoint override becomes `--sd-container-padding-<bp>`. The CSS
module walks the breakpoints from `2xl` down to `base`, so an unspecified breakpoint inherits the
next smaller defined value and ultimately falls back to `--sd-spacing-4`. Breakpoint widths match
the token scale: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px.

The `hiddenBelow`, `hiddenAbove`, and `collapsedBelow` flags are emitted as `data-sd-*` attributes
and handled by the same shared media-query module. No viewport listeners are used.

## Accessibility

Container renders a plain `<div>` and adds no semantics. Use it purely for layout; place semantic
landmarks or headings inside it. Do not rely on visual centering to communicate structure.

## Token dependencies

`--sd-spacing-0` through `--sd-spacing-24` (the full spacing scale, referenced through
`--sd-container-padding*`), and the shared responsive visibility module.

## Example

```tsx
import { Container, Stack, Text } from '@simplify-dev/ui';

export function PageIntro() {
  return (
    <Container size="md" padding={{ base: '4', md: '8' }}>
      <Stack gap="2">
        <Text as="h1" variant="lead" weight="semibold">
          Registry browser
        </Text>
        <Text tone="muted">Discover, preview, and install reusable building blocks.</Text>
      </Stack>
    </Container>
  );
}
```
