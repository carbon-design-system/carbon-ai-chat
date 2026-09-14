# prop-stability.md — documenting referential stability

Load this when you add or change a config or render prop whose **identity** matters to the chat, not just its value.

The chat's re-render hardening assumes most config and render props are referentially stable across host renders. When that assumption is load-bearing for a particular prop, the consumer cannot infer it from the type — so the JSDoc has to say it. Two cases:

- **Compared by reference** — a change of identity is treated as a real change. `serviceDeskFactory` is the model. Document that the consumer must pass a stable reference (a module-level function, or `useCallback`), and what an unstable one costs them.
- **Rebuilt from on change** — a new identity reruns expensive work even when the content is equal. `markdownItPlugins` is the model. Document that the value should be memoized.

Props the framework already diffs by value (`config`, `strings`, `markdown`) tolerate inline objects. A fresh identity every render still costs a no-op reconciliation pass, and in `debug` mode the chat warns once per such prop — so object and array props that feed expensive work should still carry a "memoize this" note even when they are value-diffed.

## Related guidance

- [src/types/AGENTS.md](../AGENTS.md) — the JSDoc bar this note has to clear
- [public-jsdoc.md](../../../../../.bob/skills/caic-copy-writer/references/public-jsdoc.md) — how to word the note itself (type 1)
- [tone.md](../../../../../references/tone.md) — voice and quick rules for public copy
