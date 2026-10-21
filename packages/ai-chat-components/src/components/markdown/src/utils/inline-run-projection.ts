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
import type { MarkdownCustomRendererMountDetail } from './plugin-host-container.js';

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
  private forwarder?: HTMLSlotElement;
  private rootPart?: RootPart;
  private options?: InlineRunOptions;
  private mounted = false;
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
    const claimed = !this.slot.dispatchEvent(
      new CustomEvent(`${prefix}-markdown-plugin-host-mount`, {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail,
      })
    );
    this.mounted = true;
    if (this.options.fallbackHost) {
      if (claimed) {
        this.forwarder = this.slot.ownerDocument.createElement('slot');
        this.forwarder.name = this.options.slotName;
        this.forwarder.slot = this.options.slotName;
        this.options.fallbackHost.append(this.forwarder);
      } else {
        this.options.fallbackHost.append(this.host);
      }
    }
    if (this.host.isConnected) {
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
      this.slot?.dispatchEvent(
        new CustomEvent(`${prefix}-markdown-plugin-host-unmount`, {
          bubbles: true,
          composed: true,
          detail: { slotName: this.options!.slotName },
        })
      );
    }
    this.mounted = false;
    this.rootPart?.setConnected(false);
    this.releaseStyles?.();
    this.releaseStyles = undefined;
    this.host?.remove();
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
