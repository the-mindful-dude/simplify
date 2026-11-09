# @simplify-dev/interaction

Framework-independent feature logic.

## Responsibilities

- `src/chat/` — conversation state, streaming, cancellation, and retry logic.
- `src/forms/` — validation and form state.
- `src/navigation/` — navigation state and active-route logic.
- `src/state/` — shared controller and state utilities with real reuse.

## Boundaries

- Must not import React, UI components, provider SDKs, or database clients.
- Exposes stable controller and state interfaces consumed by React adapters.
- Provider and storage implementations belong in integration packages.
- Unit tests must run without a React runtime.

## Status

Phase 2 placeholder. Logic implementation begins in Phase 13.
