/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { carbonElement } from '@carbon/ai-chat-components/es/globals/decorators/index.js';
import '@carbon/ai-chat-components/es/components/prompt-line/autocomplete/src/autocomplete.js';
import type Autocomplete from '@carbon/ai-chat-components/es/components/prompt-line/autocomplete/src/autocomplete.js';
import type PromptLine from '@carbon/ai-chat-components/es/components/prompt-line/src/prompt-line.js';
import {
  AutocompleteController,
  itemsToGroups,
  type AutocompleteControllerState,
} from '@carbon/ai-chat-components/es/components/prompt-line/src/autocomplete-controller.js';
import type {
  AutocompleteConfig,
  StartersConfig,
  SuggestionItem,
  TriggerChangeEventDetail,
  TriggerSuggestionConfig,
} from '@carbon/ai-chat-components/es/components/prompt-line/src/tiptap/types.js';
import { NativeChatView } from '../shared/NativeChatView';
import type {
  AutocompleteContent,
  AutocompleteContentRecord,
} from '../../services/autocompleteContent';
import type { ChatViewState } from '../../services/chatViewState';
import { ChatWidthBreakpoint } from '../../../types/state/AppState';

interface AutocompleteLifetime {
  controller: AutocompleteController;
  owner: AutocompleteContent;
  viewState: ChatViewState;
  report: (error: unknown) => void;
  active: boolean;
  retired: boolean;
  pendingError?: { error: unknown };
  configs: WeakMap<object, object>;
  failedResults: WeakMap<SuggestionItem[], unknown>;
}

interface Placement {
  element: HTMLElement;
  parent?: HTMLElement;
  release?: () => void;
}

@carbonElement('cds-aichat-native-autocomplete')
class NativeAutocomplete extends NativeChatView {
  @property({ attribute: false }) contentOwner?: AutocompleteContent;
  @property({ attribute: false }) promptLine?: PromptLine;
  @property({ attribute: false }) mention?: TriggerSuggestionConfig;
  @property({ attribute: false }) command?: TriggerSuggestionConfig;
  @property({ attribute: false }) autocomplete?: AutocompleteConfig;
  @property({ attribute: false }) starters?: StartersConfig;
  @property({ attribute: false }) isSendDisabled = false;
  @property({ attribute: false }) onStarterSelected?: (text: string) => void;
  @property({ attribute: false }) onSelectItem?: (item: SuggestionItem) => void;
  @property({ attribute: false }) onSendItem?: (text: string) => void;
  @property({ attribute: false }) onListNavigated?: (
    navigated: boolean
  ) => void;

  private lifetime?: AutocompleteLifetime;
  private active = false;
  private disconnecting = false;
  private bindingGeneration = 0;
  private placementGeneration = 0;
  private state: AutocompleteControllerState = { trigger: null, items: [] };
  private renderedState?: AutocompleteControllerState;
  private renderedContent?: unknown;
  private request?: AutocompleteContentRecord;
  private builtin?: Placement;
  private builtinState?: AutocompleteControllerState;
  private anchor?: Placement;
  private shell?: HTMLElement;
  private boundPrompt?: PromptLine;
  private list?: HTMLElement;
  private navigated = false;
  private attached = true;
  private maxHeight = '0px';

  get listNavigated(): boolean {
    return this.navigated;
  }

  connectedCallback() {
    this.hidden = true;
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.disconnecting = true;
    try {
      super.disconnectedCallback();
    } finally {
      this.disconnecting = false;
    }
  }

  protected onViewConnected(viewState: ChatViewState) {
    if (this.lifetime && this.lifetime.viewState !== viewState) {
      this.retire();
    }
    this.active = true;
    this.bindingGeneration += 1;
    if (this.lifetime) {
      this.lifetime.active = true;
      this.lifetime.report = this.captureErrorReporter();
    }
    this.selectStore(
      (state) => state.chatWidthBreakpoint,
      (breakpoint) => {
        this.attached = breakpoint !== ChatWidthBreakpoint.WIDE;
      }
    );
    this.selectStore(
      (state) => state.chatHeight,
      (height) => {
        this.maxHeight = `${Math.floor(height * 0.4)}px`;
      }
    );
    this.own(() => {
      this.active = false;
      this.placementGeneration += 1;
      this.unbindShell();
      this.setList(null);
      const lifetime = this.lifetime;
      if (lifetime) {
        lifetime.active = false;
        lifetime.controller.setPromptLine(null);
        lifetime.owner.pause(this);
      }
      const generation = ++this.bindingGeneration;
      if (!this.disconnecting) {
        this.retire();
      } else {
        queueMicrotask(() => {
          if (this.bindingGeneration === generation) {
            this.retire();
          }
        });
      }
    });
  }

  protected willUpdate(changed: Map<string, unknown>) {
    if (!this.active || !this.contentOwner?.ownsView(this)) {
      if (this.active) {
        this.retire();
      }
      return;
    }
    if (this.lifetime?.owner !== this.contentOwner) {
      this.retire();
    }
    const lifetime = this.lifetime ?? this.startLifetime();
    if (lifetime.pendingError) {
      const { error } = lifetime.pendingError;
      lifetime.pendingError = undefined;
      lifetime.report(error);
      return;
    }
    this.bindShell();
    lifetime.controller.setPromptLine(this.boundPrompt ?? null);
    if (
      changed.has('mention') ||
      changed.has('command') ||
      changed.has('autocomplete') ||
      changed.has('starters') ||
      changed.has('isSendDisabled')
    ) {
      lifetime.controller.setConfigs(this.configs(lifetime));
    }
    if (!this.state.trigger || !this.shell) {
      this.clearContent();
      return;
    }
    if (this.state.renderCustomList) {
      this.updateCustomContent(lifetime);
    } else {
      this.updateBuiltinContent(lifetime);
    }
  }

  private updateCustomContent(lifetime: AutocompleteLifetime) {
    this.removePlacement(this.builtin);
    this.builtin = undefined;
    if (!this.state.items.length) {
      this.clearContent();
      return;
    }
    if (this.renderedState !== this.state) {
      this.renderedState = this.state;
      this.renderedContent = this.state.renderCustomList({
        items: this.state.items,
        query: this.state.trigger.query,
        onDismiss: () =>
          this.run(lifetime, () => lifetime.controller.dismiss()),
        onSelect: (item) => this.selectItem(lifetime, item),
        onSend: (text) => this.sendItem(lifetime, text),
      });
    }
    if (this.renderedContent == null) {
      this.clearContent();
      return;
    }
    this.anchor ??= { element: document.createElement('div') };
    const anchor = this.anchor.element;
    anchor.slot = 'autocomplete-content';
    if (this.renderedContent instanceof HTMLElement) {
      anchor.setAttribute('role', 'presentation');
    } else {
      anchor.removeAttribute('role');
    }
    anchor.onmousedown = (event) => event.preventDefault();
    if (!this.place(this.anchor)) {
      this.clearContent();
      return;
    }
    const request = lifetime.owner.prepare(
      this,
      this.state,
      this.renderedContent,
      anchor,
      {
        onReady: (list) =>
          this.run(lifetime, () => {
            if (this.request === request) {
              this.setList(list);
            }
          }),
        onClear: () => this.setList(null),
        onError: (error) => this.fail(lifetime, error),
      }
    );
    this.request = request;
    return;
  }

  private updateBuiltinContent(lifetime: AutocompleteLifetime) {
    lifetime.owner.clear(this);
    this.request = undefined;
    this.renderedState = undefined;
    this.renderedContent = undefined;
    this.removePlacement(this.anchor);
    this.anchor = undefined;
    if (!this.builtin) {
      this.builtinState = undefined;
      const list = document.createElement('cds-aichat-autocomplete');
      list.slot = 'autocomplete-content';
      const select = (event: CustomEvent<{ item: SuggestionItem }>) =>
        this.selectItem(lifetime, event.detail.item);
      const send = (event: CustomEvent<{ text: string }>) =>
        this.sendItem(lifetime, event.detail?.text);
      const dismiss = () =>
        this.run(lifetime, () => lifetime.controller.dismiss());
      list.addEventListener('cds-aichat-autocomplete-select', select);
      list.addEventListener('cds-aichat-autocomplete-send', send);
      list.addEventListener('cds-aichat-autocomplete-dismiss', dismiss);
      this.builtin = {
        element: list,
        release: () => {
          list.removeEventListener('cds-aichat-autocomplete-select', select);
          list.removeEventListener('cds-aichat-autocomplete-send', send);
          list.removeEventListener('cds-aichat-autocomplete-dismiss', dismiss);
        },
      };
    }
    const list = this.builtin.element as Autocomplete;
    if (this.builtinState !== this.state) {
      const { items, groups } = itemsToGroups(this.state.items);
      list.items = items;
      list.groups = groups;
      this.builtinState = this.state;
    }
    list.attached = this.attached;
    list.disableDirectSend = this.state.disableDirectSend;
    this.configureList(list);
    if (!this.place(this.builtin)) {
      this.setList(null);
    }
  }

  protected updated() {
    const lifetime = this.lifetime;
    if (!lifetime?.active || !this.shell) {
      return;
    }
    const generation = ++this.placementGeneration;
    const request = this.request;
    const builtin = this.builtin?.element as Autocomplete | undefined;
    const shell = this.shell as HTMLElement & {
      updateComplete?: Promise<unknown>;
    };
    void Promise.all([shell.updateComplete, builtin?.updateComplete]).then(
      () =>
        this.run(lifetime, () => {
          if (generation !== this.placementGeneration) {
            return;
          }
          if (
            request &&
            this.request === request &&
            this.anchor?.element.parentNode === this.shell
          ) {
            lifetime.owner.markPlaced(request);
          } else if (builtin && builtin.parentNode === this.shell) {
            this.setList(builtin);
          }
          if (this.list) {
            this.configureList(this.list);
          }
        }),
      (error: unknown) => {
        if (generation === this.placementGeneration) {
          this.fail(lifetime, error);
        }
      }
    );
  }

  protected renderView() {
    return nothing;
  }

  private startLifetime(): AutocompleteLifetime {
    const lifetime = {
      owner: this.contentOwner,
      viewState: this.viewState,
      report: this.captureErrorReporter(),
      active: true,
      retired: false,
      configs: new WeakMap<object, object>(),
      failedResults: new WeakMap<SuggestionItem[], unknown>(),
    } as AutocompleteLifetime;
    this.lifetime = lifetime;
    lifetime.owner.claim(this);
    lifetime.controller = new AutocompleteController({
      ...this.configs(lifetime),
      onStarterSelected: (text) =>
        this.run(lifetime, () => this.onStarterSelected?.(text)),
      onChange: (state) => {
        if (!lifetime.retired && this.lifetime === lifetime) {
          if (lifetime.failedResults.has(state.items)) {
            const error = lifetime.failedResults.get(state.items);
            lifetime.failedResults.delete(state.items);
            this.fail(lifetime, error);
            return;
          }
          this.setList(null);
          this.state = state;
          this.requestUpdate();
        }
      },
    });
    return lifetime;
  }

  private configs(lifetime: AutocompleteLifetime) {
    return {
      mention: this.wrapConfig(lifetime, this.mention),
      command: this.wrapConfig(lifetime, this.command),
      autocomplete: this.wrapConfig(lifetime, this.autocomplete),
      starters: this.starters,
      isSendDisabled: this.isSendDisabled,
    };
  }

  private wrapConfig<
    Config extends AutocompleteConfig | TriggerSuggestionConfig,
  >(lifetime: AutocompleteLifetime, config: Config): Config {
    if (!config) {
      return config;
    }
    if (!lifetime.configs.has(config)) {
      const wrapped = { ...config };
      const items = config.items;
      if (typeof items === 'function') {
        wrapped.items = async (query) => {
          try {
            return await items(query);
          } catch (error) {
            const failed: SuggestionItem[] = [];
            lifetime.failedResults.set(failed, error);
            return failed;
          }
        };
      }
      if (config.onSelect) {
        wrapped.onSelect = (item) =>
          this.run(lifetime, () => config.onSelect(item));
      }
      lifetime.configs.set(config, wrapped);
    }
    return lifetime.configs.get(config) as Config;
  }

  private bindShell() {
    const shell = this.closest<HTMLElement>('cds-aichat-prompt-line-shell');
    const prompt =
      this.promptLine ??
      shell?.querySelector<PromptLine>('cds-aichat-prompt-line');
    if (shell === this.shell && prompt === this.boundPrompt) {
      return;
    }
    this.unbindShell();
    this.shell = shell;
    this.boundPrompt = prompt;
    shell?.addEventListener('cds-aichat-trigger-change', this.handleTrigger);
  }

  private unbindShell() {
    this.shell?.removeEventListener(
      'cds-aichat-trigger-change',
      this.handleTrigger
    );
    this.shell = undefined;
  }

  private readonly handleTrigger = (
    event: CustomEvent<TriggerChangeEventDetail | null>
  ) => {
    const lifetime = this.lifetime;
    if (!event.composedPath().includes(this.boundPrompt)) {
      return;
    }
    this.run(lifetime, () => {
      lifetime.controller.setPromptLine(this.boundPrompt ?? null);
      lifetime.controller.handleTriggerChange(event.detail ?? null);
    });
  };

  private selectItem(lifetime: AutocompleteLifetime, item: SuggestionItem) {
    this.run(lifetime, () => {
      lifetime.controller.select(item);
      if (!lifetime.retired) {
        this.onSelectItem?.(item);
      }
    });
  }

  private sendItem(lifetime: AutocompleteLifetime, text: string) {
    this.run(lifetime, () => {
      if (text && !this.isSendDisabled) {
        lifetime.controller.dismiss(true);
        this.onSendItem?.(text);
      }
    });
  }

  private setList(list: HTMLElement | null) {
    this.list?.removeEventListener(
      'cds-aichat-autocomplete-navigated',
      this.handleNavigated
    );
    this.list = list ?? undefined;
    this.lifetime?.controller?.setListElement(list);
    if (list) {
      this.configureList(list);
      list.addEventListener(
        'cds-aichat-autocomplete-navigated',
        this.handleNavigated
      );
    } else {
      this.setNavigated(false);
      this.boundPrompt?.closest('cds-aichat-prompt-line-shell')?.dispatchEvent(
        new CustomEvent('cds-aichat-autocomplete-navigated', {
          detail: { navigated: false },
          bubbles: false,
          composed: false,
        })
      );
    }
  }

  private configureList(list: HTMLElement) {
    if ('anchorElement' in list) {
      (list as HTMLElement & { anchorElement: Element | null }).anchorElement =
        this.boundPrompt?.getEditor()?.view.dom ?? null;
    }
    list.style.setProperty(
      '--cds-aichat-autocomplete-max-height',
      this.maxHeight
    );
  }

  private readonly handleNavigated = (
    event: CustomEvent<{ navigated: boolean }>
  ) => {
    this.run(this.lifetime, () => this.setNavigated(event.detail.navigated));
  };

  private setNavigated(navigated: boolean) {
    if (this.navigated !== navigated) {
      this.navigated = navigated;
      this.run(this.lifetime, () => this.onListNavigated?.(navigated));
    }
  }

  private place(placement: Placement): boolean {
    if (placement.parent && placement.element.parentNode !== placement.parent) {
      return false;
    }
    if (placement.element.parentNode !== this.shell) {
      this.shell.insertBefore(placement.element, this);
    }
    placement.parent = this.shell;
    return true;
  }

  private removePlacement(placement?: Placement) {
    placement?.release?.();
    if (placement) {
      placement.element.onmousedown = null;
    }
    if (placement?.element.parentNode === placement?.parent) {
      placement?.element.remove();
    }
  }

  private clearContent() {
    this.setList(null);
    this.lifetime?.owner.clear(this);
    this.request = undefined;
    this.removePlacement(this.builtin);
    this.removePlacement(this.anchor);
    this.builtin = undefined;
    this.anchor = undefined;
    this.renderedState = undefined;
    this.renderedContent = undefined;
  }

  private retire() {
    const lifetime = this.lifetime;
    if (!lifetime) {
      return;
    }
    lifetime.retired = true;
    lifetime.active = false;
    this.clearContent();
    lifetime.controller?.destroy();
    lifetime.owner.release(this);
    this.lifetime = undefined;
    this.state = { trigger: null, items: [] };
    this.placementGeneration += 1;
  }

  private run(
    lifetime: AutocompleteLifetime | undefined,
    callback: () => void
  ) {
    if (
      lifetime?.active &&
      !lifetime.retired &&
      this.lifetime === lifetime &&
      this.isConnected
    ) {
      try {
        callback();
      } catch (error) {
        this.fail(lifetime, error);
      }
    }
  }

  private fail(lifetime: AutocompleteLifetime, error: unknown) {
    if (lifetime.retired || this.lifetime !== lifetime) {
      return;
    }
    if (lifetime.active && this.isConnected) {
      lifetime.report(error);
    } else {
      lifetime.pendingError ??= { error };
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-native-autocomplete': NativeAutocomplete;
  }
}

export default NativeAutocomplete;
