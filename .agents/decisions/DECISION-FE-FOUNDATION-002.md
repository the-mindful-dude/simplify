# DECISION-FE-FOUNDATION-002 — Decision-point resolutions and ADR ratification

Status: ACCEPTED (user said "proceed" on 2026-11-24, authorizing Phase 1 implementation)
Owner: coordinator
Related: FE-FOUNDATION-2026-11 plan §11, ADR-007…015

## Ratification
- ADR-007 (module topology), ADR-008 (TanStack Query), ADR-009 (Motion), ADR-010 (Radix Context Menu), ADR-011 (cmdk), ADR-012 (registry repository/layout), ADR-013 (shell/nav ownership), ADR-014 (design-system-only controls), ADR-015 (framework baseline/docs) are **ratified as Accepted** for this implementation. Status text is updated in F1.5.
- Prior `DECISION-004 §2` ("no modules/*") remains valid for its original Phase-8 scope only; ADR-007 supersedes it for this redesign.

## DP resolutions (recommended defaults adopted)
- **DP1 Notifications:** token-based `ui` Toast + live-region announcer, no new dependency. If a future phase needs persistence, revisit by ADR.
- **DP2 Workspace persistence:** injected storage port backed by `localStorage` with fixture fallback. No server, no account linkage, no ambient global.
- **DP3 Auth placeholders:** local field validation only; submit disabled with explicit "authentication is not connected" copy; no success state, no auth dependency.
- **DP4 Visual QA:** browser-based manual inspection with recorded screenshots at desktop/tablet/mobile for each major page; automated visual regression requires a separate tooling decision (no Playwright approved). Record as a verification limitation where screenshots are unavailable.
- **DP5 Artifact layout:** resolved by F1.0 read-only evidence; resolver supports checked-in source layout and published `assets/...` layout during migration.
- **DP6 ADR status:** see Ratification above.

## Scope of this authorization
- Phase 1 only (F1.0–F1.6). Later phases require separate authorization after Phase 1 is verified and committed.
