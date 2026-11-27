# T-P002B — Design system audit (READ-ONLY)

Agent: explore | Status: complete | Scope: packages/tokens, packages/ui, apps/web styles/components, a11y history
No files changed by the research agent. No builds/tests/screenshots performed.

## Canonical token pipeline (retain)

- Source: packages/tokens/src/source/tokens.json; generated CSS: src/outputs/tokens.css; generator: src/generators/generate.mjs:17-21,58-70; typed exports: src/tokens.ts:4-41; public entry: src/index.ts:1-22.
- ADR-003 contract: docs/architecture/ADR-003-canonical-tokens-and-ui-contracts.md:23-49,96-105.
- Colors (tokens.json:3-27): background #0a0a0a, backgroundSubtle #111111, surface #151515, surfaceRaised #1c1c1c, surfaceOverlay #242424, surfaceHover #1f1f1f, foreground #ededed, foregroundMuted #a1a1aa, foregroundSubtle #90909a, foregroundOnAccent #0a0a0a, overlay #000000, border #262626, borderStrong #73737d, borderFocus #a1a1aa, accent #e4e4e7, accentHover #ffffff, accentMuted #27272a; status colors success #4caf7d, warning #d4a72c, danger #f0645e, info #6ba8f5 plus surfaces.
- Radius (tokens.json:29-36): none 0, sm .25rem, md .5rem, lg .75rem, xl 1rem, full 9999px. No card/dialog-specific radius.
- Spacing (tokens.json:37-51): 0,1(4px),2(8px),3(12px),4(16px),5(20px),6(24px),8(32px),10,12,16,20,24. 4px base exists; 8px rhythm is conventional only.
- Typography (tokens.json:52-69): Inter / Geist Mono, xs..3xl, leading tight/normal/relaxed, weights 400/500/600/700. No letter-spacing token (ad-hoc in apps/web/styles/hero.module.css:41,70,92).
- Motion (tokens.json:70-78): durations 0/120/200/320ms; eases standard/out/in. z-index (79-87) includes toast 80. Breakpoints (88-94): 640/768/1024/1280/1536.
- Theme: tokens emitted on :root and [data-sd-theme='dark'] (tokens.css:1-2; tokens.ts:61-68); apps/web/app/layout.tsx:1,22-29 sets dark. No light theme or switcher.
- Token parity/contrast tests: packages/tokens/test/tokens.test.ts:8-39 parity, :41-95 WCAG recomputation.

## Component inventory (retain/extend, do not rebuild)

- Public API: packages/ui/src/index.ts:1-118. Radix deps: packages/ui/package.json:23-35. No hex/rgb/hsl literals in packages/ui/src or apps/web.
- Button: Button.tsx:11-116 — 5 variants (primary, secondary, ghost, outline, destructive), sizes sm/md/lg, loading, leading/trailing, fullWidth, asChild via Slottable (:98); CSS states at Button.module.css:22-39,51-100,102-118. Heights: sm 28px, md 36px, lg 44px (:102-118). Missing explicit icon/link variants.
- Other primitives: InputField (InputField.tsx:11-184, label/description/error/useId/aria-describedby), Text, Badge (5 variants), Avatar, Spinner (role=status, reduced motion), Skeleton, Separator.
- Layouts: Container, SplitView (:19-96, ratio/splitAt/reverseOnMobile, no collapse controller), AutoGrid (isEmpty/emptyState role=status), Stack, Card (Card.module.css:74-126; radius lg=12px).
- Overlays: Dialog (Dialog.tsx:12-182, Radix portal/focus trap/Escape; content radius 12px at Dialog.module.css:42), DropdownMenu (DropdownMenu.tsx:12-226 — groups/submenus/checkbox/radio/shortcut/destructive; no test file), Tooltip (no test file), Tabs (Tabs.tsx:12-66; no test file).
- Responsive: packages/ui/src/internal/responsive.ts:45-96, CSS-driven data-sd-* attributes/media queries; internal/ not exported.
- 'use client' only in 6 UI modules (Tabs, Dialog, DropdownMenu, Tooltip, InputField, Avatar).

## Web visual identity / a11y

- apps/web/styles/globals.css:1-95: color-scheme dark (:2), :focus-visible (:47-50), skip link (:52-70), scrollbar-color thin (:77-80), reduced-motion kill switch (:82-95). No ::-webkit-scrollbar anywhere; no ScrollArea component.
- Hero: hero.tsx:21-167, hero.module.css:8-16,77-81,121-131,145-181 (glow, stagger, chart). Browser: registry-browser.tsx:263-283 empty state, browser.module.css:74-107,193-214. detail.module.css:1-90.
- No framer-motion/motion in any package.json or lockfile (grep -c 0/0). Motion is CSS-only.
- React 19 installed (apps/web/package.json:20-22, packages/ui/package.json:32-35); AGENTS.md:90 and technical-standards.md:17-18 still claim 18/14.

## Prior a11y history and residual notes

- Ledger T-017: WCAG AA NOT APPROVED, 5 P0 + 4 P1 (.agents/ledger.yaml:258-267). T-019/T-020 fixed via commit c1e4878 (ledger:277-313): foregroundSubtle #71717a→#90909a, borderStrong #3f3f46→#73737d, destructive text 2.68→6.31:1, outline border 1.90→4.22:1, Slottable preservation, result count role=status. T-021 APPROVED_WITH_NON_BLOCKING_NOTES (ledger:314-323).
- Residual observed: InputField.module.css:34,37 uses low-contrast --sd-color-border (focus uses strong at :40-44); foregroundMuted #a1a1aa vs foregroundSubtle #90909a close; stale docs (packages/tokens/README.md:17-19 says "not implemented yet"; ADR-003:17,78 references removed packages/ui/styles/styles.css).

## Gaps vs the supplied guide (guide is not a repo file; requires user decision)

- Palette values differ from guide's Obsidian/Graphite/Charcoal/Slate/Silver/Pearl.
- Radius: card/dialog 12px vs requested 14–18 / 18–22. No dedicated tokens.
- Default control height 36px vs requested 40–44.
- 5 of 7 button variants; missing icon and link.
- No ScrollArea, no generic EmptyState, no context menu primitive, no light theme.
- Three interactive components lack DOM tests (DropdownMenu, Tooltip, Tabs).
- No automated grep gate enforcing "no hex outside token source" despite ADR-003:81.
