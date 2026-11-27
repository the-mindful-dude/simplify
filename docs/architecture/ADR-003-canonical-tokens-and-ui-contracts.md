# ADR-003 — Canonical design tokens and `packages/ui` component contracts

- **Status:** Accepted — implemented (user-approved architecture/product contract; commit 4271bad)
- **Date:** 2026-11-19
- **Owners:** architect
- **Related tasks:** T-002, T-005, T-006, T-007

## Context

**Observed (repository evidence):**

- `AGENTS.md:96-97` locks styling to **CSS custom properties + CSS Modules** and headless UI to **Radix UI**.
- `AGENTS.md:136-137,328-346` requires `packages/ui` to depend on `tokens`, components to consume semantic design tokens (no hardcoded brand values), framework-independent logic separation, deliberate server/client boundaries, tree-shakeable imports, and optional isolation of heavy dependencies.
- `AGENTS.md:169-176` requires cross-package imports via deliberate public entry points and forbids importing another package's `internal/` or arbitrary deep paths.
- `docs/architecture/technical-standards.md:26,55,71-72,169-178` reinforces CSS custom properties + CSS Modules, Radix, `ui → tokens`, token generation framework-independence, reproducible outputs, no hardcoded brand values, and no global React provider required for basic components.
- `docs/MODEL.md:1203-1233` defines semantic tokens (illustrative `--sd-*` values), customization via stable extension points, and compound components.
- At the time of this decision the implementation was a placeholder: both `packages/tokens/src/index.ts` and `packages/ui/src/index.ts` exported empty modules, `packages/ui/package.json` depended only on `@simplify-dev/tokens`, and no Radix declarations or lockfile entries were observed (R-004). That state was superseded: token values now live in `packages/tokens/src/source/tokens.json` and generate `packages/tokens/src/outputs/tokens.css` plus `tokens.generated.ts` (`packages/tokens/src/generators/generate.mjs:17-21,58-70`), while `packages/ui` builds compiled JS and CSS Modules into `dist/`, which is its only shipped output (`packages/ui/package.json:7-17`, `packages/ui/scripts/copy-css.mjs:79-89`).

**Research/constraints (R-004, provided):** reference project VTN-Lab demonstrates useful grouping and responsive/slot patterns but includes defects (hardcoded colors, blanket `"use client"`, `any`/`@ts-ignore`) that must not be copied. Target repo must keep CSS Modules + CSS vars, no component hex literals, deliberate root entry point, and no internal deep imports.

**Authoritative user decisions:** premium dark monochrome/silver Vercel-like registry browser; `packages/ui` canonical reusable component home with correct grouping/props and viewport hidden/collapsible behavior; `packages/tokens` canonical token source (generated CSS custom properties `var(--sd-*)` + typed TS constants), hex only in token source/generated output; add Radix primitives and DOM testing deps for accessible interactive components; responsive API = simple flags + responsive value objects; component set = 17 specified components; every component gets a specific README.md (no phase references/generic filler).

## Decision

Establish **tokens as the canonical design source** and **`packages/ui` as the canonical reusable component library** with explicit, testable contracts:

### 1. Tokens (`packages/tokens`)

- Own the semantic token model for the dark monochrome/silver theme (and extensible theme structure) as **source definitions** that generate **CSS custom properties** (`--sd-*`) and export **typed TypeScript constants/mappings**.
- **Hex (and other raw color literals) may appear only in token source and/or generated token outputs** owned by `packages/tokens`; consumers and UI components must reference `var(--sd-*)` or typed token exports, never hardcoded brand hex.
- Token generation/exports must remain **framework-independent** (no React dependency) and reproducible (`docs/architecture/technical-standards.md:57,175,178`).

### 2. UI library (`packages/ui`)

- `packages/ui` is the **single canonical home** for reusable UI primitives/compositions used by `apps/web` and future consumers; no parallel ad-hoc component systems for the same responsibilities.
- Components are implemented with **CSS Modules** consuming semantic tokens (`var(--sd-*)`), with **no hardcoded hex/brand literals** in component source/styles.
- Use **Radix UI** primitives where appropriate for accessible interactive behavior (minimum planned set aligned to component needs: `@radix-ui/react-dialog`, `react-slot`, `react-tabs`, `react-dropdown-menu`, `react-tooltip`, `react-avatar`), composed behind deliberate component APIs.
- **Public API:** expose a deliberate root entry point and only intentional subpath exports if justified; never require consumers to import from `internal/` or arbitrary deep paths (`AGENTS.md:169-172`).
- **Organization:** group by responsibility/cohesion (avoid dumping grounds and god files; `AGENTS.md:196`), with per-component ownership and tests.
- **Client boundaries:** preserve React server/client boundaries deliberately; do not blanket-mark modules `"use client"` (R-004 anti-pattern).
- **Component set (Phase 9 target):** Button, InputField, Container, SplitView, AutoGrid, Stack, Dialog, Text, Badge, Card, Separator, Skeleton, Spinner, Tabs, DropdownMenu, Tooltip, Avatar.
- **Responsive/visibility API:** support both **simple flags** (`hiddenBelow`, `hiddenAbove`, `collapsedBelow` as applicable to layout/visibility contracts) and **responsive value objects** (`{ base, sm, md, lg, xl, 2xl }`) through explicit, typed props/utilities consistent across components.
- **Customization:** provide stable extension points (`className`, slots/`slotProps` where appropriate, variants/sizes, controlled/uncontrolled patterns as relevant) without leaking internal structure (`docs/MODEL.md:1203-1205`).
- **Documentation:** every component ships a specific `README.md` covering usage, props/API, tokens/theming, accessibility, responsive behavior, and examples; no phase references or generic filler (T-007).

### 3. Testing/tooling alignment

- Add DOM-capable testing support (`jsdom`, `@testing-library/react`, `@testing-library/jest-dom`) for UI behavior/a11y interaction tests, alongside Vitest (`AGENTS.md:93`), per ADR-004.

## Alternatives considered

| Alternative                                                  | Why rejected                                                                                                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tailwind utility-first as primary styling system             | Conflicts with locked decision `CSS custom properties + CSS Modules` (`AGENTS.md:96`) and would duplicate token/styling contracts.                     |
| Hardcoded hex/colors per component or in app styles          | Violates semantic token requirement and theming consistency (`AGENTS.md:328`, `technical-standards.md:170-172`).                                       |
| Copy VTN-Lab component patterns/structure directly           | Useful reference but carries rejected defects (hardcoded colors, blanket client components, unsafe typing) and does not satisfy this repo's contracts. |
| Unstructured exports / deep imports / dumping-ground folders | Breaks public API discipline, maintainability, and boundary rules (`AGENTS.md:169-172,196`).                                                           |
| Global theme provider required for all components            | Contradicts preference for CSS variables/theme attributes without mandatory global provider (`AGENTS.md:339`, `technical-standards.md:176-177`).       |
| Media-query-only styling with no prop-level responsive API   | Fails explicit user requirement for flags + responsive value objects.                                                                                  |

## Consequences

**Positive**

- Single source of truth for theming enables consistent dark monochrome/silver UI and safer future theme evolution.
- Accessible, composable primitives via Radix improve keyboard/focus/dialog/menu behavior (`docs/architecture/technical-standards.md:144-153`).
- Clear public contracts, grouping, and per-component docs improve reuse and maintainability for `apps/web` and consumers.
- Responsive flags/objects provide predictable layout behavior without ad-hoc breakpoint logic.

**Negative / risks**

- Significant upfront implementation effort to replace placeholders with real token pipeline and 17 components.
- Additional dependencies (Radix, testing libs) increase maintenance and bundle-surface considerations.
- Risk of prop/API sprawl if "necessary props" are not kept deliberate; requires review discipline.

## Compatibility and migration

1. **Tokens:** token values belong only in `packages/tokens/src/source/tokens.json` and its generated artifacts (`src/outputs/tokens.css`, `src/outputs/tokens.generated.ts`); the old illustrative UI stylesheet was removed, and `packages/ui` components consume `var(--sd-*)` through CSS Modules emitted into `dist/`.
2. **UI package:** evolve `packages/ui/src/index.ts` from placeholder to deliberate exports; add grouped component modules/CSS Modules/tests/READMEs; update `packages/ui/package.json` dependencies/peer ranges as needed (React compatibility aligned with ADR-001 for app consumers).
3. **Consumers:** migrate `apps/web` to import from public UI/token APIs and semantic tokens only (T-006); avoid deep imports.
4. **Verification gates:** add checks (lint/review/grep as appropriate) to prevent hex literals outside token sources and to enforce export boundaries.
5. **Docs:** transcribe contract to `docs/architecture/` and keep component READMEs synchronized with implementation (T-007/T-008).

## Rollback plan

- Revert commits affecting `packages/tokens/**`, `packages/ui/**`, and dependent web integration/config.
- Restore placeholder exports/styles if necessary to return to prior buildable baseline, while preserving this ADR as historical record of the accepted target contract if superseded.
- If specific Radix/test dependencies cause blocking issues, remove them with a follow-up ADR amendment and replace affected components with accessible alternatives consistent with locked styling/token rules.

## Security and performance notes

- **Security:** UI components must handle untrusted display/content safely (no unsafe HTML injection patterns), preserve accessibility semantics, and avoid leaking sensitive data in client bundles/logs. New dependencies require supply-chain review and minimal, justified scope.
- **Performance:** keep exports tree-shakeable, isolate heavy/interactive code appropriately, respect server/client boundaries, and avoid unnecessary rerenders/global providers (`AGENTS.md:346`, `technical-standards.md:134-141`). CSS Modules + tokens avoid runtime styling overhead.
- **Accessibility:** Radix usage must be correctly composed (labels, focus trap/restore, keyboard support, reduced motion) to meet `technical-standards.md:144-153`.

## Verification criteria

- [ ] `packages/tokens` exports generated `--sd-*` CSS custom properties and typed TS constants; raw hex/brand literals exist only in token source/generated outputs.
- [ ] `packages/ui` implements the 17-component set with CSS Modules consuming tokens, no hardcoded hex in component code/styles, and no blanket `"use client"`.
- [ ] Interactive components use appropriate Radix primitives and pass keyboard/focus/a11y behavioral tests in jsdom/RTL where applicable.
- [ ] Responsive flags and responsive value objects (`base, sm, md, lg, xl, 2xl`) are implemented and documented consistently.
- [ ] Public exports are deliberate; no `internal/` or deep-path consumer imports required.
- [ ] Each component has a specific, non-generic `README.md` with no phase references (T-007).
- [ ] `pnpm --filter @simplify-dev/tokens build`, `pnpm --filter @simplify-dev/ui test`, `pnpm typecheck`, `pnpm lint`, and relevant builds pass.
- [ ] Transcribed ADR in `docs/architecture/` matches this contract.
