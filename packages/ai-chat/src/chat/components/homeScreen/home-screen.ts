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
import { classMap } from 'lit/directives/class-map.js';
import { carbonElement } from '@carbon/ai-chat-components/es/globals/decorators/index.js';
import {
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_SIZE,
} from '@carbon/ai-chat-components/es/components/chat-button/src/chat-button.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import ArrowRight16 from '@carbon/icons/es/arrow--right/16.js';

import type { AppState } from '../../../types/state/AppState';
import type { HomeScreenConfig } from '../../../types/config/HomeScreenConfig';
import type { SendOptions } from '../../../types/instance/ChatInstance';
import { WriteableElementName } from '../../../types/instance/WriteableElements';
import { MessageSendSource } from '../../../types/events/eventBusTypes';
import { PageObjectId } from '../../../testing/PageObjectId';
import { shallowEqual } from '../../store/appStore';
import { observeWriteableElementPresence } from '../../utils/writeableElementPresence';
import { NativeChatView } from '../shared/NativeChatView';

interface HomeScreenProps {
  isHydrated: boolean;
  onSendInput: (
    text: string,
    source: MessageSendSource,
    options?: SendOptions
  ) => Promise<void>;
  onToggleHomeScreen: () => void;
}

type HomeScreenLanguage = Pick<
  AppState['languagePack'],
  'homeScreen_ariaHomeScreenContent' | 'homeScreen_returnToAssistant'
>;

@carbonElement('cds-aichat-home-screen')
class HomeScreenView extends NativeChatView implements HomeScreenProps {
  @property({ type: Boolean, attribute: false })
  isHydrated = false;

  @property({ attribute: false })
  onSendInput: HomeScreenProps['onSendInput'];

  @property({ attribute: false })
  onToggleHomeScreen: HomeScreenProps['onToggleHomeScreen'];

  private homescreen?: HomeScreenConfig;
  private languagePack: HomeScreenLanguage;
  private showBackToAssistant = false;
  private aiEnabled = false;
  private hasCustomContent = false;

  protected onViewConnected() {
    this.selectStore(
      (state) => ({
        homeScreen_ariaHomeScreenContent:
          state.languagePack.homeScreen_ariaHomeScreenContent,
        homeScreen_returnToAssistant:
          state.languagePack.homeScreen_returnToAssistant,
      }),
      (languagePack) => {
        this.languagePack = languagePack;
      },
      shallowEqual
    );
    this.selectStore(
      (state) => state.config.public.homescreen,
      (homescreen) => {
        this.homescreen = homescreen;
      }
    );
    this.selectStore(
      (state) =>
        state.persistedToBrowserStorage.homeScreenState.showBackToAssistant,
      (showBackToAssistant) => {
        this.showBackToAssistant = showBackToAssistant;
      }
    );
    this.selectStore(
      (state) => state.config.derived.themeWithDefaults.aiEnabled,
      (aiEnabled) => {
        this.aiEnabled = aiEnabled;
      }
    );
    this.own(
      observeWriteableElementPresence(
        this.serviceManager.writeableElements[
          WriteableElementName.HOME_SCREEN_AFTER_STARTERS_ELEMENT
        ],
        (present) => {
          if (present !== this.hasCustomContent) {
            this.hasCustomContent = present;
            this.requestUpdate();
          }
        }
      )
    );
  }

  protected renderView() {
    const { greeting, starters, customContentOnly } = this.homescreen || {};
    const homeScreenWithStarters =
      starters?.isOn && Boolean(starters.buttons?.length);
    const { hasCustomContent } = this;

    return html`
      <div
        data-testid=${PageObjectId.HOME_SCREEN_PANEL}
        class=${classMap({
          'cds-aichat--home-screen': true,
          'cds-aichat--home-screen--background-ai-theme': this.aiEnabled,
          'cds-aichat--home-screen--hydration-complete': this.isHydrated,
        })}>
        <div
          class="cds-aichat--home-screen__content"
          role="dialog"
          aria-label=${this.languagePack.homeScreen_ariaHomeScreenContent}>
          <div class="cds-aichat--home-screen__body-wrapper">
            <div
              class=${classMap({
                'cds-aichat--home-screen__body': true,
                'cds-aichat--home-screen__body--no-custom-content':
                  !hasCustomContent,
                'cds-aichat--home-screen__body--custom-content':
                  hasCustomContent,
                'cds-aichat--home-screen__body--custom-content-only':
                  customContentOnly,
              })}>
              <div class="cds-aichat--home-screen__initial-content">
                ${
                  !customContentOnly
                    ? html`<h2
                        class="cds-aichat--home-screen__greeting"
                        .textContent=${greeting ?? ''}></h2>`
                    : nothing
                }
                ${
                  !customContentOnly && homeScreenWithStarters
                    ? html`<div
                        class=${classMap({
                          'cds-aichat--home-screen__starters': true,
                          'cds-aichat--home-screen__starters--animate-group':
                            starters.buttons.length > 5,
                        })}>
                        ${starters.buttons.map(
                          (starter) =>
                            html`<div
                              class="cds-aichat--home-screen__starter-wrapper">
                              <cds-aichat-button
                                size=${CHAT_BUTTON_SIZE.SMALL}
                                kind=${CHAT_BUTTON_KIND.TERTIARY}
                                .isQuickAction=${true}
                                class="cds-aichat--home-screen__starter"
                                @click=${() =>
                                  this.onSendInput(
                                    starter.label,
                                    MessageSendSource.HOME_SCREEN_STARTER
                                  )}>
                                ${starter.label}
                              </cds-aichat-button>
                            </div>`
                        )}
                      </div>`
                    : nothing
                }
              </div>
            </div>
            <div
              class=${classMap({
                'cds-aichat--home-screen__custom-content': true,
                'cds-aichat--home-screen__custom-content--custom-content-only':
                  customContentOnly,
                'cds-aichat--home-screen__custom-content--animation':
                  hasCustomContent || customContentOnly,
              })}>
              <div
                id=${`homeScreenAfterStartersElement${this.serviceManager.namespace.suffix}`}
                data-floating-menu-container>
                <slot
                  name=${WriteableElementName.HOME_SCREEN_AFTER_STARTERS_ELEMENT}></slot>
              </div>
            </div>
          </div>
          ${
            this.showBackToAssistant
              ? html`<cds-aichat-button
                  size=${CHAT_BUTTON_SIZE.SMALL}
                  kind=${CHAT_BUTTON_KIND.SECONDARY}
                  class="cds-aichat--home-screen__back-button"
                  @click=${this.onToggleHomeScreen}>
                  <span class="cds-aichat--home-screen__back-button-content">
                    <span
                      class="cds-aichat--home-screen__back-button-content-text">
                      ${this.languagePack.homeScreen_returnToAssistant}
                    </span>
                    ${iconLoader(ArrowRight16, { focusable: 'false', tabindex: -1 })}
                  </span>
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
    'cds-aichat-home-screen': HomeScreenView;
  }
}

export default HomeScreenView;
