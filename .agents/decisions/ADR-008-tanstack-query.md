# ADR-008 — TanStack Query as the web data/cache layer

- Status: proposed
- Date: 2026-11-23
- Owners: architect
- Related tasks: T-P004, T-P005; user decision `.agents/decisions/DECISION-FE-FOUNDATION-001.md:10`

## Context

Observed facts:

- `apps/web/components/registry-browser.tsx:90-108,235-307` keeps filter, sort, library selection and detail-dialog state in component `useState`/`useMemo`; `apps/web/components/registry-content.tsx:12-37` passes the whole server snapshot down as props.
- `T-P002C:13` found no `@tanstack/*`, `react-query`, `swr` or other data cache in manifests, lockfile or source.
- The web has no dedicated data route; `apps/web/lib/registry-data.ts:190-273` reads the on-disk registry in a server component.
- `AGENTS.md:103` forbids introducing competing tools/unnecessary dependencies; no locked decision names a client data cache.

Forces: the redesign needs domain-owned loading/error/empty states, request deduplication and invalidation across navigation, and a single server data entry point that does not duplicate registry path logic.

## Decision

1. Adopt **`@tanstack/react-query`** as the single web data/cache library. No parallel cache/fetch abstraction; no `swr`, Redux, Zustand or hand-rolled request cache.
2. `modules/core` owns `createAppQueryClient()` and the `AsyncState<T>`/`RepositoryError` contracts. It must not export a module-global `QueryClient`.
3. `modules/app` owns the React provider (`AppProviders`) that instantiates **one QueryClient per browser session on the client and one per request on the server**, via lazy `useState`/request-scoped factory. No ambient singleton: cross-request cache sharing is forbidden (`AGENTS.md:495`, §6 isolation).
4. Each domain owns its own query-key namespace and hooks (`modules/registry` => `['registry', ...]`; future domains => `['dashboard', ...]`, etc.). Domains never import another domain's keys. Core owns only a key helper type, never a central key registry.
5. Server components use the repository to prefetch/hydrate the same keys the client hooks read. A client refetch, if required by a phase, goes through a narrow `apps/web` route handler or server action that calls the same repository — never a second data implementation.
6. Loading, error and empty **presentation** components (`Skeleton`, `Spinner`, `EmptyState`, error state) live in `@simplify-dev/ui`; domains own only the state mapping and content.

## Alternatives considered

| Alternative                                                 | Why rejected                                                                                                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continue prop-drilling the snapshot with `useState` filters | Keeps data/filter logic in one client component (`registry-browser.tsx:90-108`), blocks domain ownership of states and invalidation; does not satisfy the redesign. |
| SWR / Redux / Zustand                                       | Adds a competing tool with no requirement; violates `AGENTS.md:103`.                                                                                                |
| Hand-rolled cache in `modules/core`                         | Duplicates a mature, tested capability and invites unbounded shared mutable state; rejected per abstraction-at-boundaries rule.                                     |
| Module-global QueryClient                                   | Leaks cache between SSR requests and users; violates isolation and horizontal-scaling requirements.                                                                 |

## Consequences

Positive: domain-owned queries and states; dedup/invalidation; testable hooks with injected repositories; server and client share one key contract.

Negative: new runtime dependency; hydration wiring needed; must enforce per-request client creation in review and tests.

Neutral: existing published packages unchanged; CLI and `apps/registry-api` untouched.

## Boundary and dependency impact

Added: `modules/core -> @tanstack/react-query` (types/factory only), `modules/app -> @tanstack/react-query`, each domain -> `@tanstack/react-query`. No edge from any published package or `apps/registry-api` to TanStack Query. No change to `apps/registry-api` (still `github` only).

## Migration plan

1. Add dependency to `modules/core`/`modules/app`/domain manifests; update `pnpm-lock.yaml` per ADR-002 (no builds/tests in the architecture phase).
2. Add factory + provider with tests asserting distinct clients across two "requests".
3. Introduce `modules/registry` hooks alongside the existing server snapshot; both read the same data during a transition commit.
4. Move client filter/sort/detail state into domain hooks; delete the duplicated logic from `registry-browser.tsx`.
5. Rollback: remove hooks and provider, restore prop-drilling commit; the repository adapter remains valid independently.

## Risks

| Risk                             | Likelihood | Impact | Mitigation                                                                                                   | Owner                  |
| -------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Cache leaks between SSR requests | medium     | high   | Request-scoped factory; boundary test with two requests                                                      | implementer + reviewer |
| Unbounded cache/query growth     | medium     | medium | Explicit `staleTime`/`gcTime` defaults in `createAppQueryClient`; no unlimited polling; document defaults    | implementer            |
| Two hydration paths diverge      | low        | high   | Server prefetch and client hook must use the same domain query key and repository; single test covering both | reviewer               |

## Verification

- Exactly one data-cache dependency across the workspace; no `swr`/Redux/Zustand.
- Tests prove per-request client isolation and domain key namespacing.
- Loading/error/empty rendering uses `packages/ui` primitives only; no bare native controls.
