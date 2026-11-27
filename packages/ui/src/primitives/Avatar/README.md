# Avatar

A user image with an automatic initials fallback, built on Radix Avatar primitives.

## Import

```tsx
import { Avatar } from '@simplify-dev/ui';
import type { AvatarProps, AvatarRootProps, AvatarSize } from '@simplify-dev/ui';
```

The compound parts are available both as named exports and as properties of `Avatar`:
`Avatar.Root` / `AvatarRoot`, `Avatar.Image` / `AvatarImage`, and `Avatar.Fallback` /
`AvatarFallback`.

## Props

`AvatarProps` extends `AvatarRootProps`, which extends
`ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>` and the shared responsive visibility props.
Radix root props such as `asChild` are forwarded.

| Name             | Type                   | Default   | Description                                                                    |
| ---------------- | ---------------------- | --------- | ------------------------------------------------------------------------------ |
| `size`           | `'sm' \| 'md' \| 'lg'` | `'md'`    | Diameter (`1.75rem`, `2.25rem`, or `3rem`); exposed as `data-size`.            |
| `src`            | `string`               | —         | Image source. When absent, only the fallback renders.                          |
| `alt`            | `string`               | `''`      | Alternative text forwarded to the image.                                       |
| `fallback`       | `ReactNode`            | —         | Content shown while the image is missing or fails to load, typically initials. |
| `delayMs`        | `number`               | —         | Delay in milliseconds before the fallback appears.                             |
| `imageLoading`   | `'eager' \| 'lazy'`    | `'eager'` | Native `loading` attribute on the image.                                       |
| `children`       | `ReactNode`            | —         | When supplied, replaces the default image/fallback composition.                |
| `className`      | `string`               | —         | Appended to the root CSS Module classes.                                       |
| `hiddenBelow`    | `Breakpoint`           | —         | Hide below the given breakpoint.                                               |
| `hiddenAbove`    | `Breakpoint`           | —         | Hide at and above the given breakpoint.                                        |
| `collapsedBelow` | `Breakpoint`           | —         | Allow the avatar to shrink below the given breakpoint.                         |

`AvatarImage` and `AvatarFallback` accept their corresponding Radix component props and a
`className`.

## States

- With a valid `src`, Radix renders an accessible `<img>` once the image loads successfully.
- While the image is loading or if it fails, the fallback is shown. `delayMs` controls how quickly
  the fallback appears after the image cannot be displayed.
- Supplying `children` opts out of the default composition entirely; compose `AvatarRoot`,
  `AvatarImage`, and `AvatarFallback` yourself in that case.

## Responsive behavior

Visibility flags are forwarded to the root as `data-sd-*` attributes and resolved by the shared CSS
media-query module. Image and fallback parts do not accept the flags.

## Accessibility

- Provide a meaningful `alt` when the image conveys identity. The image is then exposed with
  `role="img"` and the supplied name.
- The fallback is plain text such as initials; keep it readable against the accent-muted surface.
- Radix owns the image-loading state machine, so focus and screen-reader behavior follow the
  primitive. This component uses the `'use client'` boundary because Radix Avatar is interactive.

## Token dependencies

`--sd-color-accent-muted`, `--sd-color-foreground-muted`, `--sd-radius-full`,
`--sd-font-family-sans`, `--sd-font-size-xs/sm/md`, `--sd-font-weight-medium`.

## Example

```tsx
import { Avatar, Stack, Text } from '@simplify-dev/ui';

export function Author({ name, src }: { name: string; src?: string }) {
  return (
    <Stack direction="row" align="center" gap="2">
      <Avatar src={src} alt={name} fallback={name.slice(0, 2).toUpperCase()} size="sm" />
      <Text as="span" variant="label">
        {name}
      </Text>
    </Stack>
  );
}
```
