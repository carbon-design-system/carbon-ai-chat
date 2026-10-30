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
import '@carbon/ai-chat-components/es/components/chat-shell/src/chat-header.js';
import '@carbon/web-components/es/components/ai-label/ai-label.js';
import '@carbon/web-components/es/components/ai-label/ai-label-action-button.js';
import { AI_LABEL_SIZE } from '@carbon/web-components/es/components/ai-label/defs.js';
import { POPOVER_ALIGNMENT } from '@carbon/web-components/es/components/popover/defs.js';
import Home16 from '@carbon/icons/es/home/16.js';
import Menu16 from '@carbon/icons/es/menu/16.js';
import type { CarbonIcon } from '@carbon/web-components/es/globals/internal/icon-loader-utils.js';
import type { Action } from '@carbon/ai-chat-components/es/components/toolbar/src/toolbar.js';

import type { AppState } from '../../../types/state/AppState';
import type {
  HeaderConfig,
  ToolbarAction,
} from '../../../types/config/HeaderConfig';
import { WriteableElementName } from '../../../types/instance/WriteableElements';
import type { BusEventHeaderMenuClick } from '../../../types/events/eventBusTypes';
import { NativeChatView } from '../shared/NativeChatView';
import { shallowEqual } from '../../store/appStore';
import { selectHumanAgentDisplayState } from '../../store/selectors';
import { isDirectionRTL } from '../../utils/domUtils';
import { observeWriteableElementPresence } from '../../utils/writeableElementPresence';
import {
  mergeHeaderConfig,
  deriveHeaderActions,
  deriveHeaderNavigation,
  type HeaderProps,
} from '../../utils/headerView';

type HeaderLanguage = Pick<
  AppState['languagePack'],
  | 'homeScreen_returnToHome'
  | 'launcher_isOpen'
  | 'header_overflowMenu_options'
  | 'components_overflow_ariaLabel'
  | 'buttons_restart'
  | 'ai_slug_label'
  | 'ai_slug_title'
  | 'ai_slug_description'
  | 'homeScreen_overflowMenuHomeScreen'
>;

type HeaderIconTransform = (icon: ToolbarAction['icon']) => CarbonIcon;

@carbonElement('cds-aichat-header-view')
class HeaderView extends NativeChatView implements HeaderProps {
  @property({ attribute: false })
  onClose: HeaderProps['onClose'];

  @property({ attribute: false })
  onRestart?: HeaderProps['onRestart'];

  @property({ attribute: false })
  onToggleHomeScreen: HeaderProps['onToggleHomeScreen'];

  @property({ type: Boolean, attribute: false })
  isHomeScreenActive = false;

  @property({ attribute: false })
  headerConfigOverride?: Partial<HeaderConfig>;

  @property({ attribute: false })
  transformIcon?: HeaderIconTransform;

  private languagePack: HeaderLanguage;
  private derivedHeaderConfig: HeaderConfig;
  private homeScreenIsOn = false;
  private isConnectingOrConnected = false;
  private isOpen = false;
  private isRestarting = false;
  private explainabilityContentPresent = false;
  private actionInputs?: unknown[];
  private actions?: Action[];
  private navigationInputs?: unknown[];
  private navigation?: ReturnType<typeof deriveHeaderNavigation>;
  private readonly fireHeaderMenuClick = (event: BusEventHeaderMenuClick) => {
    this.serviceManager.fire(event);
  };

  protected onViewConnected() {
    this.actionInputs = undefined;
    this.actions = undefined;
    this.navigationInputs = undefined;
    this.navigation = undefined;
    this.selectStore(
      (state) => ({
        homeScreen_returnToHome: state.languagePack.homeScreen_returnToHome,
        launcher_isOpen: state.languagePack.launcher_isOpen,
        header_overflowMenu_options:
          state.languagePack.header_overflowMenu_options,
        components_overflow_ariaLabel:
          state.languagePack.components_overflow_ariaLabel,
        buttons_restart: state.languagePack.buttons_restart,
        ai_slug_label: state.languagePack.ai_slug_label,
        ai_slug_title: state.languagePack.ai_slug_title,
        ai_slug_description: state.languagePack.ai_slug_description,
        homeScreen_overflowMenuHomeScreen:
          state.languagePack.homeScreen_overflowMenuHomeScreen,
      }),
      (languagePack) => {
        this.languagePack = languagePack;
      },
      shallowEqual
    );
    this.selectStore(
      (state) => state.config.derived.header,
      (headerConfig) => {
        this.derivedHeaderConfig = headerConfig;
      }
    );
    this.selectStore(
      (state) =>
        Boolean(
          state.config.public.homescreen?.isOn &&
          !state.config.public.homescreen?.disableReturn
        ),
      (homeScreenIsOn) => {
        this.homeScreenIsOn = homeScreenIsOn;
      }
    );
    this.selectStore(
      (state) => selectHumanAgentDisplayState(state).isConnectingOrConnected,
      (isConnectingOrConnected) => {
        this.isConnectingOrConnected = isConnectingOrConnected;
      }
    );
    this.selectStore(
      (state) => state.persistedToBrowserStorage.viewState.mainWindow,
      (isOpen) => {
        this.isOpen = isOpen;
      }
    );
    this.selectStore(
      (state) => state.isRestarting,
      (isRestarting) => {
        this.isRestarting = isRestarting;
      }
    );
    this.own(
      observeWriteableElementPresence(
        this.serviceManager.writeableElements[
          WriteableElementName.EXPLAINABILITY_POPOVER_CONTENT
        ],
        (present) => {
          if (present !== this.explainabilityContentPresent) {
            this.explainabilityContentPresent = present;
            this.requestUpdate();
          }
        }
      )
    );
  }

  requestFocus(): boolean {
    if (!this.isConnected || !this.viewState) {
      return false;
    }
    return (
      this.querySelector('cds-aichat-chat-header')?.requestFocus() ?? false
    );
  }

  private updateActions(headerConfig: HeaderConfig): Action[] {
    const inputs = [
      headerConfig?.actions,
      headerConfig?.showRestartButton,
      headerConfig?.hideMinimizeButton,
      headerConfig?.minimizeButtonIconType,
      this.isOpen,
      this.isRestarting,
      this.onClose,
      this.onRestart,
      this.languagePack.launcher_isOpen,
      this.languagePack.buttons_restart,
      this.transformIcon,
    ];
    if (
      !this.actionInputs ||
      inputs.some((value, index) => !Object.is(value, this.actionInputs[index]))
    ) {
      this.actionInputs = inputs;
      this.actions = deriveHeaderActions({
        headerConfig,
        isOpen: this.isOpen,
        isRestarting: this.isRestarting,
        onClose: this.onClose,
        onRestart: this.onRestart,
        closeButtonLabel: this.languagePack.launcher_isOpen,
        restartButtonLabel: this.languagePack.buttons_restart,
      }).map((action) => ({
        ...action,
        icon: this.transformIcon
          ? this.transformIcon(action.icon)
          : (action.icon as CarbonIcon),
      }));
    }
    return this.actions;
  }

  private updateNavigation(headerConfig: HeaderConfig) {
    const inputs = [
      headerConfig?.menuOptions,
      this.homeScreenIsOn,
      this.isConnectingOrConnected,
      this.isHomeScreenActive,
      this.onToggleHomeScreen,
      this.languagePack.homeScreen_returnToHome,
      this.languagePack.homeScreen_overflowMenuHomeScreen,
    ];
    if (
      !this.navigationInputs ||
      inputs.some(
        (value, index) => !Object.is(value, this.navigationInputs[index])
      )
    ) {
      this.navigationInputs = inputs;
      this.navigation = deriveHeaderNavigation({
        headerConfig,
        homeScreenIsOn: this.homeScreenIsOn,
        isConnectingOrConnected: this.isConnectingOrConnected,
        isHomeScreenActive: this.isHomeScreenActive,
        onToggleHomeScreen: this.onToggleHomeScreen,
        backButtonLabel: this.languagePack.homeScreen_returnToHome,
        homeScreenMenuLabel:
          this.languagePack.homeScreen_overflowMenuHomeScreen,
        fireHeaderMenuClick: this.fireHeaderMenuClick,
      });
    }
    return this.navigation;
  }

  protected renderView() {
    const headerConfig = mergeHeaderConfig(
      this.derivedHeaderConfig,
      this.headerConfigOverride
    );
    const actions = this.updateActions(headerConfig);
    const navigation = this.updateNavigation(headerConfig);
    const isRTL = isDirectionRTL();
    const { languagePack } = this;
    const hideDefaultAiLabelContent =
      this.explainabilityContentPresent ||
      headerConfig?.hideDefaultAiLabelContent;
    const showAiSlugContent =
      headerConfig?.showAiLabel !== undefined ? headerConfig.showAiLabel : true;
    const suffix = this.serviceManager.namespace.suffix;

    return html`
      <div
        class=${classMap({
          'cds-aichat--header__container': true,
          'cds-aichat--header-constrain-width':
            headerConfig?.hasContentMaxWidth ?? false,
        })}>
        <cds-aichat-chat-header
          .actions=${actions}
          .overflow=${true}
          .isRTL=${isRTL}
          .headerTitle=${headerConfig?.title ?? undefined}
          .headerName=${headerConfig?.name || undefined}
          .navigationType=${navigation.navigationType}
          .navigationBackIcon=${Home16}
          .navigationBackLabel=${languagePack.homeScreen_returnToHome}
          .navigationBackOnClick=${navigation.backOnClick}
          .navigationOverflowItems=${navigation.overflowItems}
          .navigationOverflowLabel=${languagePack.header_overflowMenu_options}
          .navigationOverflowAriaLabel=${languagePack.components_overflow_ariaLabel}
          .navigationOverflowIcon=${Menu16}
          .navigationOverflowOnClick=${navigation.overflowOnClick}
          .navigationTooltipAlign=${'right'}>
          ${
            showAiSlugContent
              ? html`
                  <cds-ai-label
                    slot="decorator"
                    class="cds-aichat--header__slug"
                    size=${AI_LABEL_SIZE.EXTRA_SMALL}
                    aria-label=${languagePack.ai_slug_label}
                    role="button"
                    .alignment=${isRTL ? POPOVER_ALIGNMENT.BOTTOM_LEFT : POPOVER_ALIGNMENT.BOTTOM_RIGHT}>
                    <div
                      slot="body-text"
                      id=${`explainabilityPopoverContent${suffix}`}
                      class="cds-aichat--header__slug-explainability-content"
                      data-floating-menu-container>
                      <slot
                        name=${WriteableElementName.EXPLAINABILITY_POPOVER_CONTENT}></slot>
                    </div>
                    ${
                      !hideDefaultAiLabelContent
                        ? html`
                            <div role="dialog" slot="body-text">
                              ${languagePack.ai_slug_label ? html`<p class="cds-aichat--header__slug-label">${languagePack.ai_slug_label}</p>` : nothing}
                              ${languagePack.ai_slug_title ? html`<h4 class="cds-aichat--header__slug-title">${languagePack.ai_slug_title}</h4>` : nothing}
                              <div class="cds-aichat--header__slug-description">
                                <div>${languagePack.ai_slug_description}</div>
                                <div
                                  id=${`aiTooltipAfterDescription${suffix}`}
                                  data-floating-menu-container>
                                  <slot
                                    name=${WriteableElementName.AI_TOOLTIP_AFTER_DESCRIPTION_ELEMENT}></slot>
                                </div>
                              </div>
                            </div>
                          `
                        : nothing
                    }
                    <div
                      slot="actions"
                      id=${`explainabilityPopoverActions${suffix}`}
                      class="cds-aichat--header__slug-explainability-actions"
                      data-floating-menu-container>
                      <slot
                        name=${WriteableElementName.EXPLAINABILITY_POPOVER_ACTIONS}></slot>
                    </div>
                  </cds-ai-label>
                `
              : nothing
          }
          <div
            slot="fixed-actions"
            id=${`headerFixedActionsElement${suffix}`}
            data-floating-menu-container>
            <slot
              name=${WriteableElementName.HEADER_FIXED_ACTIONS_ELEMENT}></slot>
          </div>
        </cds-aichat-chat-header>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-header-view': HeaderView;
  }
}

export default HeaderView;
