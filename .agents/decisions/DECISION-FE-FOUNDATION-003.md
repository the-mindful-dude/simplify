# Decision FE-FOUNDATION-003 — ADR-012 scope and missing source assets

- Date: 2026-11-27
- Status: Accepted by user
- Related tasks: I-F1.10-A, I-F1.11, I-F1.12

## Decision

1. Reconcile ADR-012 to **source-v1-only**. Only `registry/<category>/<name>/@<version>/asset.json` is a defined on-disk layout. Unknown layouts, including the defective versionless `assets/...` path named in the original ADR, are rejected by design with `UNSUPPORTED_ARTIFACT_LAYOUT`. `published-v1` is deferred until a real immutable artifact format, publication pipeline, provenance/integrity contract, and superseding ADR exist.
2. The index/manifest gap is accepted discovery-catalogue semantics: `registry/index.json` may contain summaries for assets without a tracked versioned manifest. Only entries with both a versioned manifest and present declared source files are installable.
3. The seven absent declared source files across six tracked manifests are a real pre-existing defect. The user approved an exception to add real source implementations in a later asset-content phase, outside Phase 1. Until then, those entries are not installable in source mode and documentation must state that accurately.

## Rationale

- Implementing a published on-disk layout now would invent an untestable contract; the product's published contract is URL-based and independent of an on-disk source layout.
- Populating meaningful real asset implementations is asset-content work requiring product decisions and cannot be completed as a Phase 1 foundation fix without expanding scope.
- Documentation must match executable behavior and must not hide the temporary installability limitation.

## Consequences

- ADR-012 wording is amended without changing its Accepted status or resolver behavior.
- Registry documentation distinguishes discovery summaries from installable assets.
- I-F1.12 tracks the approved later-phase source-file remediation; Phase 1 may close with this explicit exception and its residual risk recorded.

## Rejected alternatives

- Implement `published-v1` immediately: rejected because no immutable artifact tree or publication pipeline exists.
- Leave ADR-012 divergent: rejected because it violates documentation/contract synchronization requirements.
- Change manifests to non-installable discovery-only entries: rejected by user in favor of real sources later.
- Retain missing sources without documented exception: rejected because it would hide an installability defect.
