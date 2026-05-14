# AI Chat Protocols

## File Completeness Rule (Must Follow)

When the user's intent is **anything related to Carbon AI Chat examples** — they say
"chat", "AI chat", "Carbon AI chat", "React AI chat", "web components AI chat",
"AI chat history example", "chat custom element example", "watsonx example",
"load history", etc. — follow this protocol **before** answering, explaining, or
generating any code:

### Step 1 — Fetch the full file list

Issue a **single, explicit `code_search`** call targeting the example root and framework.

Required in the query:

- The phrase `"ai chat"`
- The framework: `"react"` or `"web components"` (default to React if unspecified)
- The example root: `"basic"`, `"custom-element"`, `"history"`, `"watsonx"`, or `"watch-state"`

Always set:

- `size: 15` (high enough to surface all files in the example)
- `filters.component_type` matching the user's framework

### Step 2 — Inspect `example_files`

After the call, read `example_files` on the top hit. If present, treat it as the
**authoritative file list** and proceed.

If `example_files` is missing or incomplete, issue follow-up file-targeted queries for
any missing filenames. Common files to check for:

- `App.tsx`
- `customSendMessage.ts`
- `renderUserDefinedResponse.tsx`
- `customLoadHistory.ts`
- `styles.css`
- `webpack.config.js`
- `tsconfig.json`
- `index.html`
- `package.json`

### Step 3 — Verify completeness, then answer

Only after confirming the complete file set:

- Answer the user
- Generate/rewrite code
- Explain the example

> This completeness step is **always required** — even if the user did not explicitly
> ask for all files. Do not wait for them to remember to ask.

---

## AI Chat Docs Queries

Use `docs_search` for all Carbon AI Chat API documentation.

The server automatically routes to the AI Chat index when queries contain relevant
entity names or migration keywords.

**Rules:**

- Do NOT set `filters.component_type`, `filters.component_id`, or `filters.ibm_products`
- Query using API symbol names, type names, or migration topic keywords
- Include `"migration-1.0.0"` in the query when upgrade or breaking change context is implied
  (user says "upgrade", "removed", "breaking", "instead")

**Key entity names:**

- `PublicChatState`
- `ChatInstance`
- `PublicConfig`
- `migration-1.0.0`

**Example queries:**

```json
{"query": "PublicChatState", "size": 3}
{"query": "ChatInstance methods", "size": 3}
{"query": "PublicConfig baseUrl", "size": 3}
{"query": "migration-1.0.0 breaking changes", "size": 3}
{"query": "upgrade removed breaking instead", "size": 3}
```

**The most common mistake — `"chat React"` does not route to AI Chat docs:**

```json
// ❌ Wrong — "chat" alone and "React" alone are not routing triggers;
//    this queries the main Carbon docs index and returns nothing useful
{"query": "chat React", "size": 3}

// ✅ Correct — "ai chat" is the general-purpose trigger
{"query": "ai chat react setup", "size": 3}
```

**Routing trigger words** — the query must contain at least one of these for the server
to route to the AI Chat docs index:

| Trigger                          | When to use                                            |
| -------------------------------- | ------------------------------------------------------ |
| `ai chat` / `ai-chat`            | General questions — setup, configuration, integration  |
| `ChatInstance`                   | Questions about the instance API or its methods        |
| `PublicChatState`                | Questions about chat state shape or properties         |
| `PublicConfig`                   | Questions about configuration options (base URL, etc.) |
| `migration-1.0.0`                | Upgrade, breaking changes, or "what changed in v1"     |
| `custom server` / `service desk` | Custom backend or service desk integration             |

> **⚠ `"chat"` alone does NOT trigger AI Chat docs routing** — neither does `"React"` alone.
> Always include `"ai chat"` or a specific entity name like `ChatInstance`.
>
> **⚠ `"assistant"` alone does NOT trigger AI Chat docs routing** — it was removed from
> the routing regex to prevent false positives on general Carbon queries.

**Translation — user intent → agent query (docs_search):**

| User says                              | Agent calls                                                |
| -------------------------------------- | ---------------------------------------------------------- |
| "How do I set up Carbon AI Chat?"      | `{"query": "ai chat setup", "size": 3}`                    |
| "How do I use AI Chat with React?"     | `{"query": "ai chat react integration", "size": 3}`        |
| "What methods does ChatInstance have?" | `{"query": "ChatInstance methods", "size": 3}`             |
| "How do I set the base URL?"           | `{"query": "ai chat PublicConfig baseUrl", "size": 3}`     |
| "What changed in the v1 upgrade?"      | `{"query": "migration-1.0.0 breaking changes", "size": 3}` |
| "How do I connect a custom server?"    | `{"query": "custom server configuration", "size": 3}`      |

---

## AI Chat Code Queries

Use `code_search` for Carbon AI Chat sample applications and code snippets.

**Rules:**

- Set `filters.component_type` per framework guardrail (default React)
- Do NOT set `filters.ibm_products`
- Prefer a single concise query with framework + example root; let the server
  auto-provide complete files

**Example roots and their use:**

| Example root     | What it covers                        |
| ---------------- | ------------------------------------- |
| `basic`          | Minimal AI Chat setup                 |
| `custom-element` | Custom web component integration      |
| `history`        | Loading conversation history          |
| `watsonx`        | Watson/watsonx AI backend integration |
| `watch-state`    | Observing chat state changes          |

**Translation — user intent → agent query (code_search):**

| User says                                  | Agent calls                                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| "Show me a basic AI Chat example"          | `{"query": "ai chat basic react", "size": 15, "filters": {"component_type": "React"}}`                            |
| "How do I load chat history?"              | `{"query": "ai chat history react", "size": 15, "filters": {"component_type": "React"}}`                          |
| "Show me the watsonx AI Chat integration"  | `{"query": "ai chat watsonx react", "size": 15, "filters": {"component_type": "React"}}`                          |
| "How do I watch/observe chat state?"       | `{"query": "ai chat watch-state react", "size": 15, "filters": {"component_type": "React"}}`                      |
| "Show me a custom element AI Chat example" | `{"query": "ai chat custom-element web components", "size": 15, "filters": {"component_type": "Web Components"}}` |
| "Show me the basic web components AI Chat" | `{"query": "ai chat basic web components", "size": 15, "filters": {"component_type": "Web Components"}}`          |

---

## Validation for AI Chat Results

After receiving AI Chat code results:

- Confirm the intended **example root** matches what was requested
- Confirm **framework alignment** (React vs Web Components)
- Check for `is_complete_file: true` — indicates the server has auto-reconstructed
  a multi-chunk file; trust this result as complete
- Confirm required source files are present for the example root
- If you're not getting complete files, retry with a specific filename in the query —
  the server will automatically assemble chunks for that file

---

## Error Recovery for AI Chat

If the first query returns insufficient results:

1. Retry with/without the example root token:
   - Try `"ai chat react"`, then `"ai chat react basic"`
   - Keep the framework filter constant — never switch frameworks
2. For specific files, query the filename directly:
   ```json
   {
     "query": "ai chat react customSendMessage.ts",
     "size": 1,
     "filters": { "component_type": "React" }
   }
   ```
3. For docs, retry with symbol name variations or include `"migration-1.0.0"` if context
   suggests a version upgrade

---

## Build Safety for AI Chat Integrations

When generating runnable AI Chat integration code (not just retrieving examples), apply these rules:

- Detect SSR indicators before choosing import patterns (`entry-server.*`, `server.js/ts`, SSR config in Vite/Webpack, SSR scripts in `package.json`).
- If SSR is present:
  - avoid top-level browser-only imports in SSR-rendered paths,
  - use client-only loading patterns (`React.lazy`/`Suspense` or dynamic import in `useEffect`),
  - configure `ssr.external` for `@carbon/ai-chat` and `@carbon/web-components` when needed.
- Do not import CSS from `@carbon/ai-chat/es/index.css` (or similar non-existent CSS paths).

For broader package and implementation guardrails, see [implementation-guardrails.md](implementation-guardrails.md).
