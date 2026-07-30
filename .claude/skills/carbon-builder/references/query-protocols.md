# Query Protocols

## Core Strategy: Discover → Canonicalize → Target

### Phase 1 — Discover (1–2 calls)

- Use broad query terms to identify the correct `component_id`
- Do not set `component_id` yet — you are still discovering it
- Use `size: 2`

### Phase 2 — Canonicalize

- Confirm the `component_id` from discovery results
- Handle aliases: normalize spaces ↔ hyphens, fold case
- Apply UIShell taxonomy cues where relevant (see UIShell section below)

### Phase 3 — Target (1–2 calls)

- Set `filters.component_id` to the confirmed ID
- Set `filters.component_type` to the requested framework
- Add `filters.ibm_products` if product scope is known
- Use `size: 2`

---

## Component Identification Protocol

Before setting `filters.component_id`, follow this sequence:

1. **Discovery query** — broad text query, no `component_id` filter
2. **Inspect results** — read `component_id`, `component_name` from the source
3. **Canonicalize** — pick the exact `component_id` string returned by the server
4. **UIShell cues** — for nav/header/sidebar components, try:
   - `"header navigation"`, `"ui shell"`, `"side nav"`, `"shell header"`
5. **Set `component_id`** — only after confirming it from a real result

> **`component_id` filter uses partial analyzed text matching.** The server applies
> `flexibleExactMatcher` which includes a `match` clause with `operator: "and"`.
> This means `component_id: "data-table"` can match `"data-table-skeleton"` because
> both tokenize to `["data", "table"]`. Always verify the result's `component_id`
> field matches exactly what you searched for, and drop the filter if you get
> mis-matched results.

---

## Stub Variant Protocol: `example_omitted` + `requery_hint`

The server returns full code for the top 2 most-relevant variants and the default
variant. All other variants become stubs with `example_omitted: true`.

**This fires unconditionally — it is not related to budget condensing.**

**Wrong — increasing size:**

```json
{
  "query": "Modal danger",
  "filters": { "component_type": "React" },
  "size": 10
}
```

This wastes tokens on additional components instead of fetching the variant you want.

**Correct — use `requery_hint`:**

```json
// Variant stub in result:
{
  "name": "DangerModal",
  "variant_id": "danger-modal",
  "example_omitted": true,
  "requery_hint": { "query": "modal danger", "filters": { "variant_id": "danger-modal" } }
}

// Follow-up call — add component_id to prevent cross-component matches:
{"query": "modal danger", "filters": {"component_id": "modal", "component_type": "React", "variant_id": "danger-modal"}, "size": 1}
```

> **⚠ Never put framework names (`"react"`, `"web components"`) in code_search query
> text for component queries.** These trigger AI Chat code routing and send all passes
> to the AI Chat index — the component will never be found. Express the framework via
> `filters.component_type` only. Include `"ai chat"` only when you actually want AI Chat
> example results.

---

## Smart Filters

| Filter           | When to set                                                          |
| ---------------- | -------------------------------------------------------------------- |
| `component_type` | Always when framework is known (React or Web Components)             |
| `component_id`   | Only after discovery/canonicalization — never guess                  |
| `ibm_products`   | When user explicitly mentions IBM Products or Carbon Core            |
| `asset_type`     | For icon/pictogram queries only — omit for components                |
| `page_type`      | For docs queries — `"usage"`, `"style"`, `"accessibility"`, `"code"` |

### `ibm_products` filter behavior

- `ibm_products: "yes"` — queries only the IBM Products index; `framework` field in results is `"ibm-products"` (not `"Carbon v11"`)
- `ibm_products: "no"` — generates a `must_not: [{ exists: { field: "ibm_products" } }]` query; excludes ALL results that have an `ibm_products` field
- Omitting `ibm_products` — queries both Carbon Core and IBM Products indexes

---

## Special Case: Carbon Charts

**Hard rule: never use `code_search` for Carbon Charts. Use `get_charts` only.**

Use the 2-call convention:

**Call 1 — discover variants and schema:**

```json
{ "framework": "react", "chart_type": "bar", "mode": "schema" }
```

**Call 2 — fetch source and assembly hints:**

```json
{
  "framework": "react",
  "chart_type": "bar",
  "variant": "examples-grouped",
  "mode": "full"
}
```

> Note: `available_variants[].variant_id` values use the format `"examples-grouped"`,
> not just `"grouped"`. Copy the exact `variant_id` string from the schema response.

Supported frameworks: `react`, `angular`, `vue`, `svelte`, `vanilla`, `html`

Chart type slugs: `bar`, `line`, `pie`, `donut`, `area`, `scatter`, `bubble`,
`combo`, `radar`, `treemap`, `heatmap`, `gauge`, `meter`
(use `bar` for column charts; use `donut` for doughnut)

Input contract: provide `framework` + `chart_type`, OR `doc_id`, OR `rag_id`.

See [charts-protocols.md](charts-protocols.md) for the full protocol including
assembly hints, buildability, TypeScript interface lookup, and error recovery.

---

## Special Case: Icons & Pictograms

> **Hard rule: Never include an icon or pictogram in generated code without first querying
> `code_search` to confirm it exists. Use the exact `import` field from the MCP response —
> never invent or assume an icon export name.**

When the query clearly indicates an icon or pictogram:

- Use `code_search`
- Do NOT set `filters.component_type` or `filters.ibm_products`
- Set `filters.asset_type: "icon"` or `"pictogram"`
- **Use the shortest possible query — just the icon name:** `"Add"`, not `"Add icon carbon react"`
  Verbose queries de-rank the target icon relative to partial matches on other icons

**Wrong:**

```json
{ "query": "Add icon carbon react", "filters": { "component_type": "React" } }
```

**Correct:**

```json
{ "query": "Add", "filters": { "asset_type": "icon" } }
```

Icon export name from the result: use `source.import` (e.g. `"Add"`) verbatim in:

```js
import { Add } from "@carbon/icons-react";
```

Normalize slugs: `ai governance` → `ai-governance`; probe `ai--governance` if 0 hits.
If still 0 hits after targeted query, retry without `asset_type`.

---

## Special Case: DataTable

**DataTable (`component_id: "data-table"`) is not in the `code_search` index.**
This is a crawler/ingestion gap — the document was never indexed. No query variation
will surface DataTable code examples via `code_search`. Only `data-table-skeleton`
exists in the index.

**Recovery strategy:**

1. Use `docs_search` to retrieve the Storybook URL and usage guidance:
   ```json
   {
     "query": "DataTable",
     "filters": { "component_id": "data-table", "page_type": "code" },
     "size": 3
   }
   ```
2. Share the `page_url` / `anchor_url` from the result — this is the authoritative source
3. Tell the user DataTable is not in the code index, then generate from first principles
   using the Carbon docs and known sub-components: `TableContainer`, `TableHead`,
   `TableRow`, `TableBody`, `TableCell` from `@carbon/react`

---

## Special Case: Carbon AI Chat Docs

Use `docs_search`. The server auto-routes to the AI Chat index when queries contain relevant
entity names or migration keywords.

**Rules:**

- Do NOT set `filters.component_type`, `filters.component_id`, or `filters.ibm_products`
- Query directly with API/type names or migration topics
- If upgrade/migration context exists, include `"migration-1.0.0"` in the query
- In results, prefer `chunk_summary` over `chunk_text` for triage — it's a concise
  pre-computed summary and more reliable than the full chunk for deciding relevance

**Example queries:**

```json
{"query": "PublicChatState", "size": 3}
{"query": "ChatInstance methods", "size": 3}
{"query": "PublicConfig baseUrl", "size": 3}
{"query": "migration-1.0.0 breaking changes", "size": 3}
{"query": "custom server configuration", "size": 3}
{"query": "service desk setup", "size": 3}
```

> **Note:** Routing triggers include entity names like `ChatInstance`, `PublicChatState`,
> `PublicConfig`, and keywords like `migration-1.0.0`, `custom server`, `service desk`,
> `ai chat`. Generic words like `"assistant"` alone do NOT trigger AI Chat docs routing
> and will query the main docs index instead.

---

## Special Case: Carbon AI Chat Code Examples

Use `code_search` when the user asks for AI Chat sample applications or snippets.

**Rules:**

- Set `filters.component_type` per the framework guardrail (default React)
- Do NOT set `filters.ibm_products`
- Include: `"ai chat"` + framework + example root in the query
- Use `size: 15` when fetching a full example (enough to surface all files)

**Example roots:** `basic`, `custom-element`, `history`, `watsonx`, `watch-state`

**Example queries:**

```json
{"query": "ai chat react basic", "size": 15, "filters": {"component_type": "React"}}
{"query": "ai chat web components custom element", "size": 15, "filters": {"component_type": "Web Components"}}
```

**For specific file retrieval:**

```json
{
  "query": "ai chat web components history customLoadHistory.ts",
  "size": 1,
  "filters": { "component_type": "Web Components" }
}
```

---

## Efficient Pagination & Chunk Handling

1. Use `size: 2` for all `code_search` component and icon queries; `size: 3` for `docs_search`
2. Use `size: 15` for full AI Chat example file sets (code_search)
3. Use `size: 1` for `requery_hint` follow-up calls
4. Never increase `size` to fetch a specific variant — use `requery_hint` instead
5. **Do not manually assemble multi-chunk files** — the server reconstructs them automatically
6. For AI Chat examples, inspect `example_files` on the top hit as the authoritative file list
7. Check `chunk_ordinal` to understand where in a section a chunk falls; docs content is sparse
   so additional queries rarely improve results — prefer sharing the `page_url` instead
