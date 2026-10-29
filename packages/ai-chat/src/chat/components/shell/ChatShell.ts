/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { nothing, type LitElement, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { carbonElement } from '@carbon/ai-chat-components/es/globals/decorators/index.js';
import type CDSAIChatShell from '@carbon/ai-chat-components/es/components/chat-shell/src/shell.js';
import { NativeChatView } from '../shared/NativeChatView';
import type { ChatViewState } from '../../services/chatViewState';
import type NativePanels from '../panels/NativePanels';
import type ChatInput from '../input/ChatInput';
import type { MessagesComponentClass } from '../../components-legacy/MessagesComponent';
import {
  ShellLifecycle,
  selectShellState,
  type ShellOptions,
  type ShellInputConfig,
  type ShellContentState,
} from '../../utils/shellLifecycle';
import { shallowEqual } from '../../store/appStore';
import { subscribeToSelectedValue } from '../../utils/selectedSubscription';

import {
  renderShellLayout,
  type ShellLayoutBindings,
  type ShellLayoutInputs,
  type ShellLayoutRefs,
  type ShellLayoutTargets,
} from './renderShellLayout';

@carbonElement('cds-aichat-chat-shell')
class ChatShell extends NativeChatView {
  @property({ attribute: false }) layout?: ShellLayoutInputs;
  @property({ attribute: false }) options?: ShellOptions;
  @property({ attribute: false }) inputConfig?: ShellInputConfig;
  @property({ attribute: false })
  transformIcon?: ShellLayoutInputs['header']['transformIcon'];
  @property({ attribute: false }) contentRevision?: object;
  @property({ attribute: false })
  getMessages?: () => MessagesComponentClass | null;
  @property({ attribute: false }) onContentState?: (
    content: ShellContentState
  ) => void;
  private lifecycle?: ShellLifecycle;
  private releaseErrorView?: () => void;
  private internalInput?: ChatInput;
  private readonly internalBindings: ShellLayoutBindings = {
    setInputElement: (input) => {
      this.internalInput = input ?? undefined;
      this.lifecycle?.setInputHandle(input?.inputFunctions ?? null);
    },
    onInputHandleChange: (event) => {
      if (
        event.target === this.internalInput &&
        event.currentTarget === this.internalInput &&
        event.detail === (this.internalInput?.inputFunctions ?? null)
      ) {
        this.lifecycle?.setInputHandle(event.detail);
      }
    },
    setPanelElement: () => {},
  };
  @property({ attribute: false }) bindings?: ShellLayoutBindings;
  @property({ attribute: false })
  onTargetsReady?: (targets: ShellLayoutTargets | undefined) => void;

  private owner?: ChatViewState;
  private ownerFailed = false;
  private lifetime = 0;
  private connectionGeneration = 0;
  private targetGeneration = 0;
  private container?: HTMLDivElement;
  private widget?: CDSAIChatShell;
  private panels?: NativePanels;
  private input?: ChatInput;
  private messageTarget?: HTMLDivElement;
  private targets?: ShellLayoutTargets;
  private committedMessages?: { target: HTMLElement; generation: number };
  private publishedInput?: ChatInput;
  private publishedPanels?: NativePanels;
  private inputBinding?: ShellLayoutBindings['setInputElement'];
  private panelBinding?: ShellLayoutBindings['setPanelElement'];
  private targetCallback?: ChatShell['onTargetsReady'];
  private waiters = new Set<() => void>();
  private contentConnected = true;
  private readonly refs: ShellLayoutRefs = {
    container: (element) => {
      if (element) {
        this.container = element as HTMLDivElement;
      }
    },
    widget: (element) => {
      if (element) {
        this.widget = element as CDSAIChatShell;
      }
    },
    panels: (element) => {
      if (element) {
        this.panels = element as NativePanels;
        this.publishBindings();
      }
    },
    input: (element) => {
      if (element) {
        this.input = element as ChatInput;
        this.publishBindings();
      }
    },
    onInputHandleChange: (event) => {
      if (event.currentTarget === this.input) {
        (this.bindings ?? this.internalBindings).onInputHandleChange(event);
      }
    },
  };

  connectedCallback() {
    super.connectedCallback();
    this.signal();
  }

  setContentConnected(connected: boolean): void {
    this.contentConnected = connected;
    if (!connected) {
      this.lifecycle?.disconnect();
      return;
    }
    if (this.viewState && this.isConnected && !this.failed) {
      this.ensureLifecycle(this.viewState);
      this.lifecycle.publishHandles();
      this.requestUpdate();
    }
  }

  disconnectedCallback() {
    if (this.failed) {
      this.ownerFailed = true;
    }
    super.disconnectedCallback();
    queueMicrotask(() => {
      if (!this.isConnected) {
        this.retire();
      }
    });
  }

  protected onViewConnected(viewState: ChatViewState) {
    if (this.owner && this.owner !== viewState) {
      this.retire();
    }
    this.owner = viewState;
    if (this.ownerFailed) {
      this.failed = true;
      return;
    }
    this.ensureLifecycle(viewState);
    const lifecycle = this.lifecycle;
    const generation = ++this.connectionGeneration;
    if (this.contentConnected) {
      lifecycle.publishHandles();
    }
    this.selectStore(
      selectShellState,
      () => {
        lifecycle.update();
      },
      shallowEqual
    );
    this.selectView(
      (snapshot) => ({
        intl: snapshot.intl,
        endChatConfirmationOpen: snapshot.endChatConfirmationOpen,
        humanAgentConfirmation: snapshot.humanAgentConfirmation,
      }),
      () => {},
      shallowEqual
    );
    this.own(
      subscribeToSelectedValue(
        {
          getSnapshot: viewState.serviceManager.instance.state.get,
          subscribe: viewState.serviceManager.instance.state.subscribe,
        },
        (state) => state.isHydratingCounter,
        () => this.requestUpdate(),
        { onError: this.captureErrorReporter() }
      )
    );
    this.own(() => {
      if (this.failed) {
        lifecycle.disconnect();
      } else {
        queueMicrotask(() => {
          if (
            this.connectionGeneration === generation &&
            (!this.isConnected || this.owner !== viewState)
          ) {
            lifecycle.disconnect();
          }
        });
      }
    });
  }

  private ensureLifecycle(viewState: ChatViewState): void {
    if (this.lifecycle) {
      return;
    }
    this.owner = viewState;
    this.lifecycle = new ShellLifecycle(
      viewState,
      () => this.requestUpdate(),
      () => this.getMessages?.() ?? null,
      () => this.whenReady(),
      (content) => this.onContentState?.(content),
      () => {
        this.lifecycle?.markPanelsReady();
        this.signal();
      },
      this.transformIcon
    );
  }

  protected willUpdate(changes: PropertyValues) {
    if (this.failed && this.viewState) {
      this.ensureLifecycle(this.viewState);
    }
    if (this.options && this.inputConfig && this.lifecycle) {
      this.lifecycle.configure(
        this.options,
        this.inputConfig,
        this.contentRevision,
        this.transformIcon
      );
      if (
        !this.failed &&
        this.isConnected &&
        this.viewState &&
        this.contentConnected
      ) {
        this.lifecycle.connect();
        this.lifecycle.update();
      }
      this.layout = this.lifecycle.createLayout();
    }
    if (changes.has('bindings')) {
      this.publishBindings();
    }
  }

  protected performUpdate() {
    try {
      super.performUpdate();
    } finally {
      this.signal();
    }
  }

  protected renderView() {
    if (!this.layout) {
      return nothing;
    }
    if (this.layout.showHomeScreen) {
      this.messageTarget = undefined;
    } else if (!this.messageTarget) {
      this.messageTarget = document.createElement('div');
      this.messageTarget.className = 'cds-aichat--shell-messages-target';
    }
    return renderShellLayout(this.layout, this.refs, this.messageTarget);
  }

  protected renderFailedView() {
    this.ownerFailed = true;
    if (!this.releaseErrorView && this.owner) {
      const owner = this.owner;
      this.releaseErrorView = subscribeToSelectedValue(
        {
          getSnapshot: owner.serviceManager.store.getState,
          subscribe: owner.serviceManager.store.subscribe,
        },
        (state) => state.catastrophicErrorPanelState,
        () => {
          if (this.isConnected && this.owner === owner) {
            this.requestUpdate();
          }
        },
        { onError: this.captureErrorReporter() }
      );
    }
    this.messageTarget = undefined;
    return this.layout
      ? renderShellLayout(this.layout, this.refs, undefined, true)
      : nothing;
  }

  protected updated() {
    this.panels =
      this.widget?.querySelector<NativePanels>(
        ':scope > cds-aichat-native-panels'
      ) ?? undefined;
    this.input =
      this.widget?.querySelector<ChatInput>(':scope > cds-aichat-chat-input') ??
      undefined;
    this.publishBindings();
    this.publishTargets();
    if (this.targets && !this.failed) {
      this.lifecycle?.attach(this.targets);
    }
    this.signal();
  }

  commitMessages(target: HTMLElement, generation: number): void {
    if (
      this.isConnected &&
      this.targets?.messages === target &&
      this.targets.generation === generation
    ) {
      this.committedMessages = { target, generation };
      this.signal();
    }
  }

  async whenReady(): Promise<boolean> {
    const report = this.captureErrorReporter();
    try {
      return await this.waitUntilReady();
    } catch (error) {
      report(error);
      return false;
    }
  }

  private async waitUntilReady(): Promise<boolean> {
    const lifetime = this.lifetime;
    while (!this.owner && this.lifetime === lifetime && !this.failed) {
      await this.changed();
    }
    const owner = this.owner;
    const current = () =>
      this.lifetime === lifetime &&
      this.owner === owner &&
      !this.failed &&
      !this.ownerFailed;
    while (current()) {
      if (!(await this.changeOr(this.updateComplete))) {
        continue;
      }
      if (!current()) {
        return false;
      }
      if (!this.isConnected || !this.viewState || !this.targets) {
        await this.changed();
        continue;
      }
      const targets = this.targets;
      const children = this.requiredChildren();
      if (
        !(await this.changeOr(
          Promise.all(children.map((child) => child.updateComplete))
        ))
      ) {
        continue;
      }
      if (!current()) {
        return false;
      }
      if (targets.input && !(await this.changeOr(targets.input.ready))) {
        continue;
      }
      if (!current()) {
        return false;
      }
      if (
        this.isUpdatePending ||
        this.targets !== targets ||
        children.some((child) => child.isUpdatePending)
      ) {
        continue;
      }
      const descendants = this.requiredChildren();
      if (descendants.some((child) => !children.includes(child))) {
        continue;
      }
      if (
        targets.messages &&
        (this.committedMessages?.target !== targets.messages ||
          this.committedMessages.generation !== targets.generation)
      ) {
        await this.changed();
        continue;
      }
      if (this.isConnected && this.viewState === owner) {
        return true;
      }
      await this.changed();
    }
    return false;
  }

  private requiredChildren(): LitElement[] {
    return [
      this.widget?.parentElement,
      this.widget,
      this.panels,
      this.input,
      this.widget?.querySelector(
        ':scope > [slot="header"] > cds-aichat-header-view'
      ),
      this.widget?.querySelector(
        ':scope > [slot="messages"] > cds-aichat-home-screen'
      ),
      this.container?.querySelector(':scope > cds-aichat-launcher-view'),
    ].filter((child): child is LitElement =>
      Boolean(child && 'updateComplete' in child)
    );
  }

  private publishBindings(): void {
    const inputBinding = (this.bindings ?? this.internalBindings)
      .setInputElement;
    if (
      this.inputBinding !== inputBinding ||
      this.publishedInput !== this.input
    ) {
      if (this.publishedInput) {
        this.inputBinding?.(null);
      }
      this.inputBinding = inputBinding;
      this.publishedInput = this.input;
      if (this.input) {
        inputBinding?.(this.input);
      }
    }
    const panelBinding = (this.bindings ?? this.internalBindings)
      .setPanelElement;
    if (
      this.panelBinding !== panelBinding ||
      this.publishedPanels !== this.panels
    ) {
      if (this.publishedPanels) {
        this.panelBinding?.(null);
      }
      this.panelBinding = panelBinding;
      this.publishedPanels = this.panels;
      if (this.panels) {
        panelBinding?.(this.panels);
      }
    }
  }

  private publishTargets(): void {
    if (!this.container || !this.widget || !this.panels) {
      return;
    }
    const previous = this.targets;
    const changed =
      !previous ||
      previous.container !== this.container ||
      previous.widget !== this.widget ||
      previous.panels !== this.panels ||
      previous.input !== this.input ||
      previous.messages !== this.messageTarget;
    if (changed) {
      this.targets = {
        generation: ++this.targetGeneration,
        container: this.container,
        widget: this.widget,
        panels: this.panels,
        input: this.input,
        messages: this.messageTarget,
      };
      this.committedMessages = undefined;
    }
    if (this.targetCallback !== this.onTargetsReady) {
      this.targetCallback?.(undefined);
      this.targetCallback = this.onTargetsReady;
      this.targetCallback?.(this.targets);
    } else if (changed) {
      this.targetCallback?.(this.targets);
    }
  }

  private retire(): void {
    this.releaseErrorView?.();
    this.releaseErrorView = undefined;
    this.lifecycle?.disconnect();
    this.lifecycle = undefined;
    this.lifetime += 1;
    this.owner = undefined;
    this.ownerFailed = false;
    this.input = undefined;
    this.panels = undefined;
    this.publishBindings();
    this.targets = undefined;
    this.messageTarget = undefined;
    this.committedMessages = undefined;
    this.targetCallback?.(undefined);
    this.targetCallback = undefined;
    this.signal();
  }

  private changed(): Promise<void> {
    return new Promise((resolve) => this.waiters.add(resolve));
  }

  private async changeOr(promise: Promise<unknown>): Promise<boolean> {
    let wake: () => void;
    const changed = new Promise<boolean>((resolve) => {
      wake = () => resolve(false);
      this.waiters.add(wake);
    });
    try {
      return await Promise.race([promise.then(() => true), changed]);
    } finally {
      this.waiters.delete(wake);
    }
  }

  private signal(): void {
    const waiters = [...this.waiters];
    this.waiters.clear();
    waiters.forEach((resolve) => resolve());
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-chat-shell': ChatShell;
  }
}

export type { ShellLayoutTargets };
export default ChatShell;
