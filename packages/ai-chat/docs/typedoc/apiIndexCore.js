/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Pure, serialization-agnostic extraction of the public API surface from a
 * resolved TypeDoc project. `extractRecords(project, router)` walks the entry
 * module ("Type reference", renamed from `aiChatEntry` by moduleNamePlugin.js)
 * and returns a flat, deterministically-sorted array of {@link ApiRecord} — one
 * per top-level symbol and one per member. No filesystem access; the plugin
 * (apiIndexPlugin.js) and the serializers (apiIndexJson.js / apiIndexMarkdown.js)
 * build on top of this.
 *
 * Keys are the exact `{@link}` target strings authors type in the docs
 * (`HistoryItem`, `HistoryItem.time`), so a consumer resolves a reference by
 * direct lookup. URLs come straight from the TypeDoc router, so they match the
 * published site verbatim (including the `Type_reference.` filename prefix).
 *
 * `ReflectionKind` and `Comment` come from TypeDoc itself rather than being
 * mirrored locally, so kind values and comment rendering track whatever version
 * the build uses. Tests mock `typedoc` to keep this module's logic isolated.
 */

import { Comment, ReflectionKind } from "typedoc";

/** Names the renamed entry module can carry (current + legacy fallback). */
const ENTRY_MODULE_NAMES = new Set(["Type reference", "aiChatEntry"]);

/** Top-level reflection kinds we emit a record (and its own doc page) for. */
const TOP_LEVEL_KINDS =
  ReflectionKind.Interface |
  ReflectionKind.TypeAlias |
  ReflectionKind.Enum |
  ReflectionKind.Function |
  ReflectionKind.Variable |
  ReflectionKind.Class |
  ReflectionKind.Namespace;

/** Member reflection kinds we emit (anchored within their owner's page). */
const MEMBER_KINDS =
  ReflectionKind.Property |
  ReflectionKind.Method |
  ReflectionKind.Accessor |
  ReflectionKind.EnumMember;

const byCodepoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * @typedef {object} ApiRecord
 * @property {string} key Exact `{@link}` target ("HistoryItem", "HistoryItem.time").
 * @property {string} name Leaf name.
 * @property {string} kind ReflectionKind name ("Interface", "Property", ...).
 * @property {string|null} parent Owner key for members; null for top-level.
 * @property {string} category `@category` value, or "*".
 * @property {string} summary Summary text, `{@link}` flattened to readable text.
 * @property {string} description `@remarks` body if present, else "".
 * @property {string} signature Single-line signature string.
 * @property {string[]} signatures All overload signatures (length>1 only for overloaded fns/methods).
 * @property {string[]} members Child keys (top-level only).
 * @property {string[]} related Bare `{@link}` targets found in summary/remarks, deduped + sorted.
 * @property {string[]} examples `@example` blocks, raw text, source order.
 * @property {boolean} deprecated
 * @property {string} deprecatedMessage `@deprecated` body, else "".
 * @property {boolean} experimental
 * @property {string} url Version-relative URL ("interfaces/Type_reference.HistoryItem.html#time").
 * @property {string|null} anchor Member anchor ("time"), or null for top-level.
 */

/**
 * Walk the resolved project and return all public API records, sorted by key.
 *
 * @param {import("typedoc").ProjectReflection} project
 * @param {import("typedoc").Router} router Live router (read during render).
 * @returns {ApiRecord[]}
 */
export function extractRecords(project, router) {
  const module = findEntryModule(project);
  const ctx = { router, module, records: [] };
  const roots = (module ?? project).children ?? [];
  for (const refl of roots) {
    processTopLevel(refl, ctx);
  }
  ctx.records.sort((a, b) => byCodepoint(a.key, b.key));
  for (const r of ctx.records) {
    r.members.sort(byCodepoint);
    r.related = r.related.filter((k) => k !== r.key);
  }
  return ctx.records;
}

function findEntryModule(project) {
  const kids = project.children ?? [];
  const named = kids.find((c) => ENTRY_MODULE_NAMES.has(c.name));
  if (named) {
    return named;
  }
  const modules = kids.filter((c) => c.kind === ReflectionKind.Module);
  return modules.length === 1 ? modules[0] : null;
}

function processTopLevel(refl, ctx) {
  if (!(refl.kind & TOP_LEVEL_KINDS)) {
    return;
  }
  if (shouldSkip(refl)) {
    return;
  }
  if (!ctx.router.hasUrl(refl)) {
    return;
  }

  const ownerCategory = readCategory(refl);
  const memberRecords = [];
  for (const child of refl.children ?? []) {
    if (!(child.kind & MEMBER_KINDS)) {
      continue;
    }
    if (shouldSkip(child)) {
      continue;
    }
    if (!ctx.router.hasUrl(child)) {
      continue;
    }
    memberRecords.push(buildRecord(child, ctx, ownerCategory));
  }
  const ownerRecord = buildRecord(
    refl,
    ctx,
    null,
    memberRecords.map((r) => r.key),
  );
  ctx.records.push(ownerRecord, ...memberRecords);

  // Namespaces are containers: recurse into nested top-level symbols.
  if (refl.kind === ReflectionKind.Namespace) {
    for (const child of refl.children ?? []) {
      if (child.kind & TOP_LEVEL_KINDS) {
        processTopLevel(child, ctx);
      }
    }
  }
}

function shouldSkip(refl) {
  if (typeof refl.isReference === "function" && refl.isReference()) {
    return true;
  }
  const c = refl.comment;
  if (
    c?.hasModifier?.("@internal") ||
    c?.hasModifier?.("@hidden") ||
    c?.hasModifier?.("@ignore")
  ) {
    return true;
  }
  return false;
}

function buildRecord(refl, ctx, fallbackCategory, memberKeys = []) {
  const { module, router } = ctx;
  const comment = commentOf(refl);

  let category = readCategory(refl);
  if (category === "*" && fallbackCategory) {
    category = fallbackCategory;
  }

  const allSignatures = buildSignatures(refl);
  const signature = computeSignature(refl, allSignatures);
  const signatures = allSignatures.length > 1 ? allSignatures : [];

  const remarks = comment?.getTag?.("@remarks");
  const deprecatedTag = comment?.getTag?.("@deprecated");
  const parentRefl = refl.parent;
  const parent =
    parentRefl &&
    parentRefl !== module &&
    !ENTRY_MODULE_NAMES.has(parentRefl.name) &&
    parentRefl.kind & TOP_LEVEL_KINDS
      ? keyFor(parentRefl, module)
      : null;

  return {
    key: keyFor(refl, module),
    name: refl.name,
    kind: ReflectionKind[refl.kind] ?? String(refl.kind),
    parent,
    category,
    summary: renderParts(comment?.summary),
    description: remarks ? renderParts(remarks.content) : "",
    signature,
    signatures,
    members: memberKeys,
    related: collectRelated(comment, module),
    examples: collectExamples(refl),
    deprecated:
      typeof refl.isDeprecated === "function" ? refl.isDeprecated() : false,
    deprecatedMessage: deprecatedTag ? renderParts(deprecatedTag.content) : "",
    experimental: comment?.hasModifier?.("@experimental") === true,
    url: router.getFullUrl(refl),
    anchor: router.getAnchor(refl) ?? null,
  };
}

/** Build the `{@link}`-style key by walking up to (not into) the entry module. */
function keyFor(refl, module) {
  const parts = [];
  let cur = refl;
  while (
    cur &&
    cur !== module &&
    cur.kind !== ReflectionKind.Project &&
    !ENTRY_MODULE_NAMES.has(cur.name)
  ) {
    parts.unshift(cur.name);
    cur = cur.parent;
  }
  return parts.join(".");
}

/** A reflection's comment, falling back to its first signature / get-accessor. */
function commentOf(refl) {
  if (refl.comment) {
    return refl.comment;
  }
  if (refl.signatures?.length) {
    return refl.signatures[0].comment ?? undefined;
  }
  if (refl.getSignature?.comment) {
    return refl.getSignature.comment;
  }
  return undefined;
}

function readCategory(refl) {
  const tag = commentOf(refl)?.getTag?.("@category");
  if (tag) {
    const value = Comment.combineDisplayParts(tag.content).trim();
    if (value) {
      return value;
    }
  }
  return "*";
}

function normalize(text) {
  return (text ?? "").replace(/\r\n/g, "\n");
}

/** Render comment display parts to prose, flattening inline `{@link}` to text. */
function renderParts(parts) {
  if (!parts) {
    return "";
  }
  let out = "";
  for (const part of parts) {
    if (part.kind === "inline-tag" && isLinkTag(part.tag)) {
      out += part.tsLinkText || part.text || linkTargetName(part.target) || "";
    } else {
      out += part.text ?? "";
    }
  }
  return normalize(out).trim();
}

function isLinkTag(tag) {
  return tag === "@link" || tag === "@linkcode" || tag === "@linkplain";
}

function linkTargetName(target) {
  return target && typeof target === "object" && typeof target.name === "string"
    ? target.name
    : "";
}

/** Collect the bare `{@link}` targets referenced in summary/remarks. */
function collectRelated(comment, module) {
  const out = new Set();
  const scan = (parts) => {
    for (const part of parts ?? []) {
      if (part.kind === "inline-tag" && isLinkTag(part.tag)) {
        const key = relatedKey(part, module);
        if (key) {
          out.add(key);
        }
      }
    }
  };
  scan(comment?.summary);
  const remarks = comment?.getTag?.("@remarks");
  if (remarks) {
    scan(remarks.content);
  }
  return [...out].sort(byCodepoint);
}

function relatedKey(part, module) {
  const target = part.target;
  if (target && typeof target.getFullName === "function") {
    return keyFor(target, module);
  }
  return normalize(part.text).trim();
}

/** Collect `@example` blocks (declaration + signatures), in source order. */
function collectExamples(refl) {
  const out = [];
  const add = (comment) => {
    for (const tag of comment?.blockTags ?? []) {
      if (tag.tag === "@example") {
        out.push(normalize(Comment.combineDisplayParts(tag.content)).trim());
      }
    }
  };
  add(refl.comment);
  for (const sig of refl.signatures ?? []) {
    add(sig.comment);
  }
  if (refl.getSignature) {
    add(refl.getSignature.comment);
  }
  return out;
}

function typeStr(type) {
  try {
    return type ? type.toString() : "";
  } catch {
    return "";
  }
}

function paramStr(p) {
  const optional = p.flags?.isOptional || p.defaultValue != null ? "?" : "";
  return `${p.name}${optional}: ${typeStr(p.type) || "unknown"}`;
}

function signatureStringFor(name, sig) {
  const typeParams = sig.typeParameters?.length
    ? `<${sig.typeParameters.map((t) => t.name).join(", ")}>`
    : "";
  const params = (sig.parameters ?? []).map(paramStr).join(", ");
  const ret = typeStr(sig.type) || "void";
  return `${name}${typeParams}(${params}): ${ret}`;
}

function buildSignatures(refl) {
  if (!refl.signatures?.length) {
    return [];
  }
  return refl.signatures.map((sig) => signatureStringFor(refl.name, sig));
}

function computeSignature(refl, signatures) {
  switch (refl.kind) {
    case ReflectionKind.Interface:
      return `interface ${refl.name}`;
    case ReflectionKind.Class:
      return `class ${refl.name}`;
    case ReflectionKind.Enum:
      return `enum ${refl.name}`;
    case ReflectionKind.Namespace:
      return `namespace ${refl.name}`;
    case ReflectionKind.TypeAlias: {
      const t = typeStr(refl.type);
      return t ? `type ${refl.name} = ${t}` : `type ${refl.name}`;
    }
    case ReflectionKind.EnumMember: {
      const value = typeStr(refl.type);
      return value ? `${refl.name} = ${value}` : refl.name;
    }
    case ReflectionKind.Function:
    case ReflectionKind.Method:
      return signatures[0] ?? refl.name;
    case ReflectionKind.Accessor: {
      const t = refl.getSignature ? typeStr(refl.getSignature.type) : "";
      return t ? `${refl.name}: ${t}` : refl.name;
    }
    default: {
      // Property / Variable / anything else with a type.
      const optional = refl.flags?.isOptional ? "?" : "";
      const t = typeStr(refl.type);
      return t ? `${refl.name}${optional}: ${t}` : refl.name;
    }
  }
}
