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

@carbonElement('cds-aichat-hydration-body')
class HydrationBody extends NativeChatView {
  @property({ type: Boolean, attribute: false })
  isHydrated = false;

  private loadingLabel: string;
  private lifecycle?: HydrationBodyLifecycle;

  protected onViewConnected() {
    this.selectStore(
      (state) => state.languagePack.window_ariaWindowLoading,
      (label) => {
        this.loadingLabel = label;
      }
    );
    const announcer = this.viewState.announcer;
    const lifecycle = new HydrationBodyLifecycle(
      { isHydrated: this.isHydrated, announcement: this.loadingLabel },
      (text) => announcer.announce(text)
    );
    this.lifecycle = lifecycle;
    this.own(lifecycle.subscribe(() => this.requestUpdate()));
    this.own(() => {
      this.lifecycle = undefined;
      lifecycle.disconnect();
    });
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
