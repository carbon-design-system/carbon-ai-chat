/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { createPortal, flushSync } from "react-dom";

// Export the actual class for the component that will *directly* be wrapped with React.
import CDSAIChatMarkdown from "../components/markdown/src/markdown.js";
import type {
  MarkdownCustomRenderers,
  MarkdownRendererCodeBlockArgs,
  MarkdownRendererTableArgs,
} from "../components/markdown/src/markdown-renderer-types.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge";

const LitMarkdown = createComponent({
  tagName: "cds-aichat-markdown",
  elementClass: CDSAIChatMarkdown,
  react: React,
});

const ForwardedBaseMarkdown = React.forwardRef<
  CDSAIChatMarkdown,
  React.ComponentProps<typeof LitMarkdown> & { markdown?: string }
>(({ children, markdown, ...rest }, forwardedRef) => {
  const isTextChildren =
    typeof children === "string" || typeof children === "number";
  return React.createElement(
    LitMarkdown,
    {
      ...rest,
      ref: forwardedRef,
      markdown: markdown ?? (isTextChildren ? String(children) : undefined),
    },
    // Text children become the `markdown` prop; element children pass through
    // as light-DOM slot children (used by the React wrapper to mount plugin
    // slot forwarders inside the underlying `<cds-aichat-markdown>`).
    isTextChildren ? null : children,
  );
});

ForwardedBaseMarkdown.displayName = "BaseMarkdown";

/**
 * Thin `@lit/react` bridge around `<cds-aichat-markdown>`. Handles text vs.
 * element children and the web-component prop bridge, but performs no
 * React-specific `customRenderers` portaling — that is layered on by the
 * `Markdown` wrapper below.
 */
const BaseMarkdown = withWebComponentBridge(ForwardedBaseMarkdown);

/**
 * React-flavored variant of {@link MarkdownCustomRenderers}: each callback
 * may return a `ReactNode` (portaled into a light-DOM slot host) in addition
 * to the framework-neutral `HTMLElement | null`.
 */
export interface MarkdownReactCustomRenderers {
  /**
   * Override the default `cds-aichat-table` rendering. Return a `ReactNode`
   * (rendered via portal into a light-DOM slot host) or an `HTMLElement`
   * (adopted into the slot host as-is); return `null` to fall back to the
   * default Carbon table renderer.
   */
  table?: (args: MarkdownRendererTableArgs) => ReactNode | HTMLElement | null;
  /**
   * Override the default `cds-aichat-code-snippet` rendering. Return a
   * `ReactNode` (rendered via portal into a light-DOM slot host) or an
   * `HTMLElement` (adopted into the slot host as-is); return `null` to fall
   * back to the default Carbon code snippet renderer.
   */
  codeBlock?: (
    args: MarkdownRendererCodeBlockArgs,
  ) => ReactNode | HTMLElement | null;
}

type BaseMarkdownProps = Omit<
  ComponentPropsWithoutRef<typeof BaseMarkdown>,
  "customRenderers"
>;

/**
 * Props for the React `<Markdown>` wrapper around `<cds-aichat-markdown>`.
 */
export interface MarkdownProps extends BaseMarkdownProps {
  /**
   * Per-element render overrides. Each callback returns either a `ReactNode`
   * (rendered via portal into a light-DOM slot host) or an `HTMLElement`
   * (adopted into the slot host as-is). Return `null` to fall back to the
   * default Carbon rendering. Pass a stable reference (e.g. `useMemo`) — a
   * new object identity each render forces a full re-reconcile.
   */
  customRenderers?: MarkdownReactCustomRenderers;
}

type PortalEntry = {
  slotName: string;
  host: HTMLDivElement;
  node: ReactNode;
};

function isElement(value: unknown): value is HTMLElement {
  return (
    typeof Element !== "undefined" &&
    value instanceof Element &&
    "tagName" in value
  );
}

const Markdown = forwardRef<CDSAIChatMarkdown, MarkdownProps>(function Markdown(
  { customRenderers, ...rest },
  forwardedRef,
) {
  const hostsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [portalEntries, setPortalEntries] = useState<PortalEntry[]>([]);

  // Active plugin-fallback slot names that an outer chat container is hosting
  // in page light DOM. When a chat-container ancestor catches the
  // `cds-aichat-markdown-plugin-host-mount` event (and calls preventDefault),
  // the markdown element skips its own local-host fallback and relies on
  // these forwarders to project the page-level host element through every
  // shadow boundary into its named slot. Storybook standalone usage stays on
  // the local-host path — no listener consumes the event there.
  const [pluginSlotNames, setPluginSlotNames] = useState<string[]>([]);
  const markdownRef = useRef<CDSAIChatMarkdown | null>(null);
  const setMarkdownRef = useCallback(
    (node: CDSAIChatMarkdown | null) => {
      markdownRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef && "current" in forwardedRef) {
        (
          forwardedRef as React.MutableRefObject<CDSAIChatMarkdown | null>
        ).current = node;
      }
    },
    [forwardedRef],
  );

  useEffect(() => {
    const node = markdownRef.current;
    if (!node) {
      return undefined;
    }
    const handleMount = (event: Event) => {
      const slotName = (event as CustomEvent<{ slotName: string }>).detail
        ?.slotName;
      if (!slotName) {
        return;
      }
      setPluginSlotNames((prev) =>
        prev.includes(slotName) ? prev : [...prev, slotName],
      );
    };
    const handleUnmount = (event: Event) => {
      const slotName = (event as CustomEvent<{ slotName: string }>).detail
        ?.slotName;
      if (!slotName) {
        return;
      }
      setPluginSlotNames((prev) =>
        prev.includes(slotName) ? prev.filter((n) => n !== slotName) : prev,
      );
    };
    // Optimistic: we render a `<slot>` forwarder for every slot the markdown
    // element emits. If a chat container ancestor takes over hosting (by
    // calling `preventDefault()` on the mount event), the forwarder projects
    // the page-level host through the chain. If nothing intercepts
    // (standalone storybook), the markdown element creates its own local host
    // alongside, and the empty forwarder is harmless.
    node.addEventListener("cds-aichat-markdown-plugin-host-mount", handleMount);
    node.addEventListener(
      "cds-aichat-markdown-plugin-host-unmount",
      handleUnmount,
    );
    return () => {
      node.removeEventListener(
        "cds-aichat-markdown-plugin-host-mount",
        handleMount,
      );
      node.removeEventListener(
        "cds-aichat-markdown-plugin-host-unmount",
        handleUnmount,
      );
    };
  }, []);

  const setPortalForSlot = useCallback(
    (slotName: string, host: HTMLDivElement, node: ReactNode) => {
      setPortalEntries((prev) => {
        const idx = prev.findIndex((e) => e.slotName === slotName);
        if (idx >= 0 && prev[idx].node === node && prev[idx].host === host) {
          return prev;
        }
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = { slotName, host, node };
          return next;
        }
        return [...prev, { slotName, host, node }];
      });
    },
    [],
  );

  const bridgedRenderers = useMemo<MarkdownCustomRenderers | undefined>(() => {
    if (!customRenderers) {
      return undefined;
    }
    const bridge = <Args extends { slotName: string }>(
      callback: (args: Args) => ReactNode | HTMLElement | null,
    ) => {
      return (args: Args): HTMLElement | null => {
        const rendered = callback(args);
        if (rendered == null) {
          return null;
        }
        if (isElement(rendered)) {
          return rendered;
        }
        // Mint or reuse a stable host for this slot, then flush a portal
        // update synchronously so the host is populated before the Lit
        // element adopts it (no empty-host flash).
        let host = hostsRef.current.get(args.slotName);
        if (!host) {
          host = document.createElement("div");
          hostsRef.current.set(args.slotName, host);
        }
        flushSync(() => {
          setPortalForSlot(args.slotName, host as HTMLDivElement, rendered);
        });
        return host;
      };
    };

    const out: MarkdownCustomRenderers = {};
    if (customRenderers.table) {
      out.table = bridge(customRenderers.table);
    }
    if (customRenderers.codeBlock) {
      out.codeBlock = bridge(customRenderers.codeBlock);
    }
    return out;
  }, [customRenderers, setPortalForSlot]);

  // After every commit, prune portals whose host Lit has removed (its slot
  // dropped out of the descriptor batch, leaving the host detached). The
  // connectivity check is deferred to a microtask on purpose: `bridge` mints a
  // host, `flushSync`s the portal into it while it is still detached, and only
  // *returns* it to Lit — which appends it synchronously afterwards. That
  // `flushSync` runs this effect once while the host is not yet adopted, so a
  // synchronous `isConnected` check would prune the entry we just added and
  // leave the slot permanently empty (e.g. a streaming table custom renderer
  // flickering out as later content arrives). Reading `isConnected` a
  // microtask later lets Lit's adoption land first, so we only drop
  // genuinely-removed hosts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      let pruned = false;
      const aliveHosts = new Map<string, HTMLDivElement>();
      for (const [slotName, host] of hostsRef.current) {
        if (host.isConnected) {
          aliveHosts.set(slotName, host);
        } else {
          pruned = true;
        }
      }
      if (pruned) {
        hostsRef.current = aliveHosts;
      }
      setPortalEntries((prev) => {
        const filtered = prev.filter((e) => e.host.isConnected);
        return filtered.length === prev.length ? prev : filtered;
      });
    });
    return () => {
      cancelled = true;
    };
  });

  return (
    <>
      <BaseMarkdown
        {...rest}
        ref={setMarkdownRef as React.Ref<HTMLElement>}
        customRenderers={bridgedRenderers as never}
      >
        {pluginSlotNames.map((slotName) => (
          <slot key={slotName} name={slotName} slot={slotName} />
        ))}
      </BaseMarkdown>
      {portalEntries.map((entry) => (
        <React.Fragment key={entry.slotName}>
          {createPortal(entry.node, entry.host)}
        </React.Fragment>
      ))}
    </>
  );
});

Markdown.displayName = "Markdown";

export default Markdown;
