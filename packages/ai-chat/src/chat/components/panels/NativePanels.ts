/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, nothing, type LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { classMap } from 'lit/directives/class-map.js';
import { carbonElement } from '@carbon/ai-chat-components/es/globals/decorators/index.js';
import '@carbon/ai-chat-components/es/components/chat-shell/src/panel.js';
import '@carbon/web-components/es/components/button/button.js';
import type CDSButton from '@carbon/web-components/es/components/button/button.js';
import { BUTTON_KIND } from '@carbon/web-components/es/components/button/defs.js';
import { NativeChatView } from '../shared/NativeChatView';
import '../header/chat-header';
import type HeaderView from '../header/chat-header';
import './native/DisclaimerBody';
import type DisclaimerBody from './native/DisclaimerBody';
import './native/ConfirmationBody';
import { renderPanelHeader } from './native/panelHeader';
import type { AppState } from '../../../types/state/AppState';
import { ChatWidthBreakpoint } from '../../../types/state/AppState';
import { PageObjectId } from '../../../testing/PageObjectId';
import { shallowEqual } from '../../store/appStore';
import {
  ExtensionHosts,
  type PanelContentRequest,
  type PanelTargetName,
} from '../../services/extensionHosts';
import {
  type PanelName,
  type PanelViewInputs,
  type PanelCompositionCallbacks,
  deriveCustomPanelComposition,
  deriveResponsePanelComposition,
  deriveEndChatPrompt,
  deriveScreenSharePrompt,
  createPanelTransitionCallbacks,
  createCustomPanelActions,
  createEndChatActions,
  createScreenShareActions,
  focusPanelBodyBeforeHeader,
  handleConfirmationOpen,
  handleConfirmationKey,
} from '../../utils/panelComposition';

const PANEL_PRIORITY: Record<PanelName, number> = {
  error: 100,
  hydration: 90,
  disclaimer: 80,
  screenShare: 75,
  endChat: 70,
  custom: 60,
  response: 50,
  iframe: 40,
  citation: 30,
  history: 3,
};

type PanelLanguage = Pick<
  AppState['languagePack'],
  | 'aria_catastrophicErrorPanel'
  | 'aria_customPanel'
  | 'aria_disclaimerPanel'
  | 'aria_hydrationPanel'
  | 'aria_iframePanel'
  | 'aria_responsePanel'
  | 'aria_viewSourcePanel'
  | 'general_returnToAssistant'
  | 'disclaimer_acceptance_label'
  | 'disclaimer_accept'
  | 'agent_endChat'
  | 'agent_confirmCancelRequestTitle'
  | 'agent_confirmEndChat'
  | 'agent_confirmCancelRequestMessage'
  | 'agent_confirmEndChatNo'
  | 'agent_confirmEndSuspendedYes'
  | 'agent_confirmEndChatYes'
  | 'agent_confirmCancelRequestYes'
  | 'agent_sharingRequestTitle'
  | 'agent_sharingRequestMessage'
  | 'agent_sharingDeclineButton'
  | 'agent_sharingAcceptButton'
>;

interface FrameOptions {
  name: PanelName;
  open: boolean;
  label?: string;
  fullWidth?: boolean;
  showFrame?: boolean;
  showChatHeader?: boolean;
  aiEnabled?: boolean;
  bodyNoPadding?: boolean;
  noScroll?: boolean;
  openFromSide?: boolean;
  animationOnOpen?: string;
  animationOnClose?: string;
  content: unknown;
  prompt?: ReturnType<typeof deriveEndChatPrompt>;
  promptActions?: { onCancel(): void; onConfirm(): void };
}

@carbonElement('cds-aichat-native-panels')
class NativePanels extends NativeChatView {
  @property({ attribute: false }) inputs?: PanelViewInputs;
  @property({ attribute: false }) callbacks?: PanelCompositionCallbacks;
  @property({ attribute: false }) hosts?: ExtensionHosts;
  @property({ attribute: false })
  transformHeaderIcon?: HeaderView['transformIcon'];
  @property({ attribute: false }) onTargetsReady?: () => void;

  private language: PanelLanguage;
  private aiEnabled = false;
  private disclaimer?: AppState['config']['public']['disclaimer'];
  private historyIsOn = false;
  private buttonSize = 'lg';
  private isAgentConnected = false;
  private isAgentSuspended = false;
  private hasReadDisclaimer = false;
  private ownerActive = false;
  private ownerGeneration = 0;
  private placementGeneration = 0;
  private childUpdateError?: unknown;
  private owner?: ExtensionHosts;
  private releaseOwner?: () => void;
  private requests = new Map<PanelName, PanelContentRequest>();
  private lastDisclaimerButton?: CDSButton;

  protected onViewConnected() {
    this.ownerGeneration += 1;
    this.childUpdateError = undefined;
    this.ownerActive = true;
    this.selectStore(
      (state): PanelLanguage => ({
        aria_catastrophicErrorPanel:
          state.languagePack.aria_catastrophicErrorPanel,
        aria_customPanel: state.languagePack.aria_customPanel,
        aria_disclaimerPanel: state.languagePack.aria_disclaimerPanel,
        aria_hydrationPanel: state.languagePack.aria_hydrationPanel,
        aria_iframePanel: state.languagePack.aria_iframePanel,
        aria_responsePanel: state.languagePack.aria_responsePanel,
        aria_viewSourcePanel: state.languagePack.aria_viewSourcePanel,
        general_returnToAssistant: state.languagePack.general_returnToAssistant,
        disclaimer_acceptance_label:
          state.languagePack.disclaimer_acceptance_label,
        disclaimer_accept: state.languagePack.disclaimer_accept,
        agent_endChat: state.languagePack.agent_endChat,
        agent_confirmCancelRequestTitle:
          state.languagePack.agent_confirmCancelRequestTitle,
        agent_confirmEndChat: state.languagePack.agent_confirmEndChat,
        agent_confirmCancelRequestMessage:
          state.languagePack.agent_confirmCancelRequestMessage,
        agent_confirmEndChatNo: state.languagePack.agent_confirmEndChatNo,
        agent_confirmEndSuspendedYes:
          state.languagePack.agent_confirmEndSuspendedYes,
        agent_confirmEndChatYes: state.languagePack.agent_confirmEndChatYes,
        agent_confirmCancelRequestYes:
          state.languagePack.agent_confirmCancelRequestYes,
        agent_sharingRequestTitle: state.languagePack.agent_sharingRequestTitle,
        agent_sharingRequestMessage:
          state.languagePack.agent_sharingRequestMessage,
        agent_sharingDeclineButton:
          state.languagePack.agent_sharingDeclineButton,
        agent_sharingAcceptButton: state.languagePack.agent_sharingAcceptButton,
      }),
      (language) => {
        this.language = language;
      },
      shallowEqual
    );
    this.selectStore(
      (state) => Boolean(state.config.public.aiEnabled),
      (value) => {
        this.aiEnabled = value;
      }
    );
    this.selectStore(
      (state) => state.config.public.disclaimer,
      (value) => {
        this.disclaimer = value;
      }
    );
    this.selectStore(
      (state) => Boolean(state.config.public.history?.isOn),
      (value) => {
        this.historyIsOn = value;
      }
    );
    this.selectStore(
      (state) => state.chatWidthBreakpoint === ChatWidthBreakpoint.WIDE,
      (wide) => {
        this.buttonSize = wide ? '2xl' : 'lg';
      }
    );
    this.selectStore(
      (state) => ({
        isConnected:
          state.persistedToBrowserStorage.humanAgentState.isConnected,
        isSuspended:
          state.persistedToBrowserStorage.humanAgentState.isSuspended,
      }),
      (value) => {
        this.isAgentConnected = value.isConnected;
        this.isAgentSuspended = value.isSuspended;
      },
      shallowEqual
    );
    this.own(() => {
      this.ownerActive = false;
      this.releaseOwner?.();
      this.releaseOwner = undefined;
      this.placementGeneration += 1;
      const generation = ++this.ownerGeneration;
      const retire = () => {
        this.releasePanelOwner();
        this.lastDisclaimerButton = undefined;
        this.onTargetsReady?.();
      };
      if (this.isConnected) {
        retire();
      } else {
        queueMicrotask(() => {
          if (!this.isConnected && this.ownerGeneration === generation) {
            retire();
          }
        });
      }
    });
  }

  requestPanelFocus(name: PanelName): boolean {
    if (!this.ownerActive || !this.isConnected) {
      return false;
    }
    const frame = this.querySelector(`[data-panel-name="${name}"]`);
    return focusPanelBodyBeforeHeader(
      frame?.querySelector<HTMLElement>('[slot="body"]'),
      frame?.querySelector<HTMLElement>('[slot="header"]')
    );
  }

  disclaimerButton(): CDSButton | null {
    return this.ownerActive
      ? this.querySelector<CDSButton>('.cds-aichat--disclaimer__accept-button')
      : null;
  }

  protected willUpdate() {
    if (!this.ownerActive || !this.inputs || !this.hosts) {
      return;
    }
    if (this.owner !== this.hosts || !this.releaseOwner) {
      if (this.owner !== this.hosts) {
        this.releasePanelOwner();
      }
      this.owner = this.hosts;
      this.releaseOwner = this.owner.subscribePanelContent(() =>
        this.requestUpdate()
      );
    }
    const custom = deriveCustomPanelComposition(
      this.inputs.customPanelState.options
    );
    const response = deriveResponsePanelComposition(
      this.inputs.responsePanelState,
      this.aiEnabled
    );
    const content: [PanelName, PanelTargetName[]][] = [
      ['error', ['error-body']],
      ['hydration', ['hydration-body']],
      [
        'custom',
        custom.showPanelHeader
          ? ['custom-title', 'custom-body']
          : ['custom-body'],
      ],
      [
        'response',
        this.inputs.responsePanelState.localMessageItem &&
        this.inputs.responseHasMessage
          ? response.showPanelHeader
            ? ['response-title', 'response-body', 'response-footer']
            : ['response-body', 'response-footer']
          : [],
      ],
      ['iframe', ['iframe-title', 'iframe-body']],
      ['citation', ['citation-title', 'citation-body']],
    ];
    if (this.historyIsOn && this.inputs.historyPanelState.isMobile) {
      content.push(['history', ['history-body']]);
    }
    const active = new Set(
      content.filter(([, names]) => names.length).map(([name]) => name)
    );
    for (const name of this.requests.keys()) {
      if (!active.has(name)) {
        this.owner.retirePanelContent(name);
        this.requests.delete(name);
      }
    }
    for (const [name, names] of content) {
      if (names.length) {
        this.requests.set(
          name,
          this.owner.preparePanelContent(
            name,
            this.inputs.contentRevision,
            names
          )
        );
      }
    }
  }

  protected updated() {
    if (!this.ownerActive) {
      return;
    }
    const generation = ++this.placementGeneration;
    const owner = this.owner;
    const requests = [...this.requests.values()];
    const children = Array.from(
      this.querySelectorAll<LitElement>('cds-aichat-panel, cds-aichat-toolbar')
    );
    void Promise.all(children.map((child) => child.updateComplete)).then(
      () => {
        if (
          !this.ownerActive ||
          !this.isConnected ||
          this.owner !== owner ||
          this.placementGeneration !== generation
        ) {
          return;
        }
        for (const request of requests) {
          if (this.requests.get(request.panel) === request) {
            owner?.markPanelContentPlaced(request);
          }
        }
        const button = this.disclaimerButton();
        if (button !== this.lastDisclaimerButton) {
          this.lastDisclaimerButton = button;
          this.onTargetsReady?.();
        }
      },
      (error: unknown) => {
        if (
          this.ownerActive &&
          this.isConnected &&
          this.owner === owner &&
          this.placementGeneration === generation
        ) {
          this.childUpdateError = error;
          this.requestUpdate();
        }
      }
    );
  }

  private releasePanelOwner() {
    this.releaseOwner?.();
    this.releaseOwner = undefined;
    for (const name of this.requests.keys()) {
      this.owner?.retirePanelContent(name);
    }
    this.requests.clear();
    this.owner = undefined;
  }

  private target(name: PanelTargetName) {
    return this.owner?.panelTargetFor(name) ?? nothing;
  }

  private frameOpen(name: PanelName, desired: boolean): boolean {
    const frame = this.querySelector(
      `[data-panel-name="${name}"]`
    ) as HTMLElement & { open: boolean };
    // A higher frame closing can reactivate another. Commit the whole retained
    // update before either transition, so handlers can stay synchronous.
    const committed = [...this.requests.keys()].every((panel) =>
      this.owner.isPanelContentCommitted(panel, this.inputs.contentRevision)
    );
    return !frame || committed ? desired : frame.open;
  }

  private readonly onDisclaimerRead = (read: boolean) => {
    if (this.ownerActive && read !== this.hasReadDisclaimer) {
      this.hasReadDisclaimer = read;
      this.requestUpdate();
    }
  };

  private renderFrame(options: FrameOptions) {
    const { name, prompt, promptActions } = options;
    const events =
      name === 'error' || prompt
        ? undefined
        : createPanelTransitionCallbacks(
            name as Exclude<PanelName, 'error' | 'endChat' | 'screenShare'>,
            this.callbacks
          );
    const open = this.frameOpen(name, options.open);
    return html`<cds-aichat-panel
      data-panel-name=${name}
      data-testid=${name === 'disclaimer' ? PageObjectId.DISCLAIMER_PANEL : nothing}
      .panelAriaLabel=${options.label ?? 'Panel'}
      .open=${open}
      .priority=${PANEL_PRIORITY[name]}
      .fullWidth=${Boolean(options.fullWidth)}
      .showFrame=${Boolean(options.showFrame)}
      .showChatHeader=${Boolean(options.showChatHeader)}
      .aiEnabled=${Boolean(options.aiEnabled)}
      .bodyNoPadding=${Boolean(options.bodyNoPadding)}
      .noScroll=${Boolean(options.noScroll)}
      .openFromSide=${Boolean(options.openFromSide)}
      .animationOnOpen=${options.animationOnOpen}
      .animationOnClose=${options.animationOnClose}
      @openstart=${events?.onOpenStart}
      @openend=${prompt ? (event: CustomEvent) => handleConfirmationOpen(event, this.querySelector<HTMLElement>(`[data-panel-name="${name}"] > [slot="footer"]`), prompt.announceMessage, this.callbacks.announce) : events?.onOpenEnd}
      @closestart=${events?.onCloseStart}
      @closeend=${events?.onCloseEnd}
      @keydown=${prompt ? (event: KeyboardEvent) => handleConfirmationKey(event, promptActions.onCancel) : undefined}
      @body-scroll=${name === 'disclaimer' ? (event: CustomEvent) => this.querySelector<DisclaimerBody>('cds-aichat-disclaimer-body')?.observeScroll(event.detail) : undefined}>
      ${options.content}
    </cds-aichat-panel>`;
  }

  private renderPrompt(name: 'endChat' | 'screenShare') {
    const prompt =
      name === 'endChat'
        ? deriveEndChatPrompt(
            this.inputs.endChatConfirmation,
            this.isAgentConnected,
            this.isAgentSuspended,
            this.language
          )
        : deriveScreenSharePrompt(this.language);
    const promptActions =
      name === 'endChat'
        ? createEndChatActions(this.inputs.endChatConfirmation, this.callbacks)
        : createScreenShareActions(this.callbacks);
    return this.renderFrame({
      name,
      prompt,
      promptActions,
      open:
        name === 'endChat'
          ? this.inputs.showEndChatConfirmation ||
            Boolean(this.inputs.endChatConfirmation)
          : this.inputs.showScreenShareRequest,
      fullWidth: true,
      label: prompt.title,
      content: html`<div slot="header">
          ${renderPanelHeader({ backButtonType: 'close', labelBackButton: prompt.cancelButtonLabel, onClickBack: promptActions.onCancel })}
        </div>
        <cds-aichat-confirmation-body
          slot="body"
          .panelTitle=${prompt.title}
          .message=${prompt.message}></cds-aichat-confirmation-body>
        <div slot="footer" class="cds-aichat--confirm-panel__footer">
          <cds-button
            class="cds-aichat--confirm-panel__button"
            kind=${BUTTON_KIND.SECONDARY}
            size=${this.buttonSize}
            @click=${promptActions.onCancel}
            .textContent=${prompt.cancelButtonLabel}></cds-button>
          <cds-button
            class="cds-aichat--confirm-panel__button"
            size=${this.buttonSize}
            @click=${promptActions.onConfirm}
            .textContent=${prompt.confirmButtonLabel}></cds-button>
        </div>`,
    });
  }

  private renderCustom() {
    const custom = deriveCustomPanelComposition(
      this.inputs.customPanelState.options
    );
    const customActions = createCustomPanelActions(
      this.inputs.customPanelState.options,
      this.callbacks
    );
    return this.renderFrame({
      name: 'custom',
      ...custom,
      open: this.inputs.customPanelState.isOpen,
      label: custom.title || this.language.aria_customPanel,
      content: html`${
        custom.showPanelHeader
          ? html`<div slot="header">
              ${
                custom.isLegacy
                  ? html`<cds-aichat-header-view
                      .onClose=${customActions.onClose}
                      .onRestart=${customActions.onRestart}
                      .onToggleHomeScreen=${this.callbacks.onToggleHomeScreen}
                      .isHomeScreenActive=${this.inputs.isHomeScreenActive}
                      .headerConfigOverride=${custom.headerConfigOverride}
                      .transformIcon=${this.transformHeaderIcon}></cds-aichat-header-view>`
                  : nothing
              }
              <div
                class=${classMap({ 'cds-aichat--panel-header': true, 'cds-aichat--panel-header--full-width': custom.fullWidth })}>
                <div class="cds-aichat--panel-header-content">
                  ${renderPanelHeader({
                    ...custom,
                    titleTarget: this.owner.panelTargetFor('custom-title'),
                    labelBackButton: this.language.general_returnToAssistant,
                    onClickBack: customActions.onClickBack,
                  })}
                </div>
              </div>
            </div>`
          : nothing
      }${this.target('custom-body')}`,
    });
  }

  private renderResponse() {
    const response = deriveResponsePanelComposition(
      this.inputs.responsePanelState,
      this.aiEnabled
    );
    const hasContent =
      this.inputs.responsePanelState.localMessageItem &&
      this.inputs.responseHasMessage;
    return this.renderFrame({
      name: 'response',
      ...response,
      open: this.inputs.responsePanelState.isOpen,
      label: response.title || this.language.aria_responsePanel,
      animationOnOpen: 'slide-in-from-bottom',
      animationOnClose: 'slide-out-to-bottom',
      content: hasContent
        ? html`${
            response.showPanelHeader
              ? html`<div slot="header">
                  ${renderPanelHeader({
                    titleTarget: this.owner.panelTargetFor('response-title'),
                    labelBackButton: this.language.general_returnToAssistant,
                    onClickBack: this.callbacks.closeResponsePanel,
                  })}
                </div>`
              : nothing
          }${this.target('response-body')}${this.target('response-footer')}`
        : nothing,
    });
  }

  private renderSource(name: 'iframe' | 'citation') {
    const iframe = this.inputs.iFramePanelState;
    const citation = this.inputs.viewSourcePanelState;
    const title =
      name === 'iframe'
        ? iframe.messageItem?.title || iframe.messageItem?.source
        : citation.citationItem?.title;
    return this.renderFrame({
      name,
      open: name === 'iframe' ? iframe.isOpen : citation.isOpen,
      label:
        title ||
        (name === 'iframe'
          ? this.language.aria_iframePanel
          : this.language.aria_viewSourcePanel),
      showFrame: true,
      showChatHeader: true,
      aiEnabled: this.aiEnabled,
      animationOnOpen: 'slide-in-from-bottom',
      animationOnClose: 'slide-out-to-bottom',
      content: html`<div slot="header">
          ${renderPanelHeader({
            titleTarget: this.owner.panelTargetFor(`${name}-title`),
            labelBackButton: this.language.general_returnToAssistant,
            onClickBack:
              name === 'iframe'
                ? this.callbacks.closeIFramePanel
                : this.callbacks.closeViewSourcePanel,
          })}
        </div>
        ${this.target(`${name}-body`)}`,
    });
  }

  protected renderView() {
    if (this.childUpdateError) {
      throw this.childUpdateError;
    }
    if (!this.inputs || !this.callbacks || !this.owner) {
      return nothing;
    }
    const frames = [
      { name: 'endChat', render: () => this.renderPrompt('endChat') },
      { name: 'screenShare', render: () => this.renderPrompt('screenShare') },
      {
        name: 'error',
        render: () =>
          this.renderFrame({
            name: 'error',
            open: Boolean(this.inputs.catastrophicErrorPanelState?.isOpen),
            label: this.language.aria_catastrophicErrorPanel,
            aiEnabled: this.aiEnabled,
            showChatHeader: true,
            content: this.target('error-body'),
          }),
      },
      {
        name: 'hydration',
        render: () =>
          this.renderFrame({
            name: 'hydration',
            open: this.inputs.shouldShowHydrationPanel,
            label: this.language.aria_hydrationPanel,
            aiEnabled: this.aiEnabled,
            showChatHeader: true,
            animationOnOpen: 'fade-in',
            animationOnClose: 'fade-out',
            content: this.target('hydration-body'),
          }),
      },
      { name: 'custom', render: () => this.renderCustom() },
      ...(this.disclaimer?.isOn
        ? [
            {
              name: 'disclaimer',
              render: () =>
                this.renderFrame({
                  name: 'disclaimer',
                  open: this.inputs.showDisclaimer,
                  label: this.language.aria_disclaimerPanel,
                  aiEnabled: this.aiEnabled,
                  showChatHeader: true,
                  fullWidth: true,
                  animationOnOpen: 'fade-in',
                  animationOnClose: 'fade-out',
                  content: html` <div
                      slot="body"
                      class="cds-aichat--widget--expand-to-fit">
                      <cds-aichat-disclaimer-body
                        .disclaimerHTML=${this.disclaimer.disclaimerHTML}
                        .onReadChange=${this.onDisclaimerRead}></cds-aichat-disclaimer-body>
                    </div>
                    <div slot="footer" class="cds-aichat--disclaimer__footer">
                      <cds-button
                        class="cds-aichat--disclaimer__accept-button"
                        data-testid=${PageObjectId.DISCLAIMER_ACCEPT_BUTTON}
                        size=${this.buttonSize}
                        .disabled=${!this.hasReadDisclaimer}
                        role="button"
                        aria-label=${this.language.disclaimer_acceptance_label}
                        @click=${this.callbacks.onAcceptDisclaimer}
                        .textContent=${this.language.disclaimer_accept}></cds-button>
                    </div>`,
                }),
            },
          ]
        : []),
      { name: 'response', render: () => this.renderResponse() },
      { name: 'iframe', render: () => this.renderSource('iframe') },
      { name: 'citation', render: () => this.renderSource('citation') },
      ...(this.historyIsOn && this.inputs.historyPanelState.isMobile
        ? [
            {
              name: 'history',
              render: () =>
                this.renderFrame({
                  name: 'history',
                  open: this.inputs.historyPanelState.isOpen,
                  fullWidth: true,
                  bodyNoPadding: true,
                  noScroll: true,
                  aiEnabled: this.aiEnabled,
                  animationOnOpen: 'slide-in-from-start',
                  animationOnClose: 'slide-out-to-start',
                  content: this.target('history-body'),
                }),
            },
          ]
        : []),
    ];
    return repeat(
      frames,
      ({ name }) => name,
      ({ render }) => render()
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-native-panels': NativePanels;
  }
}

export default NativePanels;
