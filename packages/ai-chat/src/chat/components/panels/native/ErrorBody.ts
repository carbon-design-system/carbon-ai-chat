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
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import {
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_SIZE,
} from '@carbon/ai-chat-components/es/components/chat-button/src/chat-button.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import Restart16 from '@carbon/icons/es/restart/16.js';
import { NativeChatView } from '../../shared/NativeChatView';
import { shallowEqual } from '../../../store/appStore';
import { getCarbonTheme, selectCarbonTheme } from '../../../utils/carbonTheme';
import type { IntlShape } from '../../../utils/i18n';
import type { AppState } from '../../../../types/state/AppState';
import { renderErrorIllustration } from './panelIllustrations';
import type { PanelBodyContentDetail } from './panelBodyContent';

interface CatastrophicErrorPanelProps {
  title?: string;
  bodyText?: string;
  onRestart: () => void;
  hideRetryButton?: boolean;
}

@carbonElement('cds-aichat-error-body')
class ErrorBody extends NativeChatView {
  @property({ attribute: false })
  panelTitle?: string;

  @property({ attribute: false })
  bodyText?: string;

  @property({ attribute: false })
  onRestart: () => void;

  @property({ type: Boolean, attribute: false })
  hideRetryButton = false;

  private languagePack: Pick<
    AppState['languagePack'],
    'errors_somethingWrong' | 'buttons_retry'
  >;
  private intl: IntlShape;
  private assistantName: string;
  private isDark = false;
  private readonly gradientID = uuid();
  private readonly contentTarget = Object.assign(
    document.createElement('div'),
    {
      className: 'cds-aichat--catastrophic-error__error-body',
    }
  );
  private reportedContent?: PanelBodyContentDetail;
  private hasReportedContent = false;

  protected onViewConnected() {
    this.selectStore(
      (state) => ({
        errors_somethingWrong: state.languagePack.errors_somethingWrong,
        buttons_retry: state.languagePack.buttons_retry,
      }),
      (languagePack) => {
        this.languagePack = languagePack;
      },
      shallowEqual
    );
    this.selectStore(
      (state) => state.config.public.assistantName,
      (assistantName) => {
        this.assistantName = assistantName;
      }
    );
    this.selectStore(
      (state) => getCarbonTheme(selectCarbonTheme(state)).isDarkTheme,
      (isDark) => {
        this.isDark = isDark;
      }
    );
    this.selectView(
      (state) => state.intl,
      (intl) => {
        this.intl = intl;
      }
    );
  }

  disconnectedCallback() {
    this.reportContent(undefined);
    super.disconnectedCallback();
  }

  protected updated() {
    if (!this.viewState) {
      return;
    }
    this.reportContent(
      this.viewState && this.contentTarget.isConnected
        ? {
            target: this.contentTarget,
            text:
              this.bodyText ??
              this.intl.formatMessage(
                { id: 'errors_communicating' },
                { assistantName: this.assistantName }
              ),
          }
        : undefined
    );
  }

  private reportContent(detail: PanelBodyContentDetail | undefined) {
    if (
      this.hasReportedContent &&
      this.reportedContent?.target === detail?.target &&
      this.reportedContent?.text === detail?.text
    ) {
      return;
    }
    this.hasReportedContent = true;
    this.reportedContent = detail;
    this.dispatchEvent(
      new CustomEvent('panel-content-ready', { detail: detail ?? null })
    );
  }

  protected renderView() {
    return html`
      <div class="cds-aichat--catastrophic-error cds-aichat--panel-content">
        <div class="cds-aichat--catastrophic-error__error-text-container">
          ${renderErrorIllustration(this.isDark ? 'dark' : 'light', this.gradientID)}
          <div
            class="cds-aichat--catastrophic-error__error-heading"
            .textContent=${this.panelTitle ?? this.languagePack.errors_somethingWrong}></div>
          ${this.contentTarget}
          ${
            !this.hideRetryButton && this.onRestart
              ? html`<cds-aichat-button
                  class="cds-aichat--catastrophic-error__restart-button"
                  kind=${CHAT_BUTTON_KIND.TERTIARY}
                  size=${CHAT_BUTTON_SIZE.SMALL}
                  @click=${this.onRestart}>
                  ${iconLoader(Restart16, { slot: 'icon' })}
                  ${this.languagePack.buttons_retry}
                </cds-aichat-button>`
              : nothing
          }
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-error-body': ErrorBody;
  }
}

export type { CatastrophicErrorPanelProps };
export { ErrorBody };
