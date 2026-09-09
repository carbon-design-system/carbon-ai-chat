# Carbon Charts Protocols

## Hard Rule

**Never call `code_search` for Carbon Charts.** `get_charts` is the only authoritative
retrieval tool for chart source code, data schemas, and options. This rule is
non-negotiable — even if `code_search` appears to return chart-related results.

---

## Input Contract

Provide exactly one of:

| Input                      | When to use                              |
| -------------------------- | ---------------------------------------- |
| `framework` + `chart_type` | Normal chart request — most common path  |
| `doc_id`                   | Direct manifest lookup by document ID    |
| `rag_id`                   | Direct manifest lookup by RAG identifier |

**Supported frameworks:** `react`, `angular`, `vue`, `svelte`, `vanilla`, `html`

**Chart type slugs:** `bar`, `line`, `pie`, `donut`, `area`, `scatter`, `bubble`,
`combo`, `radar`, `treemap`, `heatmap`, `gauge`, `meter`

> Use `bar` for both bar and column charts. Use `donut` for doughnut.

---

## Recommended 2-Call Convention

### Call 1 — `mode: "schema"` (fast, no source files)

Purpose: discover available variants and understand the data/options shape before
committing to a `mode: "full"` call.

```json
{
  "framework": "react",
  "chart_type": "bar",
  "mode": "schema"
}
```

Response fields to inspect:

| Field                                 | Description                                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `available_variants`                  | List of `{ variant_id, name }` — choose one for Call 2                                                          |
| `default_variant`                     | The recommended variant_id if the user has no preference                                                        |
| `data_schema.symbols`                 | Symbol name(s) for the data array                                                                               |
| `data_schema.known_fields`            | Field names expected in each data object (**empty in schema mode** — get actual field names via `mode: "full"`) |
| `options_schema.symbols`              | Symbol name(s) for the options object                                                                           |
| `options_schema.known_top_level_keys` | Top-level options keys (axes, legend, etc.) (**empty in schema mode** — get actual keys via `mode: "full"`)     |
| `framework_components`                | Map of importable chart class names → file paths                                                                |

> **Variant IDs use the format `"examples-grouped"`, not just `"grouped"`.**
> Copy the exact `variant_id` string from the response for Call 2.

> Omit the `variant` argument in Call 1 to get the schema for the default variant.

### Call 2 — `mode: "full"` + chosen variant

Purpose: retrieve the complete source files and assembly hints for code generation.

```json
{
  "framework": "react",
  "chart_type": "bar",
  "variant": "examples-grouped",
  "mode": "full"
}
```

> If the user has no variant preference, omit `variant` to get the default.

---

## tool_policy block

Every `get_charts` response includes a `tool_policy` block. Its `instruction` field
reinforces the retrieval rules — follow it. It is a server-side enforcement signal,
not optional guidance.

```json
{
  "tool_policy": {
    "chart_retrieval_tool": "get_charts",
    "disallow_tools": ["code_search"],
    "instruction": "For Carbon Charts examples, do not call code_search. Use get_charts only (mode:'schema' then mode:'full'). For TypeScript interface details, do not use docs_search — use get_charts with interface_names:['InterfaceName']..."
  }
}
```

---

## Assembly Hints (Use Verbatim)

The `mode: "full"` response includes an `assembly` object. Use these fields **exactly
as returned** — do not paraphrase, reconstruct, or substitute:

| Field                        | How to use                                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `assembly.install_command`   | Run in terminal to install chart packages **before any completion or import validation**                                   |
| `assembly.styles_import`     | Add as a **top-level import** in the app entry module. **Never** place in SCSS. **Never** translate to `@use` or `@import` |
| `chosen_variant.import_hint` | Component import statement — use verbatim                                                                                  |
| `chosen_variant.usage_hint`  | Component usage template — substitute your data and options values                                                         |
| `assembly.instruction`       | Server-generated code generation instruction — follow exactly                                                              |

### Assembly Instructions (Critical)

When using `get_charts` assembly fields:

1. **Dependency Installation (Required First Step)**
   - Always run `assembly.install_command` in terminal before completion.
   - Verify installation succeeds before applying or validating `assembly.styles_import`.
   - Do not mark the task complete if package installation has not been confirmed.
2. **Styles Import**
   - Add `assembly.styles_import` in the app entry module (for example `main.jsx`).
   - This import resolves only after dependencies are installed.
   - Never place it in SCSS or translate it to `@use` / `@import`.
3. **Component Usage**
   - Use `chosen_variant.import_hint` for chart component imports.
   - Use `chosen_variant.usage_hint` for usage structure and substitute data/options only.
4. **Completion Checklist**
   - Dependencies installed via terminal
   - Styles imported in app entry module
   - Variant import/usage hints applied verbatim
   - Build/dev server resolves chart imports without module-not-found errors

---

## Source Files

The `source_files[]` array in the `mode: "full"` response contains reassembled files.
Each file has a `file_role`:

| `file_role`             | Meaning                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| `"variant"`             | Contains the concrete data array and options object for this variant |
| `"dependency"`          | Supporting file (utilities, types, helpers)                          |
| `"framework_component"` | The importable chart class — use the import from `import_hint`       |

**Code generation workflow:**

1. Find the `"variant"` role file → extract the data array and options object
2. Apply `import_hint` for the import statement
3. Apply `usage_hint` as the JSX/template, substituting your data and options
4. Apply `assembly.install_command` in terminal instructions
5. Confirm install success before applying `assembly.styles_import`
6. Apply `assembly.styles_import` as a top-level import

---

## Optional Parameters

| Parameter | Type          | Description                                                                                 |
| --------- | ------------- | ------------------------------------------------------------------------------------------- |
| `variant` | string        | Specific `variant_id` to request. Use exact ID from `available_variants`. Omit for default. |
| `data`    | string        | User-supplied CSV data. Server maps columns to schema fields.                               |
| `options` | string/object | User-supplied options. Server merges on top of example options.                             |

When `data` is supplied, inspect `result.user_data.instruction` for the exact
merge/substitution guidance. When `options` is supplied, inspect `result.user_options.instruction`.

---

## TypeScript Interface Lookup (Hop Chain)

Use this pattern **only** when the user asks about specific chart options that aren't
covered in the standard example — e.g. "how do I configure the legend?" or
"what toolbar options are available?". Do not run this on every chart request.

**Never use `docs_search` for Carbon Charts interface details.**
`get_charts` with `interface_names` is the only authoritative path.

### Step 1 — Request the top-level interface alongside the chart

```json
{
  "chart_type": "bar",
  "framework": "react",
  "mode": "full",
  "include_interfaces": true
}
```

Response includes `interface_doc`:

```json
{
  "interface_doc": {
    "name": "BarChartOptions",
    "definition": "interface BarChartOptions { axes: AxesOptions; legend: LegendOptions; ... }",
    "referenced_types": ["AxesOptions", "LegendOptions", "ToolbarOptions"]
  }
}
```

### Step 2 — Resolve nested types

```json
{
  "interface_names": ["LegendOptions", "ToolbarOptions", "AxesOptions"]
}
```

Response includes `interface_docs[]` and `follow_up_interface_names[]` — types
referenced by those interfaces that are still unresolved.

### Step 3 — Keep hopping until done

```json
{
  "interface_names": ["TruncationOptions", "ScaleOptions"]
}
```

**Stop condition:** When `follow_up_interface_names` is absent or empty — all types resolved.

---

## Buildability

Every `mode: "full"` response includes a `buildable` boolean and a `status` field:

| `status`               | Meaning                                                  |
| ---------------------- | -------------------------------------------------------- |
| `"complete"`           | Source files are runnable — proceed with code generation |
| `"incomplete_example"` | Variant lacks concrete data/options in the index         |

When `buildable: false`:

- Inspect `result.incomplete.reason` and `result.incomplete.missing` for details
- **Do not call `code_search`** as a fallback — it will not help
- Report to the user that this variant cannot be built from the index
- Suggest trying a different variant from `available_variants`

### Cross-Framework Recovery

When the requested variant is not runnable, the server may include a `recovery` object
with `strategy: "cross_framework_variant_donor"`. When present and `buildable: true`:

- Use the **requested framework's** `import_hint` and `usage_hint` for imports and template
- Use the **recovery `source_files`** for the concrete data array and options object
- Follow the instruction in `result.assembly.instruction` exactly

---

## Error Recovery

### `error: "not_found"`

The chart_type + framework combination has no indexed manifest.

Retry steps:

1. Try a closely related chart type slug (e.g. `"column"` → `"bar"`, `"doughnut"` → `"donut"`)
2. Try a different framework if the user permits
3. Report to the user if no match is found — do not fall back to `code_search`

### `error: "chunks_not_found"`

The manifest was found (Hop 1) but source code chunks are missing (Hop 2).

- Report to the user; do not silently fall back to `code_search`
- Try `mode: "schema"` to confirm the manifest exists and review available variants

### `variant_not_found: true`

The requested variant_id was not found; the server substituted the closest match.
`result.variant_note` explains which variant was used instead. Inform the user.

---

## Variant Selection Priority (server-side)

The server resolves variants in this order when no variant is explicitly requested:

1. Exact match on `variant_id` (if requested)
2. `variant_is_default: true`
3. `variant_id === "simple"`
4. `variant_id === "default"`
5. Shortest `variant_id`
6. First variant in list

---

## Example Query Sequences

### Standard bar chart in React

```json
// Call 1
{"framework": "react", "chart_type": "bar", "mode": "schema"}

// Call 2 — copy variant_id exactly from available_variants in Call 1 response
{"framework": "react", "chart_type": "bar", "variant": "examples-grouped", "mode": "full"}
```

### Chart with user-supplied data

```json
{
  "framework": "react",
  "chart_type": "line",
  "mode": "full",
  "data": "group,value\nA,10\nB,20\nC,15"
}
```

### Direct lookup by rag_id

```json
{ "rag_id": "carbon-charts-react-bar-simple", "mode": "full" }
```

### Discover legend options

```json
// Step 1: get top-level interface
{"framework": "react", "chart_type": "bar", "mode": "full", "include_interfaces": true}

// Step 2: resolve referenced nested types from Step 1 response
{"interface_names": ["LegendOptions", "ToolbarOptions"]}

// Step 3: if follow_up_interface_names is non-empty, resolve those too
{"interface_names": ["TruncationOptions"]}
```
