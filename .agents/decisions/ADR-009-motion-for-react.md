# ADR-009 — Motion for React for orchestrated UI motion only

- Status: proposed
- Date: 2026-11-23
- Owners: architect
- Related tasks: T-P004, T-P005; user decision `.agents/decisions/DECISION-FE-FOUNDATION-001.md:10`

## Context

Observed facts:

- `packages/tokens/src/source/tokens.json:70-78` already defines duration/easing tokens; `apps/web/styles/globals.css:82-95` implements a reduced-motion kill switch; `T-P002B:29` confirms the current UI is CSS-only, with no Motion/Framer Motion dependency.
- The user requires a collapsible sidebar **with hover animations** (`DECISION-FE-FOUNDATION-001:18`) and approved Motion for React with an ADR (`:10`).
- `docs/MODEL.md:1540-1554` requires purposeful motion, reduced-motion support and no heavy animation dependency on components that do not need it.
- `AGENTS.md:103` requires justification of new tooling; `AGENTS.md:95-97` locks styling to CSS custom properties + CSS Modules, which CSS transitions satisfy.

Forces: a new animation library must add capability CSS cannot provide, must not become a blanket client-side runtime cost, and must not replace the token system.

## Decision

1. Approve **Motion for React** (`motion` React package) as an optional, isolated capability for orchestrated motion (e.g., command-palette enter/exit, route/shell transitions, coordinated multi-element animation). It is **not** the default for hover/collapse feedback.
2. Sidebar hover and collapse animation uses CSS transitions driven by the existing motion tokens (`--sd-motion-duration-*`, `--sd-motion-ease-*`) plus `prefers-reduced-motion`. No Motion dependency for the sidebar itself.
3. Motion for React is confined to `modules/app` (and, if later justified, a deliberate `@simplify-dev/ui/motion` subpath). Domain modules and `apps/web` pages must not import the Motion package directly; they consume a single `motionPresets.ts` owned by `modules/app` that reads token values and a shared reduced-motion guard hook.
4. Every Motion usage must be gated by reduced motion and must not animate layout-critical state in a way that blocks interaction. Heavy imports are dynamically loaded where the capability is optional.
5. This does not change the locked styling decision (`AGENTS.md:96`); CSS custom properties remain authoritative for values.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| CSS-only for all motion | Sufficient for hover/collapse but not for coordinated presence/exit and interruptible orchestration; user explicitly approved Motion for React. |
| Framer Motion alongside Motion | Competing/duplicate dependency; same capability; violates `AGENTS.md:103`. |
| Global animation provider in `packages/ui` | Would force the runtime on every consumer and violate "no mandatory global providers" (`AGENTS.md:338`, `ADR-003:58`). |
| Motion values hardcoded in components | Duplicates token source and breaks theming (`AGENTS.md:328`, `ADR-003:30`). |

## Consequences

Positive: richer feedback where it matters; token-driven consistency; reduced-motion honored once in a shared guard; heavy code isolated.

Negative: one more dependency and bundle surface; must audit that CSS-only paths stay CSS-only; requires a review rule.

Neutral: published `packages/ui` API unchanged unless a `./motion` subpath is later added by a follow-up ADR.

## Boundary and dependency impact

Added: `modules/app -> motion` (React entry). No edge from `modules/core`, domain modules, `packages/ui`, published packages or `apps/registry-api` to Motion in this decision. Future `packages/ui/motion` would require an ADR amendment and a deliberate export.

## Migration plan

1. Add the dependency to `modules/app` only and refresh `pnpm-lock.yaml` (ADR-002) in the implementation phase.
2. Add `motionPresets.ts` and the reduced-motion hook with tests; wire one orchestrated surface (command palette).
3. Keep sidebar CSS-only; add visual/a11y tests for reduced motion.
4. Rollback: remove the dependency and the preset module; CSS-only behavior remains intact.

## Risks

| Risk | Likelihood | Impact | Mitigation | Owner |
| --- | --- | --- | --- | --- |
| Motion leaks into published UI package | medium | medium | Boundary check forbids `motion` in `packages/*`; ADR amendment required | architect |
| Reduced-motion not honored in one surface | medium | high | Shared guard hook, mandatory test per surface | implementer |
| Bundle size regression | medium | medium | Dynamic import optional capability; measure before optimizing further | performance reviewer |

## Verification

- `motion` appears only in `modules/app/package.json` (or an approved `packages/ui` subpath after amendment).
- Every Motion usage imports the shared preset/guard; reduced-motion test passes for each surface.
- Sidebar hover/collapse implemented in CSS Modules using `--sd-motion-*` tokens.
