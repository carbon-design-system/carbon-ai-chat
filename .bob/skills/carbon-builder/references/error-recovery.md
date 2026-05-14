# Error Recovery & Performance

## Error Recovery Protocol

### Carbon Charts Errors

**Hard rule: never fall back to `code_search` for chart errors.**

| Error                       | Recovery                                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `error: "not_found"`        | 1. Try a closely related chart type slug (`"column"` → `"bar"`, `"doughnut"` → `"donut"`). 2. Try a different framework if user permits. 3. Report to user. |
| `error: "chunks_not_found"` | Source code is not indexed. Run `mode: "schema"` to confirm the manifest exists and inspect `available_variants`. Report to user.                           |
| `buildable: false`          | Inspect `incomplete.reason` and `incomplete.missing`. Suggest a different variant from `available_variants`. Do not call `code_search`.                     |
| `variant_not_found: true`   | Server substituted the closest match. Inform the user which variant was used (`result.variant_note`).                                                       |
| `recovery` object present   | Use cross-framework donor source files for data/options; keep requested-framework `import_hint`/`usage_hint`. Follow `assembly.instruction` exactly.        |

---

### Zero or Low Hits After Discovery

If the initial discovery query returns 0 or unexpectedly few results:

1. **Normalize the alias** — try spaces ↔ hyphens; fold case
   - `"DataTable"` → `"data-table"` → `"data table"`
2. **Toggle `ibm_products`**
   - If `ibm_products: "yes"` returned nothing → try `ibm_products: "no"`, or remove the filter
   - If `ibm_products: "no"` returned nothing → try `ibm_products: "yes"`
3. **Adjust UIShell phrasing** — for navigation/layout components try:
   - `"header navigation"`, `"ui shell"`, `"side nav"`, `"shell header"`,
     `"breadcrumb navigation"`, `"global header"`
4. **Retry once with expanded synonyms**
   - Try alternate names: `"notification"` / `"toast"` / `"inline notification"`
5. **Never switch frameworks automatically** — only retry with a different `component_type`
   if the user explicitly permits it
6. **Present options** — if still ambiguous after retry, surface the top 2 plausible
   component IDs and ask the user to confirm

---

### Specific Failure Patterns with Recovery

#### Pattern: Icon query returns wrong icon or zero results

**Symptom:** Searching `"Add icon carbon react"` returns unrelated icons or low scores.

**Root cause:** Verbose queries de-rank the target icon. The icon index scores on `name`,
`kebab`, `aliases`, `displayName` fields — extra words like `"icon"`, `"carbon"`, `"react"`
add noise and dilute ranking. Also: setting `component_type` routes to the wrong index (zero results).

**Recovery:**

```json
// ❌ Wrong — verbose query + wrong filter:
{"query": "Add icon carbon react", "filters": {"component_type": "React"}}

// ✅ Correct — shortest possible query, correct filter:
{"query": "Add", "filters": {"asset_type": "icon"}}
```

If the short query returns no results, try the kebab form: `"add"`, `"ai-governance"`,
then probe double-hyphen Carbon slug: `"ai--governance"`.
If still 0 hits, retry without `asset_type` filter entirely.

#### Pattern: Component query returns AI Chat results instead of the component

**Symptom:** A code*search for a React or Web Components component returns AI Chat
example files (results with `example_root`, `framework: "react"`, `doc_id` starting
with `ai_chat_example*\*`) instead of the expected Carbon component.

**Root cause:** The query text contains a framework name that triggers AI Chat code
intent detection. The most common accidental triggers in component queries are:

- `"react"` — e.g. `"modal react"`, `"accordion react component"`
- `"web components"` / `"web-components"` / `"webcomponents"`

When these appear in the query text, all query passes are routed to the
`carbon_ai_chat_code` index. Component filters like `component_type` are removed,
and the target component will never be found — regardless of fallback passes.

> **`"ai chat"` is the primary signal** for intentional AI Chat code routing.
> Only include it when you actually want AI Chat examples. For component queries,
> use component names only and express the framework via `filters.component_type`.

**Recovery — remove framework words from query text:**

```json
// ❌ Wrong — "react" in query triggers AI Chat routing; modal not found:
{"query": "modal react default", "filters": {"component_type": "React"}}

// ✅ Correct — component name only in query; framework in filter:
{"query": "modal default", "filters": {"component_type": "React"}}
```

---

#### Pattern: Component with "icon" in its name returns zero results or icons instead

**Symptom:** Querying for `icon-button`, `icon-indicator`, `skeleton-icon`, or `status-icon`
with `component_type: "React"` returns zero results or returns icon/pictogram entries
from the icons index instead of the component.

**Root cause:** The query service detects the word `"icon"` in the query text and
re-routes to the `carbon_icons_and_pictograms` index — overriding the `component_type`
filter. This affects any query text containing the standalone word "icon".

**Recovery — strip "icon" from the query text; rely on `component_id` for targeting:**

```json
// ❌ Wrong — "icon button" triggers icon routing, component_type is ignored:
{"query": "icon button", "filters": {"component_type": "React", "component_id": "icon-button"}}

// ✅ Correct — remove "icon" from query text:
{"query": "button", "filters": {"component_type": "React", "component_id": "icon-button"}}

// ✅ Also correct — use the component name without the word "icon":
{"query": "skeleton", "filters": {"component_type": "React", "component_id": "skeleton-icon"}}
```

---

#### Pattern: `docs_search` returns only `"intro"` chunks with thin content

**Symptom:** All results have `section_heading: "intro"` with `chunk_text` that is
navigation boilerplate (site menu items, breadcrumbs) rather than actual documentation.

**Root cause:** The intro chunk is always the first and often the highest-ranked result.
Actual content lives in deeper sections. The docs index chunks are often sparse.

**Recovery — try a more targeted page_type + specific topic:**

```json
// ❌ Too generic — returns intro chunk:
{"query": "button", "filters": {"component_id": "button"}}

// ✅ More specific — targets content sections:
{"query": "button kind primary secondary ghost danger", "filters": {"component_id": "button", "page_type": "usage"}, "size": 3}
```

If the content is still sparse, **do not keep re-querying**. Instead:

- Share the canonical URL: `source.page_url` from the result
- Use `code_search` with `filters: { component_id: "button" }` and inspect `props_catalog[]`
  for API-level details (more reliable than docs chunks for prop-level guidance)

#### Pattern: Wrong component returned by `component_id` filter

**Symptom:** Setting `component_id: "date-picker"` returns `DatePickerInput` or another
related component instead of the main component.

**Root cause:** The `component_id` filter uses `flexibleExactMatcher` with analyzed text
matching. `"date-picker"` tokenizes to `["date", "picker"]` which matches any component
ID containing both tokens.

**Recovery:**

```json
// Step 1: Drop component_id, search by component name text
{"query": "DatePicker calendar input", "filters": {"component_type": "React", "ibm_products": "no"}, "size": 2}

// Step 2: Inspect results, read the exact component_id from source
// Step 3: Only then re-apply with confirmed component_id
{"query": "DatePicker", "filters": {"component_type": "React", "component_id": "date-picker"}, "size": 2}
```

---

### AI Chat Recovery

If an AI Chat docs query returns insufficient results:

- Retry with symbol name variations
- Include `"migration-1.0.0"` if the context implies a version upgrade
- Check `chunk_summary` first — it's a pre-computed summary that quickly indicates relevance

If an AI Chat code query returns insufficient results:

- Retry with/without the example root token:
  - Try `"ai chat react"`, then `"ai chat react basic"`
  - Keep the framework filter constant
- If files are missing, query by specific filename:
  ```json
  {
    "query": "ai chat react history customLoadHistory.ts",
    "size": 1,
    "filters": { "component_type": "React" }
  }
  ```

---

## Performance Optimization Rules

1. **Always enforce `component_type`** — prevents cross-framework result pollution
2. **Set `component_id` only after discovery** — premature ID guessing wastes a call
3. **Use `requery_hint` not larger `size`** — stubs always include a targeted follow-up hint
4. **Debounce a11y queries** — stop once the relevant section headings are covered
5. **Minimize call count:**
   - Discovery: 1–2 calls
   - Targeted: 1–2 calls
   - Total ideal: ≤ 4 calls for any request
6. **Fetch missing doc chunks only if needed** — docs content is sparse; often the `page_url`
   is more useful than additional chunk queries
7. **For AI Chat docs** — prefer one concise `docs_search` call; server auto-routes to the AI Chat index
8. **For AI Chat code** — prefer one concise `code_search` call with framework guardrail and optional example root
9. **Trust server-side reconstruction** — multi-chunk files are assembled automatically;
   do not issue chunk-by-chunk queries

---

## Quality Assurance Checklist

Use this checklist before composing the final response:

### Parsing & Framework

- [ ] JSON parsed from string before reasoning
- [ ] Framework consistent — no React/Web Components mixing
- [ ] Results filtered by `component_type`; mismatches discarded

### Component & Product Scope

- [ ] Product scope correct (`ibm_products: "yes"` vs `"no"`)
- [ ] `component_id` confirmed via discovery → canonicalization (never guessed)
- [ ] `component_id` from result matches exactly (not a skeleton or sub-component variant)

### Variants & Props

- [ ] Variant selection appropriate (`variant_is_default: true` if user didn't specify)
- [ ] `example_clean` field used (not `example`) for component code; `example` for icon results
- [ ] `source.imports[]` used verbatim — never reconstructed manually
- [ ] For icons: `import` field used for export name, `import_stmt` used verbatim
- [ ] All icons confirmed to exist via `code_search` before use — never assume an export name
- [ ] Stub variants with `example_omitted: true` followed up via `requery_hint` (not larger size)
- [ ] Props validated against `props_used` and `props_literal` from the matched variant (`props_schema` is stripped server-side and will not be present)
- [ ] IBM Plex font applied correctly — no inline token strings

### Documentation

- [ ] Docs freshness considered — used most recent `last_crawled_at`
- [ ] When `chunk_text` is sparse, `page_url` shared with user instead of retrying

### Accessibility

- [ ] A11y queries targeted by `component_id`
- [ ] A11y queries debounced — stopped when headings are covered

### AI Chat

- [ ] AI Chat doc query validated against intended API symbol/topic
      (e.g., `PublicChatState`, `ChatInstance`, `migration-1.0.0`)
- [ ] AI Chat code validated against intended `example_root` and framework
- [ ] All required files confirmed present (check for `is_complete_file: true`)
- [ ] Complete file content available when needed
- [ ] AI Chat SSR safety handled when applicable — SSR detected, client-only loading applied, `ssr.external` configured
- [ ] No invalid AI Chat CSS import paths used (e.g., `@carbon/ai-chat/es/index.css` does not exist)

### Carbon Charts

- [ ] `code_search` was NOT called for chart content — `get_charts` only
- [ ] 2-call convention followed: `mode:"schema"` → `mode:"full"`
- [ ] `tool_policy.instruction` in get_charts response followed
- [ ] Assembly fields used verbatim: `install_command`, `styles_import`, `import_hint`, `usage_hint`
- [ ] `assembly.install_command` executed and confirmed successful before completion
- [ ] Chart dependencies verified installed before applying/validating `styles_import`
- [ ] `styles_import` placed as top-level app entry import — not in SCSS
- [ ] Chart CSS import resolves after install (no module resolution errors)
- [ ] `buildable` checked before generating code; `incomplete` fields reported if false
- [ ] Cross-framework `recovery` object handled correctly if present

### React Project Setup

- [ ] Stability policy enforced — no `@carbon/labs-react` unless user asked or it is already present in the repo
- [ ] Baseline token imports present in project SCSS file: `spacing`, `theme`, `type`, `breakpoint` from `@carbon/react/scss/`
- [ ] `@use '@carbon/react'` present in project SCSS file (required for component styles — token imports alone emit no CSS)
- [ ] Project SCSS file imported in entry module before component imports
- [ ] No `@carbon/styles/css/styles.css` import used for React projects
- [ ] IBM Products projects: `@use '@carbon/ibm-products/css/index-full.css';` included alongside the React SCSS baseline

### Web Components Project Setup

- [ ] SCSS strategy follows minimal → grid → theme progression (only add layers explicitly required)
- [ ] Entry-module style import is present before component imports
- [ ] Existing `<body>` Carbon theme class preserved; default to `cds--white` when absent
- [ ] No HTML `<link>` tag used for SCSS files — imported via entry module only

### Token Conservation

- [ ] Tool response not restated or summarized — stated "Received the necessary context"
- [ ] No extra files written (no tests, no README)
- [ ] Response stops after emitting the requested files
