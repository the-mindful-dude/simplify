# I-F1.6b — Stale scaffolding documentation corrections

Owner: documenter | Review: reviewer APPROVE (I-F1.R2)

Files: `apps/web/README.md`, `packages/tokens/README.md`, `docs/architecture/ADR-003-canonical-tokens-and-ui-contracts.md`

## Work

- Web README now describes the implemented registry browser only and marks the redesigned shell/sidebar as planned, not shipped.
- Tokens README now names the real source/generator/outputs and implemented behavior; removed false "not implemented" claim.
- ADR-003 no longer references removed `packages/ui/styles/styles.css`; citations point to actual token outputs and `packages/ui` `dist` CSS Modules.

## Verification

- Documenter: Prettier check exit 0; `git diff --check` exit 0; each claim cross-checked against source paths.
- Reviewer: no blocking defects; acceptance met.
- Coordinator full gate chain passed after integration (`COORDINATOR_GATES_EXIT:0`).

## Residual

- ADR-003 unchecked verification boxes were intentionally left for a separate scoped decision.
