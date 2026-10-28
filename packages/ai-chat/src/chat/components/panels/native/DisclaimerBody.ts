/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html } from 'lit';
import { property } from 'lit/decorators.js';
import { carbonElement } from '@carbon/ai-chat-components/es/globals/decorators/index.js';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import { CarbonTheme } from '../../../../types/config/CarbonTheme';
import { shallowEqual } from '../../../store/appStore';
import { DisclaimerReadState } from '../../../utils/panelBodyLifecycle';
import { NativeChatView } from '../../shared/NativeChatView';
import { renderChatBubble } from './panelIllustrations';

@carbonElement('cds-aichat-disclaimer-body')
class DisclaimerBody extends NativeChatView {
  @property({ attribute: false })
  disclaimerHTML?: string;

  @property({ attribute: false })
  onReadChange?: (read: boolean) => void;

  private readonly gradientID = uuid();
  private readonly readState = new DisclaimerReadState();
  private activeReadState?: DisclaimerReadState;
  private languagePack: {
    disclaimer_icon_label: string;
    disclaimer_title: string;
  };
  private isDarkTheme = false;
  private isOpen = false;

  protected onViewConnected() {
    this.selectStore(
      (state) => ({
        disclaimer_icon_label: state.languagePack.disclaimer_icon_label,
        disclaimer_title: state.languagePack.disclaimer_title,
      }),
      (languagePack) => {
        this.languagePack = languagePack;
      },
      shallowEqual
    );
    this.selectStore(
      (state) => {
        const theme = state.config.derived.themeWithDefaults.derivedCarbonTheme;
        return theme === CarbonTheme.G90 || theme === CarbonTheme.G100;
      },
      (isDarkTheme) => {
        this.isDarkTheme = isDarkTheme;
      }
    );
    this.selectStore(
      (state) => state.persistedToBrowserStorage.viewState.mainWindow,
      (isOpen) => {
        this.isOpen = isOpen;
      }
    );
    this.activeReadState = this.readState;
    this.own(
      this.readState.subscribe(() => {
        this.onReadChange?.(this.readState.getSnapshot());
      })
    );
    this.own(() => {
      this.activeReadState = undefined;
      this.readState.disconnect();
    });
  }

  observeScroll(detail: { isScrollable: boolean; isAtBottom: boolean }): void {
    if (this.isConnected && this.viewState) {
      this.activeReadState?.observeScroll(detail);
    }
  }

  protected updated() {
    const owner = this.activeReadState;
    if (!owner) {
      return;
    }
    const panel = this.closest<HTMLElement>('cds-aichat-panel');
    if (this.isOpen && panel) {
      owner.connect(panel);
    } else {
      owner.disconnect();
    }
  }

  protected renderView() {
    return html`
      <div class="cds-aichat--panel-content cds-aichat--disclaimer__content">
        <div class="cds-aichat--disclaimer__icon">
          ${renderChatBubble(this.isDarkTheme ? 'dark' : 'light', this.languagePack.disclaimer_icon_label, this.gradientID)}
        </div>
        <h1
          class="cds-aichat--disclaimer__title"
          .textContent=${this.languagePack.disclaimer_title}></h1>
        <div
          class="cds-aichat--disclaimer__description"
          .innerHTML=${this.disclaimerHTML ?? ''}></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-disclaimer-body': DisclaimerBody;
  }
}

export default DisclaimerBody;
