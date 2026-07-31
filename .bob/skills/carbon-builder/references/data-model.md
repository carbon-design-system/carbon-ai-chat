# Data Model & Schema Reference

> All schemas are verified against live MCP responses and server source code
> (`codeSearchTransform.js`, `responseBudget.js`, `indexConfig.js`).

---

## code_search — Component Results

### Source-level fields

| Field             | Type   | Notes                                                                 |
| ----------------- | ------ | --------------------------------------------------------------------- |
| `component_id`    | string | Kebab-case canonical ID, e.g. `"button"`, `"data-table-skeleton"`     |
| `component_name`  | string | Display name, e.g. `"Button"`                                         |
| `component_type`  | string | `"React"` or `"Web Components"`                                       |
| `description`     | string | Short description of the component                                    |
| `version`         | string | e.g. `"v11"`                                                          |
| `framework`       | string | e.g. `"Carbon v11"` (Carbon Core) or `"ibm-products"` (IBM Products)  |
| `ibm_products`    | string | `"yes"` — present only on IBM Products results; absent on Carbon Core |
| `variants[]`      | array  | See variants schema below                                             |
| `imports[]`       | array  | Exact import statements from the story file — use verbatim            |
| `props_catalog[]` | array  | All known prop names for this component                               |
| `subcomponents[]` | array  | Companion components, e.g. `["ButtonSkeleton"]`                       |
| `storybook_title` | string | Storybook navigation title (absent when null — Web Components)        |
| `canonical_url`   | string | Component docs URL (absent when null — some Web Components)           |
| `url`             | string | GitHub source URL                                                     |
| `story_files[]`   | array  | `{ path, url }` — source story file paths                             |
| `rag_id`          | string | Unique identifier referenced in AI Chat client system prompts         |
| `last_updated`    | string | ISO timestamp — use for freshness validation                          |

**Stripped fields (never reach the client):** `search_blob`, `component_aliases_text`,
`search_tokens`, `variant_tokens`, `variants_summary`, `imports_tokens`,
`component_aliases`, `prop_enum_catalog`, `doc_kind`, `all_variants`, `all_variants_note`.
Do not reference these fields in code or reasoning.

### variants[] schema

Each element in `variants[]` is one of two shapes:

**Full variant** (example is included):

| Field                | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| `variant_id`         | Unique variant identifier, e.g. `"default"`, `"secondary"` |
| `name`               | Human-readable variant name, e.g. `"Default"`              |
| `example_clean`      | **The authoritative JSX code string — use this verbatim**  |
| `props`              | Story args object (concrete prop values wired to controls) |
| `props_used`         | Prop names applied in this example                         |
| `props_literal`      | Hard-coded prop values from story args                     |
| `variant_is_default` | `true` for the default/recommended variant                 |
| `storybook_url`      | Direct link to this variant's Storybook story              |

**Stub variant** (example was omitted to save tokens):

| Field                | Description                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `variant_id`         | Unique variant identifier                                                                 |
| `name`               | Human-readable variant name                                                               |
| `variant_is_default` | `true`/`false`                                                                            |
| `example_omitted`    | `true` — signals the example was compacted server-side                                    |
| `requery_hint`       | `{ query: string, filters: { variant_id: string } }` — use this to fetch the full example |

> **Protocol:** When you encounter `example_omitted: true`, do NOT increase `size`.
> Make one follow-up `code_search` call using **exactly** `requery_hint.query` as the
> query and `requery_hint.filters` merged into your existing filters (add
> `component_type` and `component_id` to avoid cross-component matches).
> Example follow-up: `code_search(query: requery_hint.query, filters: { ...requery_hint.filters, component_id: "modal", component_type: "React" })`.

**Stripped from all variants (never present):** `props_schema`, `example_text`,
`example_plain`, `example_tokens`, `props_catalog_text`, `props_literal_norm`,
`storybook_id`, `iframe_url`, `story_tags`, `hidden_in_docs`, `variant_role`,
`source`, `language`.

---

## code_search — Icon & Pictogram Results

Icons live in a separate index. Setting `component_type` returns zero results — omit it.
Use `filters: { asset_type: "icon" }` or `{ asset_type: "pictogram" }`.

### Icon source fields

| Field               | Description                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `name`              | Lowercase kebab name, e.g. `"add"`, `"chart--bullet"`                                      |
| `import`            | PascalCase export name, e.g. `"Add"`, `"ChartBullet"`                                      |
| `import_stmt`       | Complete import statement — **use verbatim**: `import { Add } from "@carbon/icons-react";` |
| `example`           | Minimal JSX example with `size={24}` — **use verbatim**                                    |
| `usage[]`           | Array of valid JSX snippets at each available size: `["<Add />", "<Add size={16} />", …]`  |
| `available_sizes[]` | Available pixel sizes, e.g. `[16, 20, 24, 32]`                                             |
| `package`           | NPM package: `"@carbon/icons-react"` or `"@carbon/pictograms-react"`                       |
| `type`              | `"icon"` or `"pictogram"`                                                                  |
| `asset_type`        | Same as `type` — `"icon"` or `"pictogram"`                                                 |
| `url`               | GitHub source URL for the SVG                                                              |
| `canonical_url`     | Canonical icon reference URL                                                               |
| `rag_id`            | Unique identifier                                                                          |
| `last_updated`      | ISO timestamp                                                                              |

**Do not use from icon results:** `search_tokens`, `variant_tokens`, `variants_summary`,
`sizes[]` (contains raw SVG — too large for code gen), `keywords[]`, `urls`, `repo`.
These are present but are search-index artifacts or SVG data — not useful for code generation.

> **Export name is NOT always the title-cased display name.**
> `"chart--bullet"` → `ChartBullet`, `"battery--empty"` → `BatteryEmpty`,
> `"ai--governance"` → `AiGovernance`. Always use `import` field verbatim.

---

## docs_search — carbondesignsystem.com Results

### Source fields

| Field                 | Type    | Description                                                    |
| --------------------- | ------- | -------------------------------------------------------------- |
| `page_url`            | string  | Full canonical page URL                                        |
| `anchor_url`          | string  | Deep-link URL to the specific section                          |
| `page_title_resolved` | string  | Human-readable page title, e.g. `"Modal"`                      |
| `component_id`        | string  | Component this chunk belongs to                                |
| `topic_id`            | string  | Topic identifier                                               |
| `topic_label`         | string  | Topic display label                                            |
| `page_type`           | string  | `"usage"`, `"style"`, `"accessibility"`, `"code"`, `"content"` |
| `site_area`           | string  | Site section, e.g. `"components"`, `"patterns"`                |
| `section_heading`     | string  | Section heading under which this chunk appears                 |
| `section_slug`        | string  | URL-safe slug for this section                                 |
| `section_rank`        | integer | Ordinal position of this section on the page                   |
| `chunk_title`         | string  | Full chunk title: `"Modal — Usage — When to use"`              |
| `chunk_text`          | string  | The actual documentation text — often sparse/thin              |
| `chunk_ordinal`       | integer | Position of this chunk within the section                      |
| `url_path`            | string  | URL path component, e.g. `"/components/modal/usage/"`          |
| `url_path_parts`      | string  | Space-separated path parts                                     |
| `breadcrumbs[]`       | array   | Navigation path, e.g. `["components", "modal", "usage"]`       |
| `last_crawled_at`     | string  | ISO timestamp — use for freshness validation                   |

> **`chunk_text` is often sparse.** The intro section in particular contains mostly
> navigation boilerplate. When chunk_text is thin, use `page_url` or `anchor_url` to
> direct the user to the canonical documentation page. Do not retry with larger `size` —
> try a more specific `page_type` or `section_heading` term instead.

---

## docs_search — AI Chat Docs Results

When the query triggers AI Chat routing (entity names, migration keywords),
results come from a different index with a richer schema.

### Additional fields beyond the standard docs schema

| Field                 | Description                                                                        |
| --------------------- | ---------------------------------------------------------------------------------- |
| `titleline`           | Combined page+section title: `"Migration 0.5.x -> 1.0.0 — ChatInstance.getState"`  |
| `section_slug_phrase` | URL-safe slug with punctuation preserved                                           |
| `api_symbols_text[]`  | PascalCase API symbols referenced in this chunk, e.g. `["PublicChatState"]`        |
| `url_filename`        | Source filename, e.g. `"Migration-1.0.0.md"`                                       |
| `chunk_summary`       | **Brief summary of the chunk — more reliable than `chunk_text` for triage**        |
| `md`                  | Markdown source of the chunk content — more faithful to original than `chunk_text` |
| `has_code`            | `true` when the chunk contains code samples                                        |
| `code_text`           | Any code block content extracted from the chunk                                    |
| `prev_chunk_text`     | Adjacent context — preceding chunk text (context stitching)                        |
| `next_chunk_text`     | Adjacent context — following chunk text (context stitching)                        |
| `doc_id`              | Document identifier                                                                |
| `mcp_id`              | Unique MCP-scoped identifier                                                       |
| `last_crawled_at`     | ISO timestamp                                                                      |

> **Query strategy for AI Chat docs differs from standard docs:**
> Do NOT set `component_id` or other component filters — the AI Chat docs index
> does not use these and they produce zero results. Query by API symbol name,
> type name, or migration keyword directly.

---

## get_charts Results

### tool_policy block (present in every response)

Every `get_charts` response includes a `tool_policy` block. Follow its `instruction` field.
It enforces the hard rule: no `code_search` for charts, and no `docs_search` for interfaces.

```json
{
  "tool_policy": {
    "chart_retrieval_tool": "get_charts",
    "mode": "charts_only",
    "disallow_tools": ["code_search"],
    "instruction": "For Carbon Charts examples, do not call code_search. Use get_charts only..."
  }
}
```

### `mode: "schema"` response

| Field                                   | Description                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `status`                                | `"schema_only"`                                                                |
| `chart.chart_id`                        | Normalized chart type slug, e.g. `"bar"`                                       |
| `chart.framework`                       | Resolved framework string, e.g. `"react"`                                      |
| `available_variants[]`                  | `{ variant_id, name }` — variant_ids use format like `"examples-grouped"`      |
| `default_variant`                       | Recommended `variant_id` if user has no preference                             |
| `data_schema.symbols[]`                 | Symbol names for the data array                                                |
| `data_schema.known_fields[]`            | **Empty in schema mode** — fetch with `mode: "full"` to get actual field names |
| `options_schema.symbols[]`              | Symbol names for the options object                                            |
| `options_schema.known_top_level_keys[]` | **Empty in schema mode** — fetch with `mode: "full"`                           |
| `vanilla_names[]`                       | Vanilla/HTML class names for this chart                                        |
| `framework_components`                  | Map of chart class name → source file path                                     |

### `mode: "full"` response

| Field                  | Description                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| `status`               | `"complete"` or `"incomplete_example"`                               |
| `buildable`            | `true` when source files are runnable                                |
| `chart`                | `{ chart_id, framework }`                                            |
| `chosen_variant`       | See chosen_variant schema below                                      |
| `available_variants[]` | All variants: `{ variant_id, name }`                                 |
| `source_files[]`       | Reassembled source files — see schema below                          |
| `assembly`             | Assembly hints — see schema below                                    |
| `recovery`             | Present when cross-framework fallback was used                       |
| `incomplete`           | Present when `buildable: false` — `{ reason, missing }`              |
| `user_data`            | Present when `data` arg supplied                                     |
| `user_options`         | Present when `options` arg supplied                                  |
| `variant_not_found`    | `true` if requested variant was not found; server used closest match |
| `variant_note`         | Explains which variant was used when `variant_not_found: true`       |

#### chosen_variant schema

| Field                  | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| `variant_id`           | Variant identifier, e.g. `"examples-grouped"`                 |
| `name`                 | Human-readable variant name                                   |
| `variant_is_default`   | `true` for the default variant                                |
| `import_hint`          | Framework import statement — **use verbatim**                 |
| `usage_hint`           | Component usage template — **substitute data/options only**   |
| `example_quality`      | `"runnable"`, `"partial"`, `"cross_framework_recovery"`, etc. |
| `has_concrete_data`    | `true` when example data array is indexed                     |
| `has_concrete_options` | `true` when example options object is indexed                 |

#### source_files[] schema

| Field       | Description                                                                    |
| ----------- | ------------------------------------------------------------------------------ |
| `path`      | File path within the example                                                   |
| `file_role` | `"variant"` (data+options), `"dependency"`, or `"framework_component"`         |
| `code`      | Full reassembled file content — use the `"variant"` role file for data/options |
| `imports`   | Import statements found in the file                                            |
| `exports`   | Export statements found in the file                                            |

#### assembly schema

| Field             | Description                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| `install_command` | Terminal command to install packages — **run before completion**        |
| `styles_import`   | CSS import for entry module — **never in SCSS, never `@use`/`@import`** |
| `builder_call`    | Derived invocation string                                               |
| `instruction`     | Server-generated code generation instruction — **follow exactly**       |

---

## meta object (budget condensing only)

The `meta` object is **only present when the server's response budget guard fires**
(`MCP_RESPONSE_BUDGET_ENABLED=true`, which is disabled by default). Do not expect
it in standard responses. When present:

| Field                       | Description                                                                   |
| --------------------------- | ----------------------------------------------------------------------------- |
| `response_condensed`        | `true` — payload was compacted beyond Stage 1 stripping                       |
| `original_estimated_tokens` | Token estimate before condensing                                              |
| `follow_up_required`        | `true` — run one call from `follow_up_calls` before finalizing                |
| `follow_up_calls[]`         | Exact `code_search` argument objects to retrieve omitted content              |
| `next_step`                 | Plain-text instruction: `"Run code_search with one of meta.follow_up_calls…"` |

> **The `example_omitted: true` / `requery_hint` pattern on individual variant stubs
> fires unconditionally — it does not require budget condensing to be enabled.**
> This is the primary follow-up signal; treat it as always-active.

---

## AI Chat Code Results (served via `code_search`)

When the query targets AI Chat sample code (`"ai chat"` + framework in query),
results come from the AI Chat code index with these fields:

| Field              | Description                                                                  |
| ------------------ | ---------------------------------------------------------------------------- |
| `doc_id`           | Parent document identifier — join key between manifest and chunks            |
| `rag_id`           | Globally unique identifier                                                   |
| `example_root`     | Path: `"examples/react/basic"`, `"examples/web-components/history"`, etc.    |
| `framework`        | `"react"` or `"web-components"`                                              |
| `example`          | Example root name: `"basic"`, `"history"`, `"watsonx"`, etc.                 |
| `path`             | File path within the example, e.g. `"examples/react/basic/App.tsx"`          |
| `filename`         | File name, e.g. `"App.tsx"`                                                  |
| `code`             | Full file content (or reconstructed from chunks)                             |
| `title`            | Human-readable title                                                         |
| `description`      | Example description                                                          |
| `component_type`   | `"React"` or `"Web Components"`                                              |
| `example_files[]`  | **Authoritative list of all files in this example** — use as source of truth |
| `is_complete_file` | `true` when server has auto-reconstructed a multi-chunk file                 |
| `last_updated`     | ISO timestamp                                                                |
