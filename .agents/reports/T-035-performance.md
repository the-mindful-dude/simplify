# Performance — T-035

status: APPROVED
owner: performance
mode: READ-ONLY

## Baseline comparison

Baseline captured at `b63b1b9`:

- `/` first-load uncompressed JS: 609,447 B across 6 chunks.
- `/_not-found` first-load uncompressed JS: 457,165 B across 5 chunks.
- All static chunks: 722,041 B.
- Registry data: 18,288 B, 39 assets, 7 libraries.

Post-change review found no unexplained bundle or runtime regression. New status UI composes existing `@simplify-dev/ui` primitives and existing CSS modules; no new runtime dependency was added. The web build remains static and successful, and no webhook load harness was added.

## Notes

- Absence of a tracked webhook load harness is non-blocking for the local foundation; the signed local sender and HTTP tests exercise the credential-free path.
- Two non-fatal Turbopack warnings remain for dynamic filesystem access in `apps/web/lib/registry-data.ts`; they were present in the observed build output and are not a build failure.
- Final coordinator rerun: `pnpm test` -> 19/19 tasks; `pnpm build` -> 11/11 tasks.

## Verdict

Performance sign-off granted. No required remediation.
