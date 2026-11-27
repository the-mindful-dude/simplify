# Documentation — T-037b

status: complete

Scope: `TODO.md` only (lease honored). No source, config, ledger, or other documentation was modified. No commit made.

## Updated

- `TODO.md:24` — added a concise dated `Update (2026-11-22)` note in the Verified Status section recording the final gate results and per-package test counts, all five sign-offs (reviewer T-033b, security T-034b, performance T-035, UI T-036, architect ADR-005/006), the verified local webhook/provenance scope, the explicit local-foundation-not-hosted-publishing boundary, and the still-blocked Phase 8. It also records that Phase 4.5/7.4 were already checked at base `b63b1b9` and names the only two newly checked boxes.
- `TODO.md:911` (15.1) — checked `Implement loading, empty, error, and not-found states.` Directly verified by the final tree's route-level `loading.tsx`, `error.tsx`, `not-found.tsx`, `data-error.tsx`, and `catalog-skeleton.tsx` changes plus build and rendered-DOM smoke evidence.
- `TODO.md:1030` (17.1) — checked `Verify webhook signatures and reject unauthenticated events.` Directly verified by HMAC-before-parse in the handler and the HTTP test asserting 401 for a bad signature. No other Phase 17 box was changed.

Checkbox counts: **checked 401 → 403**, **unchecked 553 → 551**, total unchanged at 954. Net +2 checked, both listed above. Phase 8 (section 8.1–8.10 and its status line), hosted publishing, deployment, auth tokens, external publish, API-reference, and completion-criteria boxes were left untouched and unchecked.

## Verified against

- `git diff b63b1b9 -- TODO.md` (before edit) — empty; Phase 4.5 (`:255-269`) and 7.4 (`:398-408`) were already fully `[x]` at the base commit, so no boxes there needed changing despite being named as likely candidates in the brief.
- `package.json` scripts — `dev:webhooks`, `webhook:tunnel`, `webhook:send` exist; `.prettierrc.json` printed only, no doc build/lint gate declared.
- `packages/github/src/webhooks/handler.ts:52-55` — `x-hub-signature-256` verified before parse; `:61-74` atomic claim and duplicate 200; `:91-99` lifecycle dispatch; `:100-108` failed-status recording.
- `apps/registry-api/test/server.test.ts:120-161` — 200 with only the webhook secret configured; 401 with generic `{ error: 'invalid_signature' }` body.
- `packages/github/test/webhook-hardening.test.ts:71-90,92-127,129-232` — webhook-only config, concurrent atomic claims, lifecycle dispatch, link-store adapter, and failed delivery status.
- `apps/web/app/loading.tsx:1-6`, `error.tsx:12-37`, `not-found.tsx:6-29`, `components/data-error.tsx:6-60`, `lib/status-data.ts:10-57`, `.agents/reports/T-032b-design.md:18-25,57-74` — loading/empty/error/not-found states implemented with static code-keyed copy and documented DOM markers.
- `.agents/reports/T-034b-security.md:39-54,86-88` — controls verified (HMAC-before-parse, SHA validation, fail-fast provenance, no local immutable claim) and three low local-dev findings; verdict Approved.
- `.agents/decisions/ADR-005-credential-free-webhook-boundaries.md:1-3` and `ADR-006-publication-provenance-boundary.md:1-6,54-72` — both accepted; immutable records belong to Phase 8 registry publishing, not local builds.
- `.agents/ledger.yaml:3,665-676` — base head `b63b1b9`, final gate list, and Phase 8 blocker.
- `pnpm exec prettier --check TODO.md` → exit 0, "All matched files use Prettier code style!".

## Not updated

- `Phase 8` (sections 8.1–8.10, `:412` status line), `Completion Criteria`, and Phase 19 deployment/publishing items — explicitly blocked or unverified; no GitHub App credentials or hosted publishing exist.
- `Phase 4.5` and `7.4` — all boxes already checked at base `b63b1b9`; changing them was unnecessary. No existing box was unchecked.
- `17.1` lines other than signature verification (e.g. duplicate/delayed/out-of-order testing, publication provenance for auditing) — only duplicate delivery is tested; delayed/out-of-order and registry-side publication audit are not implemented.
- `.agents/ledger.yaml`, ADRs, reports, and all source/config files — outside the `TODO.md` lease.

## Unverified or ambiguous

- Final gate results and sign-offs in the note are transcribed from the task brief. I did not independently re-run `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build`; the verification step in the brief required only `pnpm exec prettier --check TODO.md`, which passed. Coordinator retains the full gate evidence (T-038).
- Report files for T-033b, T-035, and T-036 are not present under `.agents/reports/`; their sign-off wording is taken verbatim from the task brief. T-034b's report file exists and independently says Approved.
- Per-package test counts differ between the brief (tooling 55, github 27, registry-api 15) and `.agents/reports/T-032b-design.md:54` (tooling 35, github 28, registry-api 13, possibly file counts or an intermediate state). The note uses the brief's final numbers; no other count was invented.
- No claim was made about real GitHub webhook delivery, browser/axe accessibility testing, or Phase 8 publication; the note explicitly excludes all three.

## Links and examples checked

- No Markdown links, anchors, or new code examples were added; only a prose note and two checkbox markers changed.
- The `pnpm …` commands quoted in the note match the five root scripts/commands named in the task brief; `pnpm exec prettier --check TODO.md` was executed with exit 0.
- Full `git diff -- TODO.md` was re-read after editing: 4 insertions, 2 deletions, no other lines touched.

## Next safe action

- Coordinator reviews the two newly checked boxes and the note, then proceeds with T-038 integration/gates. No further documentation work remains for T-037b.
