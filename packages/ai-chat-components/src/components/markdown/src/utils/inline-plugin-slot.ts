/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { nothing } from 'lit';
import { AsyncDirective } from 'lit/async-directive.js';
import { directive, type ElementPart } from 'lit/directive.js';
import prefix from '../../../../globals/settings.js';
import type { MarkdownPluginFallbackMountDetail } from './plugin-host-container.js';

class InlinePluginSlot extends AsyncDirective {
  private element?: Element;
  private detail?: MarkdownPluginFallbackMountDetail;
  private mounted = false;
  private connectionFrame?: number;

  render(_detail: MarkdownPluginFallbackMountDetail) {
    return nothing;
  }

  update(part: ElementPart, [detail]: [MarkdownPluginFallbackMountDetail]) {
    if (this.detail?.slotName !== detail.slotName) {
      this.unmount();
    }
    this.element = part.element;
    this.detail = detail;
    // Element directives run before Lit inserts the cloned template.
    queueMicrotask(() => this.connectSlot());
    return nothing;
  }

  private connectSlot() {
    if (!this.isConnected || this.mounted || !this.element || !this.detail) {
      return;
    }
    if (!this.element.isConnected) {
      // Document observers cannot see insertion into an existing shadow root.
      this.connectionFrame ??= requestAnimationFrame(() => {
        this.connectionFrame = undefined;
        this.connectSlot();
      });
      return;
    }
    this.cancelConnectionFrame();
    this.mounted = true;
    this.element.dispatchEvent(
      new CustomEvent(`${prefix}-markdown-plugin-host-mount`, {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: this.detail,
      })
    );
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
      this.element?.dispatchEvent(
        new CustomEvent(`${prefix}-markdown-plugin-host-unmount`, {
          bubbles: true,
          composed: true,
          detail: { slotName: this.detail!.slotName },
        })
      );
      this.mounted = false;
    }
  }

  protected disconnected() {
    this.unmount();
  }

  protected reconnected() {
    this.connectSlot();
  }
}

export const inlinePluginSlot = directive(InlinePluginSlot);
