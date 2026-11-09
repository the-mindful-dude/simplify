# simplify.dev Architecture

This directory records the architecture decisions and implementation contracts for
simplify.dev. It complements, but does not replace, [`../MODEL.md`](../MODEL.md), which
defines the product model and non-negotiable boundaries.

## Reading Order

1. [`../../README.md`](../../README.md) — product summary.
2. [`../MODEL.md`](../MODEL.md) — authoritative product and architecture model.
3. [`product-scope.md`](./product-scope.md) — categories, asset model, installation modes,
   initial ecosystem, and ownership boundaries.
4. [`github-workflow.md`](./github-workflow.md) — GitHub-first library lifecycle and
   publishing model.
5. [`naming-and-identifiers.md`](./naming-and-identifiers.md) — package, CLI, asset,
   registry, and repository identifiers.
6. [`technical-standards.md`](./technical-standards.md) — languages, tooling, module
   boundaries, quality gates, and versioning.
7. [`../../TODO.md`](../../TODO.md) — implementation roadmap.

## Documentation Rules

- Architecture documents describe decisions that affect more than one package or phase.
- Documents must not contradict `docs/MODEL.md`. If they do, `docs/MODEL.md` wins and the
  conflict must be resolved explicitly.
- Implementation details that are local to a single package belong in that package's
  `README.md`, not here.
- Architecture documents are living documents. Update them in the same change that alters
  the contract they describe.
- Use clear normative language: **must**, **should**, and **may** have their usual meaning.

## Status

| Document | Status |
| --- | --- |
| `product-scope.md` | Initial Phase 1 |
| `github-workflow.md` | Initial Phase 1 |
| `naming-and-identifiers.md` | Initial Phase 1 |
| `technical-standards.md` | Initial Phase 1 |

The documents are considered stable once Phase 2 tooling enforces their rules in CI.
