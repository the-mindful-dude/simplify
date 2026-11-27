# I-F1.5 — Documentation and ADR reconciliation

Owner: documenter | Review: reviewer APPROVE

## Work

- `AGENTS.md`: React 19.x / Next 16.4.6 baseline; module topology and mandatory rules; new §4.8 frontend module and UI-control contracts; `modules/` in repository layout.
- `docs/architecture/technical-standards.md`: version corrections and §§4.1–4.3 (module topology, design-system-only controls, collapsible sidebar/groups/context menus/local workspaces).
- `docs/architecture/README.md`: ADR index for ADR-001…015 with source-derived intents and ratification note.
- `.agents/decisions/ADR-007…015`: status changed to `Accepted` per DECISION-FE-FOUNDATION-002. ADR-001…006 unchanged.
- `docs/architecture/ADR-001-next16-react19-upgrade.md`: historical React 18/Next 14 text explicitly labeled as superseded baseline.

## Verification

- Prettier check on changed files passed; `pnpm format:check` passed.
- `git grep -n -E 'React 18|Next.js 14|Next 14|18.x|14.x|\^18|\^14' -- AGENTS.md docs README.md` => 11 matches, all in ADR-001 historical section covered by the superseded note.
- 9/9 ADR-007…015 show `- Status: Accepted`; 29/29 links in docs/architecture/README.md resolve.

## Note

- Documents ratify requirements for a redesign that is not yet implemented; no shipped UI is claimed.
