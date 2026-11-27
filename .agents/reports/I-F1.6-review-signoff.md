# I-F1.R4 / I-F1.S4 — React 19 blocks scaffolding sign-offs

## Reviewer

- I-F1.R4 (I-F1.6): **APPROVE**, no blocking defects.
- Verified: `packages/blocks` React/React-DOM peers use `^19.0.0`; `apps/web` no longer depends on or transpiles `@simplify-dev/blocks`; lockfile changes are scoped and preserve the Node 20 override.

## Security

- I-F1.S4 (I-F1.6): **APPROVE**.
- No critical/high findings.
- Medium residual: checked-in registry asset manifests still declare React 18 peers that the CLI installs. This is outside the I-F1.6 lease and is assigned to a bounded remediation task (I-F1.8).

## Coordinator evidence

- Commit `dd3dc03` contains the four scoped files.
- Full coordinator gate chain after the change exited `0`: `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, boundary self-test, and report-only boundary scan.
