# Documentation — T-007c

status: complete

## Updated

- `packages/ui/src/primitives/Text/README.md` — replaced the invalid `<Text as="code">` guidance in the Accessibility section with `variant="code"` plus a supported `as` value. Also normalized pre-existing Props-table column padding **in the same leased file**, because `prettier --check` already failed on that unrelated whitespace before the edit and the task requires a clean check result. No other file was mutated.

Exact old text (formerly lines 51–52):

```md
- The `code` variant switches only the font family; no fabricated code semantics are added. If the
  content is code, use `<Text as="code">` where a code element is appropriate in your document.
```

Exact new text (now lines 51–53):

```md
- The `code` variant switches only the font family; no fabricated code semantics are added. If the
  content is code, use `variant="code"` with a supported element, for example
  `<Text as="span" variant="code">`.
```

## Verified against

- `packages/ui/src/primitives/Text/Text.tsx:9` — `TextElement = 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'small'`; no `code` value exists.
- `packages/ui/src/primitives/Text/Text.tsx:10` — `TextVariant` includes `'code'`.
- `packages/ui/src/primitives/Text/Text.tsx:47,54` — variant maps to `styles[variant]` and `data-variant`; code styling is purely visual, consistent with the preceding sentence.
- `packages/ui/src/primitives/Text/README.md:20-21` — props table already lists the supported `as` values and the `code` variant; the new example is consistent with it.
- `.agents/ledger.yaml:170-179` — parent T-007 is documenter-owned with lease `packages/ui/src/**/README.md`; this edit is inside that lease. There is no separate ledger entry for T-007c.
- `pnpm exec prettier --check packages/ui/src/primitives/Text/README.md` — final result quoted below.

## Not updated

- All other files — outside the T-007c lease. No source, test, config, manifest, or other documentation touched.

## Unverified or ambiguous

- No ledger entry exists for T-007c specifically; scope was taken from the task brief and the parent T-007 lease.
- Table-padding normalization was a pre-existing formatting defect, not part of the accuracy fix; it was included solely within the leased file to make the mandated check pass.

## Links and examples checked

- `<Text as="span" variant="code">` — `span` is in `TextElement` (Text.tsx:9) and `code` is in `TextVariant` (Text.tsx:10); example matches the actual interface.
- Prettier check, **before** edit: `Checking formatting...` / `[warn] packages/ui/src/primitives/Text/README.md` / `[warn] Code style issues found in the above file. Run Prettier with --write to fix.` (exit 1).
- Prettier check, **after** edit — exact outcome of the required command:

```
Checking formatting...
All matched files use Prettier code style!
```

Exit code `0`.

## Next safe action

- Coordinator reviews the one-line documentation change and, if desired, re-runs `pnpm exec prettier --check packages/ui/src/primitives/Text/README.md`.

## Git state

- Change is **uncommitted**. Nothing was committed, pushed, or staged. The target README remains untracked in the working tree, as it was before this task.
