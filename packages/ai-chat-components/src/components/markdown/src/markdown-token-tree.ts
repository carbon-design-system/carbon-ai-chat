/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The parse/diff layer between raw markdown source and the renderer. Parses with markdown-it (built-in plugins plus any caller-supplied `markdownItPlugins`), builds a nested {@link TokenTree}, and diffs it against the previous tree so streaming updates can reuse stable subtrees.
 *
 * ### Why diff
 *
 * `diffTokenTree` reuses old nodes by `key` whenever the key matches. This is what lets `./markdown-renderer.ts`'s use of Lit's `repeat` directive keep DOM stable during streaming: each incoming chunk re-parses the full source, but matched keys reuse the prior subtree, so only the genuinely new tail differs.
 *
 * ### Why `cachedHtml`
 *
 * For the leaf token types in {@link PLUGIN_DELEGABLE_TOKEN_TYPES}, when a user plugin's renderer rule produces the HTML (via `./utils/plugin-fallback.ts`), the result is cached on the `TokenTree` node and carried forward by `diffTokenTree` whenever the underlying token's `content` / `attrs` / `info` are unchanged. A stable earlier-in-document fence/image/etc. therefore isn't re-rendered through the plugin's rule on every streaming chunk. The cache is tagged with the `MarkdownIt` instance that produced it; a plugin swap (which builds a fresh instance) invalidates the cache on read.
 *
 * The block comment on {@link PLUGIN_DELEGABLE_TOKEN_TYPES} explains why only those four token types are eligible for delegation.
 *
 * ### Related files
 *
 * - `./markdown-renderer.ts` — consumes the `TokenTree` and produces a Lit `TemplateResult`.
 * - `./utils/plugin-fallback.ts` — reads `cachedHtml` and {@link getPluginOverriddenRules} to drive the delegated-render flow.
 */

import MarkdownIt, { Token } from "markdown-it";

import { markdownItAttrs } from "./plugins/markdown-it-attrs";
import { markdownItHighlight } from "./plugins/markdown-it-highlight";
import { markdownItTaskLists } from "./plugins/markdown-it-task-lists";

/**
 * Represents a node in the token tree structure.
 */
export interface TokenTree {
  /** Unique identifier for this node, used for efficient diffing */
  key: string;
  /** The original markdown-it token data */
  token: Partial<Token>;
  /** Child nodes for nested content */
  children: TokenTree[];
  /**
   * Cached HTML produced by `md.renderer.render()` for leaf tokens whose
   * renderer rule was overridden by a user plugin. Tagged with the
   * `MarkdownIt` instance that produced it so a plugin swap (which builds a
   * fresh instance) invalidates the cache on read. Inherited across
   * {@link diffTokenTree} when the token's content and attrs are unchanged so
   * the plugin's rule isn't re-invoked on every streaming chunk. Only
   * populated for token types in {@link PLUGIN_DELEGABLE_TOKEN_TYPES}.
   * @internal
   */
  cachedHtml?: { md: MarkdownIt; html: string };
}

/**
 * Token types whose renderer rule, when overridden by a user-supplied
 * markdown-it plugin, will be honored — instead of the native Lit dispatch.
 * All four are leaf tokens (`nesting === 0`) so the slice handed to
 * `md.renderer.render()` is a single token and the rendered HTML can be
 * safely cached on the {@link TokenTree} node.
 *
 * Container tokens (paragraph_open, heading_open, list_*_open, table_open)
 * are intentionally excluded: delegating them would erase Carbon custom
 * elements (cds-unordered-list, cds-list-item, cds-aichat-table) and break
 * streaming-friendly per-child diffing for the subtree. Link tokens are
 * excluded because the native `<a>` dispatch injects `target="_blank"` for
 * chat-link safety.
 *
 * @internal
 */
export const PLUGIN_DELEGABLE_TOKEN_TYPES: ReadonlySet<string> = new Set([
  "fence",
  "image",
  "code_inline",
  "html_block",
]);

/**
 * A markdown-it plugin reference. Either a bare plugin function or a
 * `[plugin, options]` / `[plugin, ...params]` tuple matching
 * `MarkdownIt.use(...)`.
 *
 * @experimental
 */
export type MarkdownItPlugin =
  | MarkdownIt.PluginSimple
  | [MarkdownIt.PluginWithOptions<unknown>, unknown]
  | [MarkdownIt.PluginWithParams, ...unknown[]];

// Per-instance set of renderer-rule keys that user plugins overrode (or
// added) relative to the snapshot taken after our built-in plugins ran.
// WeakMap so cleanup follows the MarkdownIt instance's lifetime.
const pluginOverriddenRulesByMd = new WeakMap<
  MarkdownIt,
  ReadonlySet<string>
>();

const EMPTY_RULE_SET: ReadonlySet<string> = new Set<string>();

/**
 * Returns the set of renderer-rule keys that user-supplied plugins overrode
 * (or freshly added) on the given markdown-it instance, relative to the
 * baseline established after our built-in plugins (markdownItAttrs,
 * markdownItHighlight, markdownItTaskLists) ran. The renderer uses this to
 * decide which token types to route through `md.renderer.render()` instead
 * of native Lit dispatch. Returns an empty set for instances we didn't build.
 *
 * @internal
 */
export function getPluginOverriddenRules(md: MarkdownIt): ReadonlySet<string> {
  return pluginOverriddenRulesByMd.get(md) ?? EMPTY_RULE_SET;
}

/**
 * Builds a new markdown-it instance with the built-in plugins and any user-supplied
 * plugins applied on top. `options.html` selects whether raw HTML is parsed as HTML
 * (`true`, the default) or neutralized to inert escaped text (`false`, used when
 * {@link CDSAIChatMarkdown.removeHTML} is set). Both variants are built through this
 * same path so plugin application and overridden-rule snapshotting stay identical.
 *
 * Snapshots `md.renderer.rules` after the built-in plugins but before the user
 * plugins, then records the keys whose function reference changed (or whose
 * key was added) into {@link pluginOverriddenRulesByMd}.
 */
function createMarkdownIt(
  plugins?: MarkdownItPlugin[],
  options: { html?: boolean } = {},
): MarkdownIt {
  const md = new MarkdownIt("commonmark", {
    html: options.html ?? true,
    breaks: true,
    linkify: true,
  })
    .enable("table")
    .enable("strikethrough")
    .enable("linkify")
    .use(markdownItAttrs)
    .use(markdownItHighlight)
    .use(markdownItTaskLists);

  const baselineRules: Record<string, unknown> = {
    ...(md.renderer.rules as Record<string, unknown>),
  };

  for (const plugin of plugins ?? []) {
    if (Array.isArray(plugin)) {
      const [fn, ...args] = plugin;
      (md as MarkdownIt).use(fn as MarkdownIt.PluginWithParams, ...args);
    } else {
      md.use(plugin);
    }
  }

  const currentRules = md.renderer.rules as Record<string, unknown>;
  const overridden = new Set<string>();
  const allKeys = new Set<string>([
    ...Object.keys(baselineRules),
    ...Object.keys(currentRules),
  ]);
  for (const key of allKeys) {
    if (currentRules[key] !== baselineRules[key]) {
      overridden.add(key);
    }
  }
  pluginOverriddenRulesByMd.set(md, overridden);

  return md;
}

// Each plugin identity caches both an html-enabled and an html-disabled instance,
// built lazily on first use. `removeHTML` selects the no-html variant.
interface MarkdownItVariants {
  html?: MarkdownIt;
  noHtml?: MarkdownIt;
}

// Cache for the no-plugins default instances.
const defaultMarkdownIt: MarkdownItVariants = {};

// Cache keyed by plugin-array identity. WeakMap so plugin arrays that go out of
// scope can be collected.
const markdownItCache = new WeakMap<MarkdownItPlugin[], MarkdownItVariants>();

/**
 * Returns a (cached) markdown-it instance for the given plugin set, choosing the
 * html-enabled variant or the html-disabled (HTML-neutralizing) variant based on
 * `removeHtml`. Calling with the same `plugins` reference and `removeHtml` returns
 * the same instance.
 */
export function getMarkdownIt(
  plugins?: MarkdownItPlugin[],
  removeHtml = false,
): MarkdownIt {
  const variants =
    !plugins || plugins.length === 0
      ? defaultMarkdownIt
      : (markdownItCache.get(plugins) ??
        (() => {
          const created: MarkdownItVariants = {};
          markdownItCache.set(plugins, created);
          return created;
        })());

  const slot = removeHtml ? "noHtml" : "html";
  if (!variants[slot]) {
    variants[slot] = createMarkdownIt(plugins, { html: !removeHtml });
  }
  return variants[slot] as MarkdownIt;
}

// markdown-it treats a closing HTML tag and the next markdown line (ie. </div>\n##Heading) as one HTML
// block when there is no blank line between them. Insert an extra newline so the
// following markdown is parsed as markdown, not swallowed into the HTML token.
function normalizeHtmlBlockBoundaries(markdown: string): string {
  return markdown.replace(
    /(^|\n)(\s*<\/\s*[A-Za-z][\w:-]*\s*>)(\r?\n)(?=\S)/g,
    "$1$2$3$3",
  );
}

// Fallback for html_block tokens that still bundle a closing tag with trailing
// markdown on the next line. Split them so the closer stays HTML and the rest
// is re-parsed as markdown.
function splitHtmlBlockTrailingMarkdown(
  tokens: Token[],
  md: MarkdownIt,
): Token[] {
  return tokens.flatMap((token) => {
    if (token.type !== "html_block") {
      return [token];
    }

    const trailingMarkdownMatch = token.content.match(
      /^(\s*<\/\s*[A-Za-z][\w:-]*\s*>)(\s*\n)([\s\S]*\S[\s\S]*)$/,
    );

    if (!trailingMarkdownMatch) {
      return [token];
    }

    const [, closingHtml, leadingWhitespace, trailingMarkdown] =
      trailingMarkdownMatch;
    const htmlToken = {
      ...token,
      content: closingHtml,
      map: token.map ? [token.map[0], token.map[0] + 1] : token.map,
    } as Token;

    return [
      htmlToken,
      ...md.parse(`${leadingWhitespace}${trailingMarkdown}`, {}),
    ];
  });
}

/**
 * Parses markdown text into a flat array of markdown-it tokens using the given instance.
 *
 * When `removeHtml` is set, `md` is the html-disabled instance: raw HTML is
 * neutralized to inert escaped text (content preserved) and there are no HTML
 * blocks to normalize or split, so the boundary fixups are skipped.
 */
function parseMarkdown(
  fullText: string,
  md: MarkdownIt,
  removeHtml: boolean,
): Token[] {
  if (removeHtml) {
    return md.parse(fullText, {});
  }
  const normalizedText = normalizeHtmlBlockBoundaries(fullText);
  return splitHtmlBlockTrailingMarkdown(md.parse(normalizedText, {}), md);
}

/**
 * Generates a unique string key for a markdown-it token.
 *
 * The key combines the token type, HTML tag, and source position to create
 * a stable identifier that can be used by Lit's repeat() directive for
 * efficient DOM updates.
 */
function generateKey(token: Token): string {
  const map = token.map ? token.map.join("-") : "";
  return `${token.type}:${token.tag}:${map}`;
}

/**
 * Converts a flat list of markdown-it tokens into a tree.
 */
export function buildTokenTree(tokens: Token[]): TokenTree {
  // Create the root node that will contain all top-level content
  const root: TokenTree = {
    key: "root",
    token: {
      type: "root",
      tag: "",
      nesting: 0,
      level: 0,
      content: "",
      attrs: null,
      children: null,
      markup: "",
      block: true,
      hidden: false,
      map: null,
      info: "",
      meta: null,
    },
    children: [],
  };

  // Stack tracks the current nesting context while building the tree
  const stack: TokenTree[] = [root];

  tokens.forEach((token) => {
    // Create a new node for this token
    const node: TokenTree = {
      key: generateKey(token),
      token,
      children: [],
    };

    // Handle inline tokens that contain their own child tokens
    // (e.g., a paragraph containing bold, italic, and text tokens)
    if (token.type === "inline" && token.children?.length) {
      node.children = buildTokenTree(token.children).children;
    }

    const current = stack[stack.length - 1];

    if (token.nesting === 1) {
      // Opening tag: add node to current container and descend into it
      current.children.push(node);
      stack.push(node);
    } else if (token.nesting === -1) {
      // Closing tag: exit current container
      stack.pop();
    } else {
      // Self-contained token: add to current container
      current.children.push(node);
    }
  });

  return root;
}

function attrsEqual(
  a: Token["attrs"] | undefined,
  b: Token["attrs"] | undefined,
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) {
      return false;
    }
  }
  return true;
}

/**
 * Compares two TokenTree structures and creates a new tree that reuses
 * unchanged nodes from the old tree.
 *
 * This optimization is crucial for performance when content is being streamed
 * or updated incrementally.
 */
export function diffTokenTree(
  oldTree: TokenTree | undefined,
  newTree: TokenTree,
): TokenTree {
  // If keys don't match, the entire subtree changed - use new tree
  if (!oldTree || oldTree.key !== newTree.key) {
    return newTree;
  }

  // Keys match so create merged tree reusing unchanged children
  const merged: TokenTree = {
    key: newTree.key,
    token: newTree.token,
    children: [],
  };

  // Carry forward the rendered-HTML cache for leaf tokens delegated to the
  // markdown-it renderer. Skip when the underlying token content, attrs, or
  // info changed (info is the fence's language string and drives the rendered
  // output for plugins like markdown-it-mermaid / syntax highlighters).
  if (
    oldTree.cachedHtml !== undefined &&
    typeof newTree.token.type === "string" &&
    PLUGIN_DELEGABLE_TOKEN_TYPES.has(newTree.token.type) &&
    oldTree.token.content === newTree.token.content &&
    oldTree.token.info === newTree.token.info &&
    attrsEqual(
      oldTree.token.attrs ?? undefined,
      newTree.token.attrs ?? undefined,
    )
  ) {
    merged.cachedHtml = oldTree.cachedHtml;
  }

  // Create lookup map of old children by key for efficient comparison
  const oldChildrenByKey = new Map(
    oldTree.children.map((child) => [child.key, child]),
  );

  // Process each new child, reusing old ones where possible
  newTree.children.forEach((newChild) => {
    const oldChild = oldChildrenByKey.get(newChild.key);

    if (oldChild) {
      // Recursively diff matching children
      merged.children.push(diffTokenTree(oldChild, newChild));
    } else {
      // Use new child as-is
      merged.children.push(newChild);
    }
  });

  return merged;
}

/**
 * Result of {@link markdownToTokenTree}. Returns the parsed tree plus the
 * markdown-it instance used to produce it so the renderer can fall back to
 * `md.renderer.render()` for plugin-introduced tokens. The set of
 * plugin-overridden rules is read from the per-instance WeakMap via
 * {@link getPluginOverriddenRules} as needed.
 */
export interface MarkdownToTokenTreeResult {
  tree: TokenTree;
  md: MarkdownIt;
}

/**
 * Converts markdown into a tree with keys on it for Lit. The returned `md` is the
 * (cached) markdown-it instance keyed by `markdownItPlugins` identity and the
 * `removeHtml` flag (html-enabled vs html-neutralizing variant).
 */
export function markdownToTokenTree(
  markdown: string,
  lastTree: TokenTree | undefined,
  opts: { removeHtml?: boolean; markdownItPlugins?: MarkdownItPlugin[] } = {},
): MarkdownToTokenTreeResult {
  const removeHtml = opts.removeHtml ?? false;
  const md = getMarkdownIt(opts.markdownItPlugins, removeHtml);
  const tokens = parseMarkdown(markdown, md, removeHtml);
  const tree = diffTokenTree(lastTree, buildTokenTree(tokens));
  return { tree, md };
}
