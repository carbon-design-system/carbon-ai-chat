/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The container half of the plugin-host protocol.
 *
 * `<cds-aichat-markdown>` offers a host for plugin output to whichever chat
 * element is outermost, over three composed events — `-mount`, `-update` and
 * `-unmount`. Accepting the offer means calling `preventDefault()` on the
 * mount event and putting the host somewhere consumer-loaded CSS can reach it,
 * which the markdown element's own light DOM is not: it sits inside the chat's
 * shadow root. A plugin-fallback offer hands over an HTML string this
 * controller renders into a host it creates; a `customRenderers` offer hands
 * over a live element this controller only re-parents.
 *
 * A container supplies only the element hosts are appended to, and whatever
 * policy the framework cannot infer.
 */

/**
 * Mount detail for plugin output the element hands over as an HTML string.
 */
export interface MarkdownPluginFallbackMountDetail {
  /** Marks the payload as an HTML string rather than a live element. */
  kind: 'pluginFallback';
  /**
   * Name to put on the host's `slot` attribute, and the key the matching
   * `-update` and `-unmount` events arrive under. Unique across every markdown
   * element on the page, and reused across renders while the token stays put,
   * so a streaming message rewrites one host instead of growing a new one per
   * chunk. Treat the value as opaque; its format is not part of the API.
   */
  slotName: string;
  /**
   * The plugin rule's rendered HTML, to assign to the host's `innerHTML`.
   *
   * DOMPurify runs over it only when the markdown element has `sanitize-html`
   * set, and that setting is off by default. `remove-html` does not stand in
   * for it either — that one escapes HTML written in the markdown source and
   * never filters what a plugin's renderer rule emits. Treat the string as
   * exactly as trustworthy as the markdown-it plugins the page registered.
   */
  html: string;
  /**
   * True when the plugin's token is inline, such as a `math_inline` span.
   * Picks the host tag — `span` when true, so the output stays in paragraph
   * flow, `div` when false — and gates the block spacing that matches the
   * markdown element's own stack gap.
   */
  isInline: boolean;
}

/**
 * Mount detail for a `customRenderers` host. It carries a live element the
 * markdown element created, keeps writing to across renders, and removes.
 * Claiming it means re-parenting that element into your own light DOM,
 * synchronously, and nothing else: never rewrite its content, never style it,
 * never remove it. The markdown element renders the `<slot>` hop that projects
 * it back.
 */
export interface MarkdownCustomRendererMountDetail {
  /** Marks the payload as a live element rather than an HTML string. */
  kind: 'customRenderer';
  /**
   * Name already set on `element`'s `slot` attribute, and the key the matching
   * `-unmount` event arrives under. Page-unique, reused across renders and
   * opaque, like the plugin-fallback name. No `-update` event follows this
   * one: the markdown element writes the consumer's node into `element`
   * itself.
   */
  slotName: string;
  /**
   * The host to re-parent. The markdown element created it, replaces its
   * children on every render, and removes it when the renderer stops matching
   * — a claimant only moves it.
   */
  element: HTMLElement;
  /**
   * True when the claimed output is inline flow content. Always `false` here:
   * the markdown element hosts every `customRenderers` result in a `<div>` it
   * created, so a claimant has no host tag to choose. Declared on both members
   * so a listener can read it before narrowing on `kind`.
   */
  isInline: boolean;
}

/**
 * The `cds-aichat-markdown-plugin-host-mount` detail, discriminated on `kind`.
 *
 * Narrow on `kind`, never on which of `html` / `element` is present — the two
 * members deliberately declare only their own fields, so reading the wrong one
 * is a compile error rather than a silent `undefined`.
 */
export type MarkdownPluginHostMountDetail =
  MarkdownPluginFallbackMountDetail | MarkdownCustomRendererMountDetail;

/**
 * A mount detail as it arrives on the wire, `kind` included or not.
 *
 * `kind` is newer than the events themselves, and `@carbon/ai-chat` depends on
 * this package through a caret range, so a listener can still receive the
 * original shape from an older build. Pass anything you receive through
 * `resolveMarkdownPluginHostMountDetail`, exported from
 * `@carbon/ai-chat-components/es/components/markdown/src/utils/plugin-host-container.js`,
 * and narrow on the result.
 */
export type MarkdownPluginHostMountDetailInput =
  | MarkdownPluginHostMountDetail
  | Omit<MarkdownPluginFallbackMountDetail, 'kind'>
  | Omit<MarkdownCustomRendererMountDetail, 'kind'>;

/**
 * Fills in `kind` for a detail emitted before the field existed.
 *
 * The one place the payload's shape is still consulted, and only when there is
 * nothing else to go on. Delete it once the floor on `@carbon/ai-chat-components`
 * rises past the release that added `kind`.
 */
export function resolveMarkdownPluginHostMountDetail(
  detail: MarkdownPluginHostMountDetailInput
): MarkdownPluginHostMountDetail {
  if ('kind' in detail) {
    return detail;
  }
  return 'element' in detail
    ? { ...detail, kind: 'customRenderer' }
    : { ...detail, kind: 'pluginFallback' };
}

export interface MarkdownPluginHostControllerOptions {
  /**
   * Called with a fresh array whenever the set of slot names this surface
   * should forward inward changes. Surfaces one shadow boundary from the
   * markdown element render no forwarder of their own and omit it — the React
   * `ChatContainer` is the one in this repo.
   *
   * Both kinds, and including names this surface declined to host: a container
   * nested inside an outer chat element still has to forward the slot the
   * outer one is hosting. The innermost hop — into the markdown element's own
   * shadow slot — is never one of these; the element mints that one, for
   * either kind, in the pass that read the claim.
   */
  onSlotNamesChange?: (slotNames: string[]) => void;

  /**
   * Return `true` to forward the slot without hosting it, because an outer
   * chat element will. Omitted by surfaces that are always outermost.
   */
  shouldDefer?: (event: Event) => boolean;
}

export interface MarkdownPluginHostController {
  /** Subscribes to the three events. Safe to call again without disconnecting. */
  connect(): void;
  /**
   * Unsubscribes and removes the hosts this controller created. Relocated
   * `customRenderers` elements are left parented — they belong to the markdown
   * element, and as children of `target` they ride along with a DOM move.
   * Forwarded slot names survive too.
   */
  disconnect(): void;
  /**
   * Plugin-fallback hosts this controller created, keyed by slot name.
   * Relocated `customRenderers` elements are deliberately absent.
   */
  readonly hosts: ReadonlyMap<string, HTMLElement>;
}

const MOUNT = 'cds-aichat-markdown-plugin-host-mount';
const UPDATE = 'cds-aichat-markdown-plugin-host-update';
const UNMOUNT = 'cds-aichat-markdown-plugin-host-unmount';

/**
 * Answers the plugin-host offer on `target`'s behalf, hosting accepted offers
 * as slot-attributed children of `target`.
 *
 * `target` is both the listener and the host parent because in every chat
 * surface they are the same element — the offer is claimed by whichever chat
 * element is outermost, and that is the element whose light DOM is page DOM.
 *
 * Not part of this package's advertised surface: it is deliberately absent from
 * `components/markdown/index.ts`, where only the detail types above are
 * exported. It is not marked with the internal JSDoc tag either — this package
 * compiles with `stripInternal`, which would drop the declaration from the
 * emitted `.d.ts`, and every caller lives in the sibling package and resolves
 * its types through exactly that file. (Do not write that tag's name anywhere
 * in this comment: `stripInternal` matches the string, not just a real tag.)
 */
export function createMarkdownPluginHostController(
  target: HTMLElement,
  options: MarkdownPluginHostControllerOptions = {}
): MarkdownPluginHostController {
  const { onSlotNamesChange, shouldDefer } = options;
  // Keyed by slot name alone: the markdown element namespaces every name it
  // mints per element (see `./slot-names.js`), so two messages rendering the
  // same markdown can't collide here. Only hosts this controller created —
  // a relocated `customRenderers` element is parented to `target` but never
  // entered here, which is what keeps `handleUpdate` from clobbering a
  // consumer's node and `disconnect()` from destroying one.
  const hosts = new Map<string, HTMLElement>();
  let slotNames: string[] = [];

  // Built once, not per `connect()`: a Lit `connectedCallback` can fire again
  // without an intervening disconnect, and fresh closures would register a
  // second time and handle every mount twice.
  const handleMount = (event: Event) => {
    const raw = (
      event as CustomEvent<MarkdownPluginHostMountDetailInput | undefined>
    ).detail;
    if (!raw?.slotName) {
      return;
    }
    const detail = resolveMarkdownPluginHostMountDetail(raw);

    // Track before deferring: a container nested inside an outer chat element
    // hosts nothing but still has to forward the slot inward.
    if (!slotNames.includes(detail.slotName)) {
      slotNames = [...slotNames, detail.slotName];
      onSlotNamesChange?.(slotNames);
    }
    if (shouldDefer?.(event)) {
      return;
    }

    event.preventDefault();
    if (detail.kind === 'customRenderer') {
      // A live node the markdown element created, keeps writing to and
      // removes: re-parent it and nothing else. No inline spacing — the stack
      // gap lives on the `<slot>` placeholder in the element's own shadow CSS,
      // and a style attribute here would outrank the page stylesheet this
      // relocation exists to admit.
      detail.element.setAttribute('slot', detail.slotName);
      // Re-appending a node already parented here detaches and reattaches the
      // consumer's whole subtree, running its disconnect/connect teardown.
      if (detail.element.parentElement !== target) {
        target.appendChild(detail.element);
      }
      return;
    }
    let host = hosts.get(detail.slotName);
    if (!host) {
      host = document.createElement(detail.isInline ? 'span' : 'div');
      host.setAttribute('slot', detail.slotName);
      // Match `.cds-aichat-markdown-stack > *:not(:first-child)` spacing;
      // shadow CSS doesn't reach a host in page light DOM, so apply it inline.
      // Inline output flows with text and gets no extra spacing.
      if (!detail.isInline) {
        host.style.marginBlockStart = '1rem';
      }
      hosts.set(detail.slotName, host);
      target.appendChild(host);
    }
    // `?? ''` here and in `handleUpdate`: `html` is typed `string`, but the
    // emitter can be a third-party element this compiler never saw, and
    // `innerHTML = undefined` writes the literal string "undefined".
    if (host.innerHTML !== (detail.html ?? '')) {
      host.innerHTML = detail.html ?? '';
    }
  };

  const handleUpdate = (event: Event) => {
    const detail = (
      event as CustomEvent<{ slotName: string; html: string } | undefined>
    ).detail;
    if (!detail?.slotName) {
      return;
    }
    const host = hosts.get(detail.slotName);
    if (host && host.innerHTML !== (detail.html ?? '')) {
      host.innerHTML = detail.html ?? '';
    }
  };

  const handleUnmount = (event: Event) => {
    const detail = (event as CustomEvent<{ slotName: string } | undefined>)
      .detail;
    if (!detail?.slotName) {
      return;
    }
    if (slotNames.includes(detail.slotName)) {
      slotNames = slotNames.filter((name) => name !== detail.slotName);
      onSlotNamesChange?.(slotNames);
    }
    const host = hosts.get(detail.slotName);
    if (host) {
      host.remove();
      hosts.delete(detail.slotName);
    }
  };

  return {
    hosts,
    connect() {
      target.addEventListener(MOUNT, handleMount);
      target.addEventListener(UPDATE, handleUpdate);
      target.addEventListener(UNMOUNT, handleUnmount);
    },
    disconnect() {
      target.removeEventListener(MOUNT, handleMount);
      target.removeEventListener(UPDATE, handleUpdate);
      target.removeEventListener(UNMOUNT, handleUnmount);
      for (const host of hosts.values()) {
        host.remove();
      }
      hosts.clear();
      // Slot names deliberately survive. `handleUpdate` drops an update whose
      // host is missing, so retention would strand a slot if only this element
      // cycled — it is safe because the markdown element is a shadow-including
      // descendant, so it cycles too, clears its own claims and re-offers a
      // mount rather than an update. Clearing here would also make that next
      // mount replace the consumer's list rather than extend it.
    },
  };
}
