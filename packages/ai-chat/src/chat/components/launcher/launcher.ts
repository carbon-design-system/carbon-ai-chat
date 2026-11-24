/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { carbonElement } from '@carbon/ai-chat-components/es/globals/decorators/index.js';
import { uuid } from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import CDSButton, {
  BUTTON_KIND,
  BUTTON_SIZE,
  BUTTON_TOOLTIP_POSITION,
  BUTTON_TYPE,
} from '@carbon/web-components/es/components/button/button.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import AiLaunch24 from '@carbon/icons/es/ai-launch/24.js';
import ChatLaunch24 from '@carbon/icons/es/chat--launch/24.js';
import Close16 from '@carbon/icons/es/close/16.js';

import type { AppState } from '../../../types/state/AppState';
import { ViewType } from '../../../types/state/AppState';
import { TIME_TO_ENTRANCE_ANIMATION_START } from '../../../types/config/LauncherConfig';
import {
  MainWindowOpenReason,
  ViewChangeReason,
} from '../../../types/events/eventBusTypes';
import { PageObjectId } from '../../../testing/PageObjectId';
import { NativeChatView } from '../shared/NativeChatView';
import { LauncherState, LauncherOpenState } from '../../services/launcherState';
import { shallowEqual } from '../../store/appStore';
import actions from '../../store/actions';
import { IS_PHONE } from '../../utils/browserUtils';
import { doFocus, isDirectionRTL } from '../../utils/domUtils';
import type { IntlShape } from '../../utils/i18n';

type LauncherLanguage = Pick<
  AppState['languagePack'],
  | 'launcher_mobileGreeting'
  | 'launcher_desktopGreeting'
  | 'launcher_ariaIsExpanded'
  | 'launcher_isClosed'
  | 'launcher_isOpen'
>;

const launcherButtonId = `cds-aichat-launcher-button-${uuid()}`;

@carbonElement('cds-aichat-launcher-view')
class LauncherView extends NativeChatView {
  private languagePack: LauncherLanguage;
  private intl: IntlShape;
  private launcher: AppState['config']['derived']['launcher'];
  private isLauncherVisible = false;
  private isMainWindowOpen = false;
  private launcherIsExpanded = false;
  private shouldStartCounter = false;
  private showUnreadIndicator = false;
  private unreadMessageCount = 0;
  private aiEnabled = false;
  private initialViewChangeComplete = false;
  private previousFocusInputs?: boolean[];
  private launcherState?: LauncherState;

  protected onViewConnected() {
    this.previousFocusInputs = undefined;
    this.selectStore(
      (state) => ({
        launcher_mobileGreeting: state.languagePack.launcher_mobileGreeting,
        launcher_desktopGreeting: state.languagePack.launcher_desktopGreeting,
        launcher_ariaIsExpanded: state.languagePack.launcher_ariaIsExpanded,
        launcher_isClosed: state.languagePack.launcher_isClosed,
        launcher_isOpen: state.languagePack.launcher_isOpen,
      }),
      (languagePack) => {
        this.languagePack = languagePack;
      },
      shallowEqual
    );
    this.selectView(
      (state) => state.intl,
      (intl) => {
        this.intl = intl;
      }
    );
    this.selectStore(
      (state) => state.config.derived.launcher,
      (launcher) => {
        this.launcher = launcher;
      }
    );
    this.selectStore(
      (state) => ({
        isLauncherVisible: state.persistedToBrowserStorage.viewState.launcher,
        isMainWindowOpen: state.persistedToBrowserStorage.viewState.mainWindow,
        launcherIsExpanded: state.persistedToBrowserStorage.launcherIsExpanded,
        shouldStartCounter:
          state.persistedToBrowserStorage
            .launcherShouldStartCallToActionCounterIfEnabled,
        showUnreadIndicator:
          state.persistedToBrowserStorage.showUnreadIndicator,
      }),
      (state) => {
        Object.assign(this, state);
      },
      shallowEqual
    );
    this.selectStore(
      (state) => state.humanAgentState.numUnreadMessages,
      (count) => {
        this.unreadMessageCount = count;
      }
    );
    this.selectStore(
      (state) => state.config.derived.themeWithDefaults.aiEnabled,
      (aiEnabled) => {
        this.aiEnabled = aiEnabled;
      }
    );
    this.selectStore(
      (state) => state.initialViewChangeComplete,
      (complete) => {
        this.initialViewChangeComplete = complete;
      }
    );
    const { store } = this.serviceManager;
    const owner = new LauncherState(this.stateOptions(), {
      setExpanded: (value) => {
        store.dispatch(
          actions.setLauncherProperty('launcherIsExpanded', value)
        );
      },
      setShouldStartCounter: (value) => {
        store.dispatch(
          actions.setLauncherProperty(
            'launcherShouldStartCallToActionCounterIfEnabled',
            value
          )
        );
      },
    });
    this.launcherState = owner;
    this.own(
      owner.subscribe(() => {
        if (this.launcherState === owner && this.isConnected) {
          this.requestUpdate();
        }
      })
    );
    this.own(() => {
      if (this.launcherState === owner) {
        this.launcherState = undefined;
      }
      owner.disconnect();
    });
    owner.connect();
  }

  protected updated() {
    const owner = this.launcherState;
    if (!owner) {
      return;
    }
    owner.update(this.stateOptions());
    owner.bindTransitionTargets({
      greeting: this.querySelector('.cds-aichat--launcher-extended__greeting'),
      textHolder: this.querySelector(
        '.cds-aichat--launcher-extended__text-holder'
      ),
    });
    if (this.isMainWindowOpen && this.launcherIsExpanded) {
      owner.close();
    }
    const focusInputs = [
      this.initialViewChangeComplete,
      this.isLauncherVisible,
      this.isMainWindowOpen,
    ];
    const changed =
      this.previousFocusInputs &&
      focusInputs.some(
        (value, index) => value !== this.previousFocusInputs[index]
      );
    this.previousFocusInputs = focusInputs;
    if (
      changed &&
      this.initialViewChangeComplete &&
      this.isLauncherVisible &&
      !this.isMainWindowOpen
    ) {
      this.requestFocus();
    }
  }

  private stateOptions() {
    const config = IS_PHONE ? this.launcher.mobile : this.launcher.desktop;
    return {
      extended: this.launcherIsExpanded,
      autoExtendEnabled:
        Boolean(config?.isOn) && Boolean(this.shouldStartCounter),
      timeToExpand: config?.timeToExpand ?? TIME_TO_ENTRANCE_ANIMATION_START,
    };
  }

  requestFocus(): void {
    if (this.isConnected && this.viewState) {
      doFocus(this.buttonElement());
    }
  }

  buttonElement(): CDSButton | undefined {
    return (
      this.querySelector<CDSButton>(
        'cds-button.cds-aichat--launcher__button'
      ) ?? undefined
    );
  }

  containerElement(): HTMLDivElement | undefined {
    return (
      this.querySelector<HTMLDivElement>('.cds-aichat-launcher') ?? undefined
    );
  }

  launcherContainerElement(): HTMLDivElement | undefined {
    return this.containerElement();
  }

  private reduceLauncher = () => {
    if (this.launcherIsExpanded) {
      this.launcherState?.close();
    }
  };

  private handleToggleOpen = () => {
    this.reduceLauncher();
    return this.serviceManager?.actions.changeView(ViewType.MAIN_WINDOW, {
      viewChangeReason: ViewChangeReason.LAUNCHER_CLICKED,
      mainWindowOpenReason: MainWindowOpenReason.DEFAULT_LAUNCHER,
    });
  };

  protected renderView() {
    const state = this.launcherState.getSnapshot();
    const launcherHidden = !this.isLauncherVisible;
    const config = IS_PHONE ? this.launcher.mobile : this.launcher.desktop;
    const greeting =
      config?.title ||
      (IS_PHONE
        ? this.languagePack.launcher_mobileGreeting
        : this.languagePack.launcher_desktopGreeting);
    const shouldShowUnreadIndicator =
      this.showUnreadIndicator && !this.launcherIsExpanded;
    const unreadMessageCount = shouldShowUnreadIndicator
      ? Math.max(this.unreadMessageCount, 1)
      : this.unreadMessageCount;
    const unreadLabel =
      unreadMessageCount !== 0
        ? this.intl.formatMessage(
            { id: 'icon_ariaUnreadMessages' },
            { count: unreadMessageCount }
          )
        : undefined;
    const launcherAriaLabel = [
      launcherHidden
        ? this.languagePack.launcher_isOpen
        : this.languagePack.launcher_isClosed,
      unreadLabel,
    ]
      .filter(Boolean)
      .join('. ');
    const tooltipPosition = isDirectionRTL()
      ? BUTTON_TOOLTIP_POSITION.RIGHT
      : BUTTON_TOOLTIP_POSITION.LEFT;
    const shouldShowGreeting =
      state === LauncherOpenState.Opening || state === LauncherOpenState.Open;

    return html`
      <div
        class=${classMap({
          'cds-aichat-launcher': true,
          'cds-aichat-launcher--opening': state === LauncherOpenState.Opening,
          'cds-aichat-launcher--open': state === LauncherOpenState.Open,
          'cds-aichat-launcher--closing': state === LauncherOpenState.Closing,
          'cds-aichat-launcher--closed': state === LauncherOpenState.Closed,
          'cds-aichat-launcher--hidden': launcherHidden,
        })}>
        <cds-button
          class="cds-aichat--launcher-extended__close-button"
          kind=${BUTTON_KIND.SECONDARY}
          size=${BUTTON_SIZE.EXTRA_SMALL}
          aria-label=${this.languagePack.launcher_ariaIsExpanded}
          @click=${this.reduceLauncher}
          .tooltipPosition=${tooltipPosition}
          tooltip-text=${this.languagePack.launcher_ariaIsExpanded}>
          ${iconLoader(Close16, {
            'aria-label': this.languagePack.launcher_ariaIsExpanded,
            slot: 'icon',
            focusable: 'false',
            tabindex: -1,
          })}
        </cds-button>
        <cds-button
          role="complementary"
          id=${launcherButtonId}
          aria-label=${launcherAriaLabel}
          tooltip-text=${launcherAriaLabel}
          class="cds-aichat--launcher__button"
          data-testid=${PageObjectId.LAUNCHER}
          kind=${BUTTON_KIND.PRIMARY}
          @click=${this.handleToggleOpen}
          tabindex=${ifDefined(launcherHidden ? -1 : undefined)}
          type=${BUTTON_TYPE.BUTTON}
          .tooltipPosition=${tooltipPosition}>
          <div class="cds-aichat--launcher__wrapper">
            <div class="cds-aichat--launcher-extended__text-holder">
              <div class="cds-aichat--launcher-extended__greeting">
                ${shouldShowGreeting ? html`<div class="cds-aichat--launcher-extended__greeting-text">${greeting}</div>` : nothing}
              </div>
            </div>
            <div class="cds-aichat--launcher__icon-holder">
              ${
                config?.avatarUrlOverride
                  ? html`<img
                      class="cds-aichat--launcher__avatar"
                      src=${config.avatarUrlOverride}
                      aria-hidden="true"
                      alt="" />`
                  : iconLoader(this.aiEnabled ? AiLaunch24 : ChatLaunch24, {
                      class: 'cds-aichat--launcher__svg',
                      'aria-label': launcherAriaLabel,
                      role: 'img',
                      focusable: 'false',
                      tabindex: -1,
                    })
              }
            </div>
          </div>
          ${
            unreadMessageCount !== 0 || shouldShowUnreadIndicator
              ? html`<div
                  class="cds-aichat--count-indicator"
                  .textContent=${unreadMessageCount !== 0 ? String(unreadMessageCount) : ''}></div>`
              : nothing
          }
        </cds-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-launcher-view': LauncherView;
  }
}

export default LauncherView;
