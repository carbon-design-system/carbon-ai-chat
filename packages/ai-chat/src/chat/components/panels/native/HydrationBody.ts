/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { carbonElement } from '@carbon/ai-chat-components/es/globals/decorators/index.js';
import '@carbon/web-components/es/components/loading/loading.js';
import '@carbon/web-components/es/components/loading/loading-icon.js';
import { NativeChatView } from '../../shared/NativeChatView';
import { HydrationBodyLifecycle } from '../../../utils/panelBodyLifecycle';
import type { ChatViewState } from '../../../services/chatViewState';

@carbonElement('cds-aichat-hydration-body')
class HydrationBody extends NativeChatView {
  @property({ type: Boolean, attribute: false })
  isHydrated = false;

  private loadingLabel: string;
  private lifecycle?: HydrationBodyLifecycle;

  private lifecycleOwner?: ChatViewState;
  private releaseGeneration = 0;

  protected onViewConnected(viewState: ChatViewState) {
    this.releaseGeneration += 1;
    if (this.lifecycleOwner && this.lifecycleOwner !== viewState) {
      this.releaseLifecycle();
    }
    this.selectStore(
      (state) => state.languagePack.window_ariaWindowLoading,
      (label) => {
        this.loadingLabel = label;
      }
    );
    if (!this.lifecycle) {
      const announcer = viewState.announcer;
      this.lifecycle = new HydrationBodyLifecycle(
        { isHydrated: this.isHydrated, announcement: this.loadingLabel },
        (text) => announcer.announce(text)
      );
      this.lifecycleOwner = viewState;
    }
    this.own(this.lifecycle.subscribe(() => this.requestUpdate()));
    this.own(() => {
      const generation = ++this.releaseGeneration;
      if (this.isConnected) {
        this.releaseLifecycle();
      } else {
        queueMicrotask(() => {
          if (!this.isConnected && generation === this.releaseGeneration) {
            this.releaseLifecycle();
          }
        });
      }
    });
  }

  private releaseLifecycle() {
    this.lifecycle?.disconnect();
    this.lifecycle = undefined;
    this.lifecycleOwner = undefined;
  }

  protected updated() {
    const lifecycle = this.lifecycle;
    if (lifecycle) {
      lifecycle.update({
        isHydrated: this.isHydrated,
        announcement: this.loadingLabel,
      });
      lifecycle.connect();
    }
  }

  protected renderView() {
    return html`
      <div class="cds-aichat--hydrating-container">
        <div class="cds-aichat--hydrating cds-aichat--panel-content">
          ${
            this.lifecycle.getSnapshot()
              ? html`<cds-loading
                  .active=${true}
                  .overlay=${false}
                  .assistiveText=${this.loadingLabel}></cds-loading>`
              : nothing
          }
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-hydration-body': HydrationBody;
  }
}

export default HydrationBody;
