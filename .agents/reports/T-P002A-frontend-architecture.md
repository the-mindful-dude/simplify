# T-P002A — Frontend architecture research (READ-ONLY)

Agent: explore | Status: complete | Scope: apps/web, packages/*, apps/registry-api, workspace config
Branch/HEAD at research: feat/ui-foundation-hardening @ 65fb13ace853e8ba17f0188d980a6a703dfae945
No files changed by the research agent. Findings below are evidence from that agent; no build/test gates were run.

## Verified current state
- Sources of truth: AGENTS.md:13-22; docs/MODEL.md:5-24; docs/architecture/technical-standards.md:44-67; TODO.md:9-18.
- Routing is thin and single-page: apps/web/app/layout.tsx:1-31 (tokenCss injection, data-sd-theme="dark"), apps/web/app/page.tsx:1-17, error.tsx:1-37, loading.tsx:1-6, not-found.tsx:1-29. No nested route segments observed.
- Server data orchestration: apps/web/lib/registry-data.ts:43-58 (cwd walk to registry/index.json), :61-77 and :136-187 (manifest validation, traversal checks), :190-273 (getRegistrySnapshot); apps/web/lib/catalog.ts:14-118,160-210 (view mapping/filter/sort); apps/web/lib/types.ts:1-142; apps/web/lib/status-data.ts:5-56; apps/web/lib/status-model.ts:3-71.
- Server composition: apps/web/components/registry-content.tsx:1-37 composes SiteHeader, Hero, StatusSection, RegistryBrowser, SiteFooter.
- Client state concentrated in apps/web/components/registry-browser.tsx:90-108,235-307 (filters, selected asset, sort, detail dialog). Only 7 'use client' files (error.tsx:1, asset-card.tsx:1, status-announcer.tsx:1, registry-browser.tsx:1, status-retry-button.tsx:1, asset-detail.tsx:1, library-section.tsx:1).
- No modules/ directory anywhere. pnpm-workspace.yaml:1-4 includes apps/*, packages/*, schemas — not modules/*.
- Workspace packages: blocks, cli, github, interaction, registry, tokens, tooling, ui, schemas. Proposed packages/icons and packages/config are absent.
- Empty public entries: packages/blocks/src/index.ts:1 and packages/interaction/src/index.ts:1 are `export {};`; their READMEs call them scaffolds (blocks/README.md:19-21, interaction/README.md:19-21).
- Public entry points: registry/src/index.ts:1-5, tooling/src/index.ts:1-20, ui/src/index.ts:1-118, tokens/src/index.ts:1-22, schemas/src/index.ts:1-10, github/src/index.ts:1-13, cli/src/index.ts:1-13. Every package exposes only "."; cli also exposes "./cli".
- Dependency graph (no cycles): web -> blocks, registry, tokens, ui; registry-api -> github; blocks -> interaction, ui; cli -> registry, schemas, tooling; github -> schemas; interaction -> none; registry -> schemas; tooling -> registry; ui -> tokens; tokens -> none; schemas -> none.
- eslint.config.mjs:34-41 forbids package-qualified .../internal/... imports; no cross-package internal imports observed.
- apps/registry-api: package.json:26-28 depends only on github; src/app.ts:3-9,97-160 is a Node HTTP webhook receiver (GET /healthz, POST /webhooks/github, 1 MB cap at :11, 404 fallback); src/server.ts:1-29 port 3002; README.md:6-11 states it must not own the core asset model. This is a webhook ingestion service, not a frontend registry module.
- Naming: all workspace packages use @simplify-dev/*. Bare @simplify appears only in docs/MODEL.md:786 example config and CLI test fixture strings (source-installer.test.ts:356,364).
- apps/web/tsconfig.json:19-21 defines only "@/*": ["./*"].

## Risks / open items from this research
- packages/blocks/package.json:27-30 still declares React ^18.3.1 peers while ui and web use React 19.
- docs/architecture/technical-standards.md:17-18 still says React 18 / Next 14, conflicting with ADR-001, TODO.md:9-18, apps/web/package.json:20-22.
- apps/web/README.md:13-15 says registry browser not implemented (false); :3 claims docs app/Theme Studio with no observed routes.
- Direct @simplify-dev/schemas imports in cli/github vs technical-standards.md:51-58; registry re-exports schemas (registry/src/index.ts:1), so intent is unclear.
- apps/registry-api does not depend on registry contracts although technical-standards.md:50 says it should.
- apps/web/lib/registry-data.ts uses node:fs with no server-only guard (:1-3,190-196).
- test/workspace.test.ts:3-11 deep-imports package src/index.js, bypassing exports.
- No repository document defines the proposed modules/* layout; introducing it needs an explicit ADR and workspace changes.

## Tooling notes
- rg is unavailable in the shell used by the agent; tool-based grep worked. No gates run (read-only).
