# Coordinator workspace

- `ledger.yaml` — single source of truth for task state, leases, evidence, commits.
- `ownership.yaml` — path ownership map; one mutating owner per leased path.
- `decisions/` — material decisions and user Q&A resolutions.
- `reports/` — subagent findings and handoffs.

Only the coordinator writes under `.agents/**`. All source, test, config, build,
and documentation changes are delegated to specialist subagents.
