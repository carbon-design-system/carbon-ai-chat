/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, nothing } from 'lit';
import ChevronDown16 from '@carbon/icons/es/chevron--down/16.js';
import ChevronLeft16 from '@carbon/icons/es/chevron--left/16.js';
import CloseLarge16 from '@carbon/icons/es/close--large/16.js';
import '@carbon/ai-chat-components/es/components/toolbar/src/toolbar.js';
import '@carbon/web-components/es/components/icon-button/icon-button.js';
import {
  BUTTON_KIND,
  BUTTON_SIZE,
} from '@carbon/web-components/es/components/button/defs.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import { isDirectionRTL } from '../../../utils/domUtils';

interface PanelHeaderOptions {
  titleTarget?: HTMLElement;
  openFromSide?: boolean;
  showBackButton?: boolean;
  labelBackButton?: string;
  backButtonType?: 'minimize' | 'close';
  backButtonPosition?: 'start' | 'end';
  onClickBack?: () => void;
}

function renderPanelHeader({
  titleTarget,
  openFromSide,
  showBackButton = true,
  labelBackButton,
  backButtonType = 'minimize',
  backButtonPosition = 'end',
  onClickBack,
}: PanelHeaderOptions) {
  const icon =
    backButtonType === 'close'
      ? CloseLarge16
      : openFromSide
        ? ChevronLeft16
        : ChevronDown16;
  const actions =
    showBackButton && backButtonPosition !== 'start'
      ? [
          {
            text: labelBackButton ?? '',
            icon,
            size: BUTTON_SIZE.MEDIUM,
            onClick: () => onClickBack?.(),
          },
        ]
      : [];
  return html`<div data-floating-menu-container>
    <cds-aichat-toolbar .actions=${actions}>
      ${titleTarget ?? html`<div slot="title"></div>`}
      ${
        showBackButton && backButtonPosition === 'start'
          ? html` <div slot="navigation">
              <cds-icon-button
                data-rounded="top-left"
                size="md"
                kind=${BUTTON_KIND.GHOST}
                align=${isDirectionRTL() ? 'bottom-end' : 'bottom-start'}
                .enterDelayMs=${0}
                .leaveDelayMs=${0}
                @click=${() => onClickBack?.()}>
                ${iconLoader(icon, { slot: 'icon' })}
                ${labelBackButton ? html`<span slot="tooltip-content">${labelBackButton}</span>` : nothing}
              </cds-icon-button>
            </div>`
          : nothing
      }
    </cds-aichat-toolbar>
  </div>`;
}

export { renderPanelHeader };
