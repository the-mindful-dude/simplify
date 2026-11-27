# UI/UX Design — T-032b

status: complete
lease: apps/web/app/**, apps/web/components/**, apps/web/lib/**, packages/ui/src/**, packages/ui/package.json, packages/ui/scripts/**
role: implementation (bounded continuation of T-032)

## Changed or specified

- `apps/web/lib/status-model.ts:4-13` — nine-state `StatusState` union (`idle`, `loading`, `pending`, `success`, `failure`, `retry`, `duplicate`, `unavailable`, `empty`); `:18-26` safe serializable `StatusView`; `:28-38` existing-Badge-variant mapping; `:40-50` visible labels; `:53-71` state helpers including live-region announcement.
- `apps/web/lib/status-data.ts:8-56` — derives four honest views from local facts; webhook/sync/GitHub report `unavailable`, repository is `success` or `empty`, timestamps come from `snapshot.generatedAt`.
- `apps/web/components/status-section.tsx:12-41` — labelled `#status` section, AutoGrid of cards, polite announcer.
- `apps/web/components/status-card.tsx:12-47` — `data-state`, `aria-busy`, Badge + text label, Spinner, `<time>`, refresh action.
- `apps/web/components/status-announcer.tsx:8-26` — first-render-silent `role="status" aria-live="polite" aria-atomic="true"` region.
- `apps/web/components/status-retry-button.tsx:9-25` — `useTransition` + `router.refresh()`, guards repeat clicks, keeps focus on the control, pending label.
- `apps/web/styles/status.module.css:1-41` — token-only layout, `--sd-color-border-strong` card boundary, `.srOnly`, `prefers-reduced-motion` guard.
- `apps/web/components/site-header.tsx:28` — Status anchor added to primary nav.
- `apps/web/components/registry-content.tsx:13-36` — async server subtree: `DataError` on typed code, otherwise header/main/StatusSection/browser/footer.
- `apps/web/app/page.tsx:9-16` — skip link + functional `Suspense` boundary around `RegistryContent`.
- `apps/web/components/catalog-skeleton.tsx:8-11` — fallback owns `<main id="main">`, `aria-busy`, `role="status"` loading region.
- `apps/web/app/loading.tsx:4-6` — route-level loading state reuses `CatalogSkeleton`.
- `apps/web/app/error.tsx:13-33` — route error boundary with static copy and a working `reset` button; never renders `error`.
- `apps/web/app/not-found.tsx:6-25` — route not-found state with labelled card and return link.
- `apps/web/components/data-error.tsx:6-11` — static `COPY` keyed by `RegistryDataErrorCode | 'unknown'`; `:39-54` explicit `main`/`role="alert"` failure state.
- `apps/web/lib/types.ts:109-114` — `ManifestIssue` (`invalid | absent`, `assetId`, `detail`); `:116-121` `RegistryDataErrorCode`; `:128` snapshot uses `readonly ManifestIssue[]`.
- `apps/web/lib/registry-data.ts:29-33` — typed error code; `:62-75` safe `manifestPath()` issues; `:141-153` absent/invalid `ManifestIssue` results; `:160-176` parser errors not echoed; `:225+` structured issue collection.
- `apps/web/components/site-footer.tsx:13-14,28-31,48-63` — counts/lists only invalid issues and summarizes absent manifests subdued.
- `packages/ui/package.json:13-15` — `files: ["dist"]` removes stale `styles/` export.
- `packages/ui/scripts/copy-css.mjs:49-61` — exported `removeStaleGeneratedOutputs()` cleans orphaned `.js/.js.map/.d.ts/.d.ts.map`; `:82` wired into build; `:91-94` guarded main.
- `packages/ui/src/copy-css.test.ts:37-80` — two regression tests for stale-output cleanup and missing output dir.
- `packages/ui/src/types.ts:1-9` — public responsive types sourced from token constants.
- `packages/ui/src/index.ts:118` — public type re-export now `./types`, not `./internal/responsive`.
- `packages/ui/src/internal/responsive.ts:1-9` — consumes public types module, no duplicate `SpacingValue`.

## Design decisions

- Nine states are modelled once and mapped to existing Badge variants; every state also renders a text label, so colour is never the sole signal.
- Status is honest: no GitHub or publishing credentials exist in this phase, so those surfaces are `unavailable` rather than fabricated `success` (DECISION-003, DECISION-004 option A).
- Web composition only, using existing `packages/ui` primitives; no `modules/*` package, no new `packages/ui` exports, no new dependency.
- Error details are code-keyed static copy. Parser messages, absolute paths and raw exception values never reach the DOM.
- Absent manifests are a normal index-summary case: footer counts only `invalid` issues and gives one subdued count for `absent`, avoiding 35 false warnings.
- All status styling uses semantic `--sd-*` tokens with a reduced-motion fallback; no hex values introduced.

## Interface changes

- `apps/web/lib/types.ts`: `RegistrySnapshot.manifestIssues` is now `readonly ManifestIssue[]` (was `readonly string[]`); added `ManifestIssue`, `RegistryDataErrorCode`.
- `apps/web/lib/registry-data.ts`: `RegistryDataError` constructor takes `(code, message, options?)`; `loadManifest()` returns `{ view, issue }`; `manifestPath()` returns `{ target, issue }`.
- `packages/ui/scripts/copy-css.mjs`: new named export `removeStaleGeneratedOutputs` (build script only, not package public API).
- `packages/ui/src/types.ts`: new internal source module; types are re-exported from the existing public entry point, so no new package subpath was added.
- New web component props are internal to `apps/web/components/**`; no cross-package public contract changed.

## Tests

- `packages/ui/src/copy-css.test.ts` — 2 new tests: stale compiled artifacts removed while live artifacts survive; missing output dir is a no-op.
- `pnpm test` — 19/19 tasks passed; UI 16 files / 44 tests, plus tooling 35, github 28, registry-api 13 as reported by the coordinator baseline and confirmed by the full run.
- No new web test file was added: `vitest.shared.ts` collects only `test/**` and `src/**` under `apps/web`, and neither path is inside this lease. Web coverage is therefore typecheck, lint, build and rendered-DOM smoke only.

## Verification

- `pnpm format:check` → passed: "All matched files use Prettier code style!". Initial run failed on four lease files (`apps/web/components/data-error.tsx`, `apps/web/lib/registry-data.ts`, `apps/web/lib/types.ts`, `packages/ui/src/index.ts`); all were formatted and the re-run passed.
- `pnpm lint` → first run failed with one in-lease error: `packages/ui/src/types.ts:1:1  error  All imports in the declaration are only used as types. Use import type`. Fixed with `import type { breakpoints, spacing }`; re-run → 19/19 tasks passed.
- `pnpm typecheck` → 19/19 tasks passed, including `@simplify-dev/web:typecheck`.
- `pnpm --filter @simplify-dev/web build` → passed; routes `/` and `/_not-found` prerendered as static.
- `pnpm test` → 19/19 tasks passed (UI 44 tests), duration 1m50s.
- Rendered-DOM smoke: `pnpm exec next start -p 3117` (workdir `apps/web`) + `curl http://127.0.0.1:3117/` → `id="main"` ×3, `Skip to content` ×2, `id="status"` ×1, `aria-labelledby="status-title"` ×1, `aria-live="polite"` ×1, `aria-busy` ×15, `Webhook delivery` ×3, `GitHub connection` ×3, `<time dateTime=` ×2. `role="alert"` ×0 on the success path, as expected. Server stopped after the check.

## Accessibility

- Semantics: status section uses `id="status"` + `aria-labelledby="status-title"`; cards use `h3`; error routes use `h1` and `role="alert"` on the message; loading fallback uses `aria-busy` + `role="status"`; `<time dateTime>` exposes observed timestamps.
- Focus: skip link targets `#main` in success, loading, error, not-found and DataError states. `StatusRetryButton` is a real `Button`, is never disabled while pending, guards repeat clicks, and preserves focus across `router.refresh()`.
- Live regions: `StatusAnnouncer` is silent on first render, announces only changes, is `aria-live="polite"` and `aria-atomic="true"`; in-flight cards also set `aria-busy` with a labelled Spinner.
- Labels/state: every state renders `statusLabel()` text beside its Badge dot; aria labels are provided for spinner, loading region and retry control.
- Contrast: card boundary uses `--sd-color-border-strong`; all text uses existing semantic tone tokens. No raw hex or ad-hoc colour was introduced.
- Reduced motion: `status.module.css:37-40` collapses transition duration to `--sd-motion-duration-instant`.
- Method limitation: this was a code-level audit plus rendered-DOM marker check; no browser screenshot or automated axe/Lighthouse run was available in this environment.

## README replacement text (documenter-owned, not edited)

- Replace `packages/ui/README.md:11`:
  `- \`dist/\` — compiled JavaScript and type declarations plus CSS Modules copied from \`src/\` by \`scripts/copy-css.mjs\`; there is no separate \`styles.css\` package export.`
- Replace `packages/ui/README.md:22-24`:
  `## Status`
  ``
  `Foundation implemented. The package exports the primitives, layouts, overlays and navigation components listed in \`src/index.ts\`, built on Radix UI, CSS Modules and semantic \`@simplify-dev/tokens\`. Public responsive types are re-exported from \`src/types.ts\`; no \`internal/\` path is exported.`

## Risks and limitations

- No web unit tests are collectable inside this lease (`vitest.shared.ts` only includes `apps/web/test/**` and `apps/web/src/**`, both outside the lease).
- No browser rendering/screenshot tool was available; visual review is code-level plus HTML marker verification, not pixel review.
- `pnpm --filter @simplify-dev/web build` emits Next.js/Turbopack warnings for dynamic filesystem access in `apps/web/lib/registry-data.ts` (`existsSync`/`readFile` at ~`:160`). Build succeeds and output is correct; adding `turbopackIgnore` comments was not done because it could exclude the local registry source from deployment output.

## Discovered but not fixed

- `packages/ui/README.md:11,22-24` is stale (`styles/` export, "not implemented yet"). Out of lease and documenter-owned; exact replacement text supplied above.
- Other agents' concurrent changes outside the lease were observed but not inspected, edited or reported on beyond repo-wide gate results.

## Next safe action

- Coordinator should apply the two README replacements via the documenter, then run the final repo-wide gate and commit. No further UI work is required for T-032/T-032b.
