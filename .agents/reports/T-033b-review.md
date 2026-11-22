# Review — T-033b

status: APPROVE
owner: reviewer
mode: READ-ONLY
scope: full working-tree diff against `b63b1b9`; prior findings F1-F4 and ADR-006 work.

## Summary

All four prior `CHANGES REQUIRED` findings are resolved:

- F1: signed-request helper moved from the `packages/github` production API into `apps/registry-api/src/dev/`; stale generated artifacts removed.
- F2: `WebhookDeliveryStore` reduced to `record()` and `claim()`; the remaining `get()` is a concrete in-memory test helper only.
- F3: stale "T-030 / after that lands" wording removed from dev scripts and env documentation.
- F4: canonical `WebhookReceiverConfig` / `loadWebhookReceiverConfig` live in `packages/github/src/webhooks/webhook-config.ts`, with compatibility aliases and matching ADR text.

ADR-006 implementation matches the accepted design: `ProvenanceCandidate` has no `immutable` or `verified` keys, strict SHA and repository validation is fail-fast before writes, publisher is an attributed claim, and `GITHUB_ACTIONS` correlation is validation rather than authentication. Tests cover uppercase/lowercase SHA, invalid lengths, non-hex, all-zero, hostile repository forms, valid URL/scp/bare forms, Actions match/mismatch, precedence, and absence of immutable claims.

## Verification observed by reviewer

- `pnpm --filter @simplify-dev/tooling test` -> 55/55.
- `pnpm --filter @simplify-dev/cli test` -> 205/205.
- `pnpm --filter @simplify-dev/github test` -> 27/27.
- `pnpm --filter @simplify-dev/registry-api test` -> 15/15.
- `pnpm format:check` -> exit 0.
- `pnpm lint` and `pnpm typecheck` -> 19/19 each.
- No credentials, debug artifacts, or public-contract leaks found.

## Non-blocking notes

- `BuildMetadata.sourceCommitSha` remains typed `string | null` despite fail-fast behavior; cosmetic.
- `handler.ts:85` marks any `create` event as `stableReleaseCandidate`; pre-existing and unchanged.
- Reviewer did not rerun full `pnpm test` / `pnpm build`; coordinator ran both on the final tree.

## Verdict

APPROVED for integration, with coordinator final full-gate rerun completed after this review.
