<!-- Template only. Not an example; not indexed. Copy this into <slug>/README.md and fill in every section. Relative paths assume the final location is examples/<flavor>/<slug>/README.md. -->

# Example README template

Copy the body below into `<slug>/README.md` and fill in every section. Do not leave `<...>` placeholders. See [AGENTS.md](AGENTS.md) for the Indexer contract that drives required sections.

---

# <Title>

<One-sentence summary of what this example demonstrates.>

## What this example shows

- 2–5 bullets describing concrete capabilities.
- Each bullet names a user-visible behavior, not an internal detail.

## When to use this pattern

- Scenarios this pattern is suited for.

## APIs and props demonstrated

| Symbol | Kind | Role in this example |
| ------ | ---- | -------------------- |
| …      | …    | …                    |

List every public API, prop, event, slot, hook, custom-element tag, or attribute the example exercises. Column headers differ by flavor — see the flavor `AGENTS.md`.

## Run it

**Prerequisite — build the core packages first.** Examples consume the built output of `@carbon/ai-chat-components` and `@carbon/ai-chat`; without this step the dev server fails with missing-module errors. See [../AGENTS.md](../AGENTS.md) for setup.

From the repository root:

```bash
npm install
npm run build --workspace=@carbon/ai-chat-components
npm run build --workspace=@carbon/ai-chat

npm run start --workspace=<workspace-name>
```

See [../README.md](../README.md) for the full setup walkthrough.
