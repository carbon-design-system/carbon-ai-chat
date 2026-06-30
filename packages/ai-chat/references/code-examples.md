# code-examples.md — writing code examples

What makes a good code example on the `@carbon/ai-chat` public surface. JSDoc `@example` blocks and docs-site snippets render to the TypeDoc site, an Elasticsearch index, and an MCP server — so a block is read two ways: by a human pasting it, and by a coding agent that retrieves it **with no surrounding code**. Write for both.

Applies to `@example` blocks in [src/types/](../src/types) (see [src/types/AGENTS.md](../src/types/AGENTS.md) for where `@example` is required) and to snippets in [docs/](../docs) (see [docs/AGENTS.md](../docs/AGENTS.md) for the test-it workflow).

## Principles

Each rule below comes with its _why_ — the why changes how you apply it.

- **Self-contained & runnable as written.** Put the imports and an entry point inside the block; call only the public surface; import only from `@carbon/ai-chat` (never `@carbon/ai-chat/src/...`). Mark a deliberate omission with a real language comment (`// … your render logic`), never a bare `...`. _An agent retrieves the block with no neighbors, and a human pastes it — anything off-screen is lost._
- **Minimal.** Roughly 5–25 lines. Show only the API being documented; drop unrelated config, providers, and deps. _Noise hides the one call the reader came for._
- **Realistic, well-typed values — never `foo` / `bar`.** Arguments are the de-facto schema docs; concrete, correctly-typed values (`{ id: "rating", type: "number", value: 4 }`) tell the reader the shape. _Placeholder junk forces agents to guess the schema and guess wrong._
- **One _titled_ `@example` per distinct case.** Give each mode, overload, or scenario its own `@example` with a title line (TSDoc renders the first line as the caption). Don't cram add/replace/clear into one fence separated by `//` comments. _Search and the MCP index surface blocks individually; a titled block stands alone._
- **Show what comes back.** For a method that returns or resolves a value, show the caller using it, with the result annotated inline (`// => …`). _The return shape is half the contract; a call that drops the result documents only half._
- **Model the correct pattern, not the shortest.** Examples are copied verbatim into production, so make the example production-safe: `await` promises, clean up listeners, memoize where the API demands it, and call out footguns inline. Never reach for a deprecated API for brevity. _The shortest snippet teaches the wrong habit at scale._

## Titled `@example` — the TSDoc shape

The first line after `@example` is the title; the fenced code follows. One block per case. The title is taken **literally** — keep it plain text, no `{@link}` or markdown (TypeDoc warns otherwise).

````ts
/**
 * @example Add a field to the pending structured data
 * ```ts
 * instance.input.updateStructuredData((prev) => ({
 *   ...prev,
 *   fields: [...(prev?.fields ?? []), { id: "rating", type: "number", value: 4 }],
 * }));
 * ```
 *
 * @example Replace all pending structured data
 * ```ts
 * instance.input.updateStructuredData(() => ({
 *   fields: [{ id: "selection", type: "multi_select", value: ["a", "b"] }],
 * }));
 * ```
 *
 * @example Clear the pending structured data
 * ```ts
 * instance.input.updateStructuredData(() => undefined);
 * ```
 */
````

**Good** (above): three titled blocks. Each renders as its own captioned example, is retrievable in isolation, and reads as one complete call.

**Bad** (the same content, today's shape): one `@example` with all three cases stacked inside a single fence, divided by `// Add a field…` / `// Replace…` / `// Clear…` comments. The reader can't tell where one case ends, search returns the whole blob, and the title is empty.

## Sources

External best practice these principles draw on:

- [Google — code samples](https://developers.google.com/style/code-samples)
- [MDN — code example guidelines](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Code_style_guide)
- [TSDoc — `@example`](https://tsdoc.org/pages/tags/example/)
- [Fern — how to write LLM-friendly documentation](https://buildwithfern.com/post/how-to-write-llm-friendly-documentation)

## Related guidance

- [src/types/AGENTS.md](../src/types/AGENTS.md) — where `@example` is required, plus JSDoc rules (`@category`, `{@link}`, content bar)
- [docs/AGENTS.md](../docs/AGENTS.md) — testing docs-site snippets in `examples/`
- [tone.md](../../../references/tone.md) — voice and word economy for public copy
- [packages/ai-chat/AGENTS.md](../AGENTS.md) — package overview
