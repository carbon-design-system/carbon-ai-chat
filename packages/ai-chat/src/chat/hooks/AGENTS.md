# AGENTS.md — chat hooks

Pair each hook with a plain module: `useWindowOpenState` uses `../services/windowOpenState.ts`. Put functions and setup/cleanup helpers in `../utils/`, and stateful classes in `../services/`. A provider may wire the core, as with `useAriaAnnouncer`.

- Keep React context, refs, effects, render subscriptions, and icon conversion in the adapter.
- Pass values, DOM nodes, or narrow callbacks to the core. Its runtime dependencies must also be React-free.
- The creating view owns these classes; do not register them in `ServiceManager`.
- Keep constructors free of external effects. Connect after mount; apply changed inputs at commit time.
- Make cleanup safe to repeat. Invalidate pending work, including completion after reconnect.
- Keep observable snapshots stable until state changes. Preserve editor object identity and lazy loading.
- Context access and React lifecycle hooks need no new core. Reuse existing plain helpers and the React 17 selector shim.

## Related guidance

- [Read before changing package code](../../../AGENTS.md) — package rules.
- [Read when choosing where logic belongs](../../../../../references/code-patterns.md#framework-agnostic-logic) — the shared logic boundary.
- [Read when writing tests](../../../references/tests.md) — test layout and commands.
