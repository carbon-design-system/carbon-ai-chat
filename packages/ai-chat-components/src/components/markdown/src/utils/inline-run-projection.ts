/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, nothing, render, type RootPart, type TemplateResult } from 'lit';
import { AsyncDirective } from 'lit/async-directive.js';
import {
  Directive,
  directive,
  type ChildPart,
  type ElementPart,
} from 'lit/directive.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import prefix from '../../../../globals/settings.js';
import styles from '../inline-run-projection.scss?lit';
import {
  getMarkdownPluginHostTargets,
  releaseMarkdownPluginHostClaims,
  type MarkdownCustomRendererMountDetail,
} from './plugin-host-container.js';

const projectionHosts = new WeakSet<object>();
const styleRoots = new WeakMap<
  Document | ShadowRoot,
  {
    count: number;
    sheet?: CSSStyleSheet;
    element?: HTMLStyleElement;
  }
>();

export function installInlineRunStyles(host: HTMLElement): () => void {
  const root = host.getRootNode();
  if (!(root instanceof Document || root instanceof ShadowRoot)) {
    return () => {};
  }
  let entry = styleRoots.get(root);
  if (!entry) {
    entry = { count: 0 };
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(styles.cssText);
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      entry.sheet = sheet;
    } catch {
      const element = host.ownerDocument.createElement('style');
      element.textContent = styles.cssText;
      (root instanceof Document ? root.head : root).append(element);
      entry.element = element;
    }
    styleRoots.set(root, entry);
  }
  entry.count++;
  return () => {
    entry.count--;
    if (entry.count) {
      return;
    }
    if (entry.sheet) {
      root.adoptedStyleSheets = root.adoptedStyleSheets.filter(
        (sheet) => sheet !== entry.sheet
      );
    }
    entry.element?.remove();
    styleRoots.delete(root);
  };
}

class ProjectedInlinePlugin extends Directive {
  render(_markup: string, fallback: string) {
    return fallback;
  }

  update(part: ChildPart, [markup, fallback]: [string, string]) {
    const host = part.options?.host;
    return host && projectionHosts.has(host)
      ? html`<span class=${`${prefix}-markdown-inline-plugin`}
          >${unsafeHTML(markup)}</span
        >`
      : fallback;
  }
}

export const projectedInlinePlugin = directive(ProjectedInlinePlugin);

interface InlineRunOptions {
  slotName: string;
  fallbackHost?: HTMLElement;
  resetInlineStyles?: boolean;
}

class InlineRunProjection extends AsyncDirective {
  private slot?: HTMLSlotElement;
  private host?: HTMLSpanElement;
  private hostParent?: Node | null;
  private controllerTargets: HTMLElement[] = [];
  private forwarder?: HTMLSlotElement;
  private rootPart?: RootPart;
  private options?: InlineRunOptions;
  private mounted = false;
  private claimed = false;
  private connectionFrame?: number;
  private releaseStyles?: () => void;

  render(_content: TemplateResult, _options: InlineRunOptions) {
    return nothing;
  }

  update(
    part: ElementPart,
    [content, options]: [TemplateResult, InlineRunOptions]
  ) {
    if (this.options?.slotName !== options.slotName) {
      this.unmount();
      this.host = part.element.ownerDocument.createElement('span');
      projectionHosts.add(this.host);
    }
    this.slot = part.element as HTMLSlotElement;
    this.options = options;
    this.host!.className = options.resetInlineStyles
      ? `${prefix}-markdown-inline-run ${prefix}-markdown-inline-run--reset`
      : `${prefix}-markdown-inline-run`;
    this.host!.slot = options.slotName;
    this.rootPart = render(content, this.host!, {
      host: this.host,
      isConnected: this.mounted,
    });
    queueMicrotask(() => this.connectRun());
    return nothing;
  }

  private connectRun() {
    if (
      !this.isConnected ||
      this.mounted ||
      !this.slot ||
      !this.host ||
      !this.options
    ) {
      return;
    }
    if (!this.slot.isConnected) {
      this.connectionFrame ??= requestAnimationFrame(() => {
        this.connectionFrame = undefined;
        this.connectRun();
      });
      return;
    }
    this.cancelConnectionFrame();
    const detail: MarkdownCustomRendererMountDetail = {
      kind: 'customRenderer',
      slotName: this.options.slotName,
      element: this.host,
      isInline: true,
    };
    // The hop back to the host goes in before the offer: the claimant moves
    // the host while it handles the event, and content that connects then
    // must already be slotted.
    const { fallbackHost } = this.options;
    const forwarder = this.slot.ownerDocument.createElement('slot');
    forwarder.name = this.options.slotName;
    forwarder.slot = this.options.slotName;
    fallbackHost?.append(forwarder);
    this.controllerTargets = getMarkdownPluginHostTargets(this.slot);
    const claimed = !this.slot.dispatchEvent(
      new CustomEvent(`${prefix}-markdown-plugin-host-mount`, {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail,
      })
    );
    this.claimed = claimed;
    this.mounted = true;
    if (fallbackHost) {
      if (claimed) {
        this.forwarder = forwarder;
      } else {
        forwarder.remove();
        if (this.host.parentNode !== fallbackHost) {
          fallbackHost.append(this.host);
        }
      }
    }
    this.hostParent = this.host.parentNode;
    if (this.host.isConnected) {
      this.releaseStyles?.();
      this.releaseStyles = installInlineRunStyles(this.host);
      this.rootPart?.setConnected(true);
    }
  }

  private cancelConnectionFrame() {
    if (this.connectionFrame !== undefined) {
      cancelAnimationFrame(this.connectionFrame);
      this.connectionFrame = undefined;
    }
  }

  private unmount() {
    this.cancelConnectionFrame();
    if (this.mounted) {
      releaseMarkdownPluginHostClaims(
        this.controllerTargets,
        this.options!.slotName
      );
      this.slot?.dispatchEvent(
        new CustomEvent(`${prefix}-markdown-plugin-host-unmount`, {
          bubbles: true,
          composed: true,
          detail: { slotName: this.options!.slotName },
        })
      );
    }
    this.mounted = false;
    this.claimed = false;
    this.controllerTargets = [];
    this.rootPart?.setConnected(false);
    this.releaseStyles?.();
    this.releaseStyles = undefined;
    if (this.host?.parentNode === this.hostParent) {
      this.host?.remove();
    }
    this.hostParent = undefined;
    this.forwarder?.remove();
    this.forwarder = undefined;
  }

  protected disconnected() {
    this.cancelConnectionFrame();
    if (this.slot?.isConnected) {
      this.unmount();
      return;
    }
    // A same-task DOM move reconnects before this microtask runs.
    queueMicrotask(() => {
      if (!this.isConnected || !this.slot?.isConnected) {
        this.unmount();
      }
    });
  }

  protected reconnected() {
    if (this.mounted && this.slot) {
      const targets = getMarkdownPluginHostTargets(this.slot);
      if (
        targets.length !== this.controllerTargets.length ||
        targets.some(
          (target, index) => target !== this.controllerTargets[index]
        )
      ) {
        this.unmount();
      } else if (targets.length === 0 && !this.claimed) {
        // An unregistered listener may claim a previously local run on reconnect.
        this.mounted = false;
      }
    }
    this.connectRun();
  }
}

const inlineRunProjection = directive(InlineRunProjection);

export function projectInlineRun(
  content: TemplateResult,
  options: InlineRunOptions
): TemplateResult {
  return html`<slot
    name=${options.slotName}
    ${inlineRunProjection(content, options)}
    >${content}</slot
  >`;
}
