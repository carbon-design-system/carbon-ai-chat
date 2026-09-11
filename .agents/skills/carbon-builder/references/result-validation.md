# Result Validation

## Result Reconciliation Checklist

After every `code_search` or `docs_search` response:

1. **Match `component_id`** — confirm the same `component_id` appears across code and docs results
2. **Framework consistency** — never use React and Web Components results together
3. **Drop mismatches** — discard any result where `component_type` ≠ requested framework
4. **Product scope** — confirm `ibm_products` matches the requested product scope
5. **Variant selection:**
   - If the user specified a variant → match by `variant_id`
   - If no variant specified → prefer `variant_is_default: true`
6. **Code field** — use `example_clean` (not `example`) for component JSX; use `example` for icon results
7. **Props validation** — use `props_used[]` and `props_literal{}` from the variant; `props_schema` is stripped server-side and will not be present
8. **Imports** — always use the verbatim import statements from `source.imports[]`; never construct imports manually unless no result was returned
9. **Freshness** — prefer results with more recent `last_crawled_at` or `last_updated`
10. **AI Chat topic** — for AI Chat doc queries, validate the returned chunk references
    the intended symbol or topic (e.g., `PublicChatState`, `migration-1.0.0`)
11. **AI Chat code** — validate the intended `example_root` and framework before using snippets
12. **File completeness** — for AI Chat code, confirm required source files are present;
    look for `is_complete_file: true` indicating server-side reconstruction

---

## `get_charts` Result Validation

After every `get_charts` response:

1. **Check `status`** — the response carries one of three values:
   - `complete` — full source code returned; proceed with code generation
   - `incomplete_example` — variant lacks concrete data/options; inspect `incomplete` object; suggest a different variant
   - `schema_only` — `mode:"schema"` was used; schema docs only — never emit as runnable code

2. **Check `buildable`** — if `false`, surface this explicitly before generating code;
   never silently produce code that the server has flagged as unbuildable

3. **Confirm `chosen_variant`** — verify the resolved variant matches the user's intent;
   if the user named a specific variant and it was not matched, disclose the fallback used

4. **Verify `assembly` fields (mode:"full" only)** — confirm all four sub-fields are present
   before composing the response:
   - `assembly.install_command` — copy verbatim; do not substitute an equivalent package manager command
   - `assembly.styles_import` — apply as top-level app entry import; never place in SCSS
   - `chosen_variant.import_hint` — apply verbatim for component imports
   - `chosen_variant.usage_hint` — apply verbatim for usage structure
   - `assembly.instruction` — surface to the user if present; never suppress

5. **Inspect `source_files[]` file roles** — every file carries a `file_role`; verify
   expected roles are present:
   - `variant` — primary chart example (always required)
   - `dependency` — helper or config file (include in output if present)
   - `framework_component` — framework-specific wrapper (include in output if present)
   - If the `variant` role is absent the result is unusable; trigger error recovery

6. **Check `incomplete` on each source file** — if any `source_file.incomplete: true`,
   that file's code chunk was truncated server-side; warn the user and do not fabricate
   the missing portion

7. **Handle `recovery` object** — if present, the result was sourced from a cross-framework
   fallback; disclose the recovery source and confirm the returned framework still satisfies
   the user's requirements

8. **Validate returned `framework`** — a mismatch between the requested and returned framework
   means a fallback occurred; notify the user before proceeding

9. **Install-before-import validation** — execute `assembly.install_command` and confirm
   success before applying or validating `assembly.styles_import`

---

### `get_charts` Response Composition Rules

- **Assembly hints are verbatim** — never rewrite `install_command`, `styles_import`,
  `import_hint`, or `usage_hint`, even to match local conventions
- **Install before styles validation** — `styles_import` resolution is only valid after
  successful dependency installation via `assembly.install_command`
- **Emit all source files** — include every file from `source_files[]` in the output;
  do not silently drop `dependency` or `framework_component` entries
- **Do not fabricate truncated code** — when `incomplete: true`, tell the user the chunk is
  truncated rather than filling in guessed content
- **Schema ≠ runnable code** — a `mode:"schema"` result contains data/options schema docs,
  not executable chart code; never emit a schema response as a code example
- **Surface `assembly.instruction`** — always include assembly instruction guidance in the
  output when it contains required setup/configuration details

---

## Complex Query Handling

### Multi-Component Requests

When the user asks about multiple components:

1. Identify each component independently via the Discover → Canonicalize → Target protocol
2. Run targeted queries for each component
3. Keep results clearly attributed to their respective components
4. Never merge props or examples across different components

### Code + Guidance Combos

When the user asks for both code and design guidance:

1. Run `code_search` for the component → get examples and props
2. Run `docs_search` with `filters.page_type: "usage"` or `"accessibility"` → get guidance
3. Combine in the response: show code first, then annotate with relevant guidance
4. Keep the doc chunk source visible so the user can verify freshness

### Framework-Agnostic Queries with Explicit Labeling

When the user asks for "both React and Web Components":

1. Run two separate targeted queries — one per framework
2. Clearly label each result section: `### React` / `### Web Components`
3. Never mix imports or examples from different frameworks in the same code block

---

## Accessibility Retrieval Protocol

When the user asks about accessibility (a11y) for a component:

1. **Target by `component_id`** — always set `filters.component_id` for a11y queries
2. **Set `page_type`** — use `filters.page_type: "accessibility"` for Carbon docs
3. **Scope** — fetch the top-level section headings first; avoid pulling every chunk
4. **Stop when sufficient** — once the key headings are covered, stop querying
5. **Fetch missing chunks only if needed** — if `chunk_ordinal_max` > 1 and a specific
   chunk is needed, fetch it explicitly; do not bulk-fetch all chunks upfront
6. **Debounce** — do not issue duplicate a11y queries for the same component in the same session

---

## Response Composition Guidelines

### Imports

Always use the verbatim import statements from `source.imports[]`. The field contains
the exact import line from the story file — including package name, named exports, and
any required subpath. Do not construct imports manually unless no result was returned.
If both `imports[]` and a variant's `example_clean` contain import lines, prefer `imports[]`
as the canonical source — it represents the full component import, not just the usage example.

### Props

- Use `props_used` from the matched variant as the starting point
- Cross-validate with `props_literal` (hard-coded values) and `imports[]` from the same result
- `props_schema` is stripped server-side and will never be present — do not look for it

### Storybook Links

Always include `storybook_url` when available — it lets the user explore variants interactively.

### Accessibility Integration

Include relevant accessibility guidance inline with code examples when:

- The component has interactive elements (buttons, links, modals, menus)
- The user asked about accessibility
- The docs_search result contains a11y guidance for the component

### IBM Products vs Carbon Core Separation

When both IBM Products and Carbon Core results are returned:

- Clearly label which is which
- Do not mix imports from `@carbon/ibm-products` with imports from `@carbon/react`
- IBM Products components are in `@carbon/ibm-products`; Carbon Core components are in `@carbon/react`
