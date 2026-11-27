# `@simplify-dev/module-core`

Framework-independent contracts and pure infrastructure shared by the private
frontend modules (`modules/app`, `modules/registry` and future domains). This
package is private to the application workspace and is never published.

It deliberately has no React components, no `next/*` imports, no filesystem or
network I/O, and no domain entity types such as assets or libraries.

## Public API

Everything is exported from the single package entry point
(`@simplify-dev/module-core`). Deep imports are not supported.

### `AsyncState<T>`

A discriminated result contract returned by repository ports:

| `status`  | Payload                  | Meaning                                     |
| --------- | ------------------------ | ------------------------------------------- |
| `loading` | —                        | The request has started, no result yet.     |
| `empty`   | —                        | Success with no usable value.               |
| `error`   | `error: RepositoryError` | The request failed with a structured error. |
| `success` | `data: T`                | Success with a value.                       |

Consumers switch on `status`. `AsyncLoadingState`, `AsyncEmptyState`,
`AsyncErrorState` and `AsyncSuccessState<T>` are exported for explicit
annotations.

### `RepositoryError`

`new RepositoryError({ code, message, cause?, details? })` extends `Error` and
adds:

- `code`: one of `not_found`, `invalid_input`, `unavailable`, `conflict`, `unknown`.
- `message`: an actionable, human-readable explanation.
- `cause`: the original failure, preserved through the standard `Error` option.
- `details`: a defensively copied and frozen record of diagnostic context.

`details` must never contain secrets or credentials. Domains map `code` to
state presentation; do not expose `details` verbatim to end users.

### `APP_ROUTES` and navigation types

`APP_ROUTES` is a frozen table of stable application-relative paths. `AppRoute`
is the union of its values. `NavContribution` is the plain data a domain passes
to the shell through the composition root; `Workspace` is the local workspace
preference type used by the shell switcher. These are cross-domain contracts
only: route policy, `navConfig` and switcher components belong to `modules/app`.

### `createAppQueryClient()`

Returns a fresh `QueryClient` on every call. Defaults are explicit: `staleTime`
of 30 seconds and `gcTime` of 5 minutes. Each client owns its query and mutation
caches; no module-global client exists. Callers own the lifecycle — one client
per browser session on the client and one per request on the server.

## Boundaries

- Depends only on `@tanstack/react-query`, and only for the `QueryClient` class.
- No workspace dependencies: this module has no outgoing workspace edge.
- No I/O, framework code, JSX, domain entities or design-system imports.

## Scripts

```sh
pnpm --filter @simplify-dev/module-core test
pnpm --filter @simplify-dev/module-core typecheck
pnpm --filter @simplify-dev/module-core lint
pnpm --filter @simplify-dev/module-core build
```
