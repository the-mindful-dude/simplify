# Decision record — Foundation scope approval (T-022)

Date: 2026-11-21
Branch: feat/ui-foundation-hardening
Context: foundation audit (T-018) found CI, Docker Compose, and Changesets already exist; gaps are drift and missing advisory automation, not greenfield infrastructure.

User-approved decisions (via question tool):

1. Implementation scope = "CI alignment + audit automation" (not the full recommended track, not proposal-only).
2. Node pinning = exact 20.19.0 in CI and container images (matches .nvmrc:1; package.json engines remain >=20.9.0).
3. Infrastructure layout = keep Dockerfile/docker-compose.yml at repo root; no infra/ relocation.
4. Dependency automation = Dependabot config (not Renovate, not deferred).
5. Release automation = deferred; no publish workflow, registry, or secrets decisions now.

Consequences:

- Only .github/workflows/ci.yml, Dockerfile, and .github/dependabot.yml are in scope for mutation (owned by foundation, task T-022).
- Mandatory security + reviewer sign-off required for these CI/infrastructure changes.
- Phase 8 (GitHub App integration) remains blocked; unchanged.
- No changes to docker-compose.yml, package.json scripts, .env.example, or docs unless a gate failure requires a bounded remediation task.
