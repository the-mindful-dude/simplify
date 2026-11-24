# ADR-015 — Framework baseline and architecture-document reconciliation

- Status: proposed
- Date: 2026-11-23
- Owners: architect
- Related tasks: T-P004, coordinator doc task; `ADR-001`, `ADR-005`, `ADR-006`

## Context

Observed facts:

- `ADR-001-next16-react19-upgrade.md:3` has Status `accepted`; decision at `:28-37` upgrades to Next `16.4.6` and React `19`.
- `apps/web/package.json:20-22` installs `next 16.4.6`, `react ^19.3.1`, `react-dom ^19.3.1`; `packages/ui/package.json:32-35` declares React 19 peers.
- `AGENTS.md:90` still states React `18.x` / Next.js `14.x`; `docs/architecture/technical-standards.md:17-18` repeats React `18.x` / Next.js `14.x`.
- `docs/architecture/README.md:42-51` status table lists only ADR-001…004 and does not include ADR-005 or ADR-006; the decisions directory contains `ADR-005-credential-free-webhook-boundaries.md` and `ADR-006-publication-provenance-boundary.md` (verified by directory read), and `.agents/ledger.yaml:681-684,710` claims docs sync/verification already done.
- `packages/blocks/package.json:27-30` still declares React 18 peers, a real defect against the accepted baseline.
- The T-P004 lease forbids editing `AGENTS.md`, `docs/**`, manifests or package configuration; only `.agents/decisions/**` is mutable in this task.

Forces: code must target the accepted runtime, documentation must not contradict it, and corrections to the authoritative agent contract require explicit user/coordinator approval rather than a silent local edit.

## Decision

1. Treat **ADR-001 plus installed configuration** as the authoritative framework baseline for all new code: Next `16.4.6`, React `19.x`, ESM, strict TypeScript, pnpm 9 workspaces, Turborepo, Vitest. Do not write new React 18 compatibility shims.
2. Keep `AGENTS.md` and `technical-standards.md` unchanged in T-P004. Record the staleness as a required, bounded **documentation defect** to be completed by an approved doc task after this evaluation: update `AGENTS.md:90`, `technical-standards.md:17-18`, `docs/architecture/README.md:42-51` and transcribe ADR-005/006/007+ into `docs/architecture/` with accurate statuses.
3. `DECISION-004-boundary-conflicts.md:17-27` ("no modules/*") was scoped to the earlier foundation phase and is explicitly superseded by `DECISION-FE-FOUNDATION-001.md:11` for the redesign; ADR-007 records that supersession. No other prior decision is overturned.
4. Fix `packages/blocks/package.json:27-30` React 18 peers in a separate defect task with a lockfile refresh (ADR-002), not as part of this architectural evaluation.
5. This ADR changes no dependency direction and no public interface; it is a reconciliation record, not a new locked decision.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Downgrade code/docs to React 18 / Next 14 | Contradicts accepted ADR-001 and installed deps; would remove shipped functionality. |
| Edit `AGENTS.md` in this task | Violates T-P004 lease and AGENTS.md:39-41 conflict-resolution rule; requires explicit approval. |
| Ignore stale docs | Guarantees future agents implement against the wrong baseline; violates AGENTS.md:817-833. |
| Treat ADR-005/006 as authoritative without transcription | Leaves `docs/architecture/` incomplete; ledger evidence contradicts reality. |

## Consequences

Positive: unambiguous baseline for implementers; bounded, reviewable doc work; no fake compatibility code.

Negative: a follow-up doc task remains before DoD; transient contradiction between `AGENTS.md` and installed code until that task lands.

Neutral: runtime behavior and module boundaries unchanged.

## Boundary and dependency impact

No module or package edge added/removed. Public surface unchanged. Documentation/public contract impact limited to the four paths in §Decision 2.

## Migration plan

1. Coordinator records this ADR and creates the doc defect task; T-P004 ends with the condition outstanding (APPROVE_WITH_CONDITIONS).
2. Authorized doc agent updates `AGENTS.md:90`, `technical-standards.md:17-18`, `docs/architecture/README.md:42-51` and transcribes ADR-005/006/007+ with correct status.
3. Defect agent updates `packages/blocks/package.json:27-30` peers, refreshes the lockfile and runs gates.
4. Rollback: revert the doc commits; no code rollback needed.

## Risks

| Risk | Likelihood | Impact | Mitigation | Owner |
| --- | --- | --- | --- | --- |
| Doc task not scheduled | medium | high | Explicit condition C4 in T-P004 report; coordinator tracking | coordinator |
| Implementers follow stale `AGENTS.md:90` | high | medium | Chat/ADR sign-off states ADR-001 authoritative until doc task lands | architect |
| Lockfile churn from peer fix | medium | low | ADR-002 dual-lockfile policy; verify both files | implementer |

## Verification

- After doc task: zero occurrences of `React 18.x` / `Next.js 14.x` in `AGENTS.md` and `technical-standards.md`.
- `docs/architecture/README.md` lists ADR-001…015 with statuses matching the decisions directory.
- `packages/blocks/package.json` peers equal React 19; pnpm install and build gates pass.
