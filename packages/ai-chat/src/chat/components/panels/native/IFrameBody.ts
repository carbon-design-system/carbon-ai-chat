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
import { keyed } from 'lit/directives/keyed.js';
import { carbonElement } from '@carbon/ai-chat-components/es/globals/decorators/index.js';
import '@carbon/web-components/es/components/loading/loading.js';
import '@carbon/web-components/es/components/loading/loading-icon.js';
import { NativeChatView } from '../../shared/NativeChatView';
import { IFrameBodyLifecycle } from '../../../utils/panelBodyLifecycle';
import type { PanelBodyContentDetail } from './panelBodyContent';
import { shallowEqual } from '../../../store/appStore';
import type { ChatViewState } from '../../../services/chatViewState';

interface IFramePanelMessage {
  source?: string;
  title?: string;
}

@carbonElement('cds-aichat-iframe-body')
class IFrameBody extends NativeChatView {
  @property({ attribute: false })
  messageItem?: IFramePanelMessage;

  private language: {
    errors_iframeSource: string;
    iframe_ariaSourceLoaded: string;
  };
  private connectedView = false;
  private source?: string;
  private lifecycle?: IFrameBodyLifecycle;
  private unsubscribe?: () => void;
  private errorTarget?: HTMLDivElement;
  private reportedContent?: PanelBodyContentDetail;
  private releaseGeneration = 0;
  private lifecycleOwner?: ChatViewState;

  protected onViewConnected(viewState: ChatViewState) {
    this.releaseGeneration += 1;
    if (this.lifecycleOwner && this.lifecycleOwner !== viewState) {
      this.releaseFrame();
    }
    this.connectedView = true;
    this.own(() => {
      this.connectedView = false;
      const generation = ++this.releaseGeneration;
      if (this.isConnected) {
        this.releaseFrame();
      } else {
        queueMicrotask(() => {
          if (!this.isConnected && generation === this.releaseGeneration) {
            this.releaseFrame();
          }
        });
      }
    });
    this.selectStore(
      (state) => ({
        errors_iframeSource: state.languagePack.errors_iframeSource,
        iframe_ariaSourceLoaded: state.languagePack.iframe_ariaSourceLoaded,
      }),
      (language) => {
        this.language = language;
      },
      shallowEqual
    );
  }

  protected willUpdate() {
    if (!this.viewState || !this.connectedView) {
      return;
    }
    const source = this.messageItem?.source || undefined;
    if (source === this.source && (this.lifecycle || !source)) {
      return;
    }
    this.releaseFrame();
    this.source = source;
    if (source) {
      const announcer = this.viewState.announcer;
      const lifecycle = new IFrameBodyLifecycle(
        this.language.errors_iframeSource,
        {
          loaded: () =>
            announcer.announce(this.language.iframe_ariaSourceLoaded),
          timedOut: () => announcer.announce(this.language.errors_iframeSource),
        }
      );
      this.lifecycle = lifecycle;
      this.lifecycleOwner = this.viewState;
      this.unsubscribe = lifecycle.subscribe(() => this.requestUpdate());
      this.errorTarget = document.createElement('div');
      this.errorTarget.className =
        'cds-aichat--i-frame-component__status-container';
    }
  }

  protected updated() {
    const lifecycle = this.lifecycle;
    if (!lifecycle) {
      return;
    }
    lifecycle.update(this.language.errors_iframeSource);
    lifecycle.connect();
    if (lifecycle.getSnapshot().error && this.errorTarget.isConnected) {
      this.reportContent({
        target: this.errorTarget,
        text: this.language.errors_iframeSource,
      });
    } else {
      this.reportContent(undefined);
    }
  }

  private reportContent(content: PanelBodyContentDetail | undefined) {
    if (
      this.reportedContent?.target === content?.target &&
      this.reportedContent?.text === content?.text
    ) {
      return;
    }
    this.reportedContent = content;
    this.dispatchEvent(
      new CustomEvent('panel-content-ready', { detail: content ?? null })
    );
  }

  private releaseFrame() {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.lifecycle?.disconnect();
    this.lifecycle = undefined;
    this.lifecycleOwner = undefined;
    this.source = undefined;
    this.errorTarget = undefined;
    this.reportContent(undefined);
  }

  protected renderView() {
    const lifecycle = this.lifecycle;
    const state = lifecycle?.getSnapshot();
    return html`
      <div class="cds-aichat--panel-content cds-aichat--i-frame-panel">
        <div class="cds-aichat--i-frame-panel__content">
          ${
            lifecycle
              ? keyed(
                  lifecycle,
                  html`
                    <div class="cds-aichat--i-frame-component__wrapper">
                      ${
                        state.error
                          ? this.errorTarget
                          : html`
                              <iframe
                                class="cds-aichat--i-frame-component__i-frame"
                                title=${this.messageItem?.title || this.source}
                                src=${this.source}
                                sandbox="allow-scripts allow-downloads allow-forms allow-popups allow-same-origin"
                                referrerpolicy="origin"
                                role="application"
                                tabindex="0"
                                @load=${(event: Event) => {
                                  if (
                                    this.connectedView &&
                                    this.isConnected &&
                                    event.currentTarget ===
                                      this.querySelector('iframe')
                                  ) {
                                    lifecycle.loaded();
                                  }
                                }}></iframe>
                            `
                      }
                      ${
                        state.showSpinner
                          ? html`
                              <div
                                class="cds-aichat--i-frame-component__status-container">
                                <cds-loading
                                  .active=${true}
                                  .overlay=${false}></cds-loading>
                              </div>
                            `
                          : nothing
                      }
                    </div>
                  `
                )
              : nothing
          }
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-iframe-body': IFrameBody;
  }
}

export type { IFramePanelMessage };
export default IFrameBody;
