# @simplify-dev/tokens

Framework-independent design tokens and generated outputs.

## Responsibilities

- `src/source/tokens.json` — canonical definitions; the only hand-authored source of raw
  values.
- `src/generators/generate.mjs` — regenerates both artifacts under `src/outputs/` from that
  source.
- `src/outputs/tokens.css` and `src/outputs/tokens.generated.ts` — generated CSS custom
  properties and the typed source consumed by `src/index.ts`.

## Boundaries

- Must not depend on React or UI packages.
- Generated output must be reproducible from the canonical source.
- Semantic roles must stay distinct; brand values stay separate from role names.

## Status

Implemented. The generator writes `--sd-*` custom properties on `:root` and
`[data-sd-theme='dark']`; there is no light theme or switcher. The package root exports typed
token constants, `cssVariables` and `tokenCss`. `test/tokens.test.ts` verifies source/output
parity and recomputes WCAG AA contrast for the dark theme.
