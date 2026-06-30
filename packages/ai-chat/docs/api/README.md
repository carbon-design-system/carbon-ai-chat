# API symbol index

Machine-readable index of the `@carbon/ai-chat` public API, for the Carbon MCP ingestion pipeline. It lets the pipeline resolve documentation `{@link HistoryItem}` / `{@link HistoryItem.time}` references to their canonical doc pages and embed the API reference as retrievable content.

> **Generated — do not hand-edit.** Everything in this directory except this README is produced by [`docs/typedoc/apiIndexPlugin.js`](../typedoc/apiIndexPlugin.js). It is regenerated when cutting an RC or full release (and on demand via `npm run docs:api`), not on every build — so it reflects the released API surface. To change the output, change the plugin and run `npm run docs:api`.

## Contents

| Path                   | Format          | Purpose                                                                                                    |
| ---------------------- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| `symbol-index.json`    | JSON lookup map | O(1) resolution of a `{@link}` target to its metadata + URL.                                               |
| `markdown/<Symbol>.md` | Markdown        | One self-contained reference page per top-level symbol (members as sections), sized as an embedding chunk. |

Both come from one extraction pass, so they never disagree.

## `symbol-index.json`

```jsonc
{
  "version": "v1.15.0", // latest full release tag
  "baseUrl": "https://chat.carbondesignsystem.com/tag/latest/docs/", // see Versioning
  "generator": "@carbon/ai-chat typedoc apiIndexPlugin",
  "symbols": {
    "HistoryItem": {
      /* record */
    },
    "HistoryItem.time": {
      /* record */
    },
  },
}
```

`symbols` is keyed by the **exact `{@link}` target string** an author types — the bare export name for a top-level symbol (`HistoryItem`), and `Parent.member` for a member (`HistoryItem.time`, `BusEventType.RECEIVE`). To resolve a reference, look the string up directly.

### Record fields

| Field               | Type           | Notes                                                                                                                           |
| ------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `name`              | string         | Leaf name (`HistoryItem`, `time`).                                                                                              |
| `kind`              | string         | `Interface`, `TypeAlias`, `Enum`, `EnumMember`, `Function`, `Method`, `Property`, `Accessor`, `Variable`, `Class`, `Namespace`. |
| `parent`            | string \| null | Owner key for a member; `null` for a top-level symbol.                                                                          |
| `category`          | string         | TypeDoc `@category` (`Messaging`, `Config`, …); members inherit their owner's.                                                  |
| `summary`           | string         | Description; inline `{@link}` flattened to readable text.                                                                       |
| `description`       | string         | `@remarks` body if present, else `""`.                                                                                          |
| `signature`         | string         | Single-line signature (`time: string`, `type AudioItem = …`, `foo(a: A): B`).                                                   |
| `signatures`        | string[]       | All overload signatures; non-empty only when a function/method has more than one.                                               |
| `members`           | string[]       | Child keys (top-level symbols only).                                                                                            |
| `related`           | string[]       | Bare `{@link}` targets referenced in the summary/remarks, deduped and sorted.                                                   |
| `examples`          | string[]       | `@example` blocks, raw text, in source order.                                                                                   |
| `deprecated`        | boolean        |                                                                                                                                 |
| `deprecatedMessage` | string         | `@deprecated` body, else `""`.                                                                                                  |
| `experimental`      | boolean        | `@experimental` modifier present.                                                                                               |
| `url`               | string         | Version-relative path (see URLs).                                                                                               |
| `anchor`            | string \| null | Member anchor (`time`); `null` for top-level.                                                                                   |

### URLs

`url` is **relative to `baseUrl`** — the full page URL is `baseUrl + url`, e.g.
`https://chat.carbondesignsystem.com/tag/latest/docs/interfaces/Type_reference.HistoryItem.html#time`.
The `Type_reference.` filename prefix is intrinsic to how the published TypeDoc site names pages; the URLs here match the live site verbatim because they come from TypeDoc's own router.

## Versioning

`baseUrl` points at `tag/latest`, which the docs site serves from the most recent full release; `version` records that release tag (from the repo-root `versions.js`). The committed index is regenerated and updated at release time, so it stays aligned with what `tag/latest` actually serves. For a pinned snapshot, swap `tag/latest` for `version/<version>` in `baseUrl`.

## Regenerating

This directory is **not** rewritten by an ordinary `npm run build` or the dev watch — the plugin only writes when `WRITE_API_INDEX` is set, so day-to-day builds don't churn it. It is regenerated:

- **automatically at release** — `release-base.yml` runs `npm run docs:api` for every RC and full release and commits any change (mirroring the `telemetry.yml` step), so the committed index tracks the released API; and
- **on demand** — to preview the effect of a JSDoc/signature change:

```bash
cd packages/ai-chat
npm run docs:api          # regenerate this directory (sets WRITE_API_INDEX)
npm run docs:api:check    # regenerate + fail if it differs from what's committed
```
