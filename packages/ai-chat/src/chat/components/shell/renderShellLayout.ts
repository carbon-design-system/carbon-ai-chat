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
import { ref } from 'lit/directives/ref.js';
import { repeat } from 'lit/directives/repeat.js';
import type CDSAIChatShell from '@carbon/ai-chat-components/es/components/chat-shell/src/shell.js';
import '@carbon/ai-chat-components/es/components/chat-shell/src/shell.js';
import '@carbon/web-components/es/components/layer/layer.js';
import type NativePanels from '../panels/NativePanels';
import '../panels/NativePanels';
import type ChatInput from '../input/ChatInput';
import '../input/ChatInput';
import type HeaderView from '../header/chat-header';
import '../header/chat-header';
import type { HomeScreenProps } from '../homeScreen/home-screen';
import '../homeScreen/home-screen';
import '../launcher/launcher';
import { PageObjectId } from '../../../testing/PageObjectId';
import { WriteableElementName } from '../../../types/instance/WriteableElements';
import {
  getShellWriteableElements,
  type ShellWriteableElementsOptions,
} from '../../utils/shellWriteableElements';
import type { InputFunctions } from '../../utils/inputTypes';

export interface ShellLayoutInputs {
  container: {
    className: string;
    theme: string;
    dir: string;
    namespace: string;
    label: string;
  };
  layer: { className: string; level: number };
  shell: {
    className: string;
    props: Pick<
      CDSAIChatShell,
      | 'aiEnabled'
      | 'showFrame'
      | 'cornerAll'
      | 'cornerStartStart'
      | 'cornerStartEnd'
      | 'cornerEndStart'
      | 'cornerEndEnd'
      | 'contentMaxWidth'
      | 'showWorkspace'
      | 'workspaceLocation'
      | 'showHistory'
      | 'workspaceAriaLabel'
      | 'historyAriaLabel'
      | 'messagesAriaLabel'
      | 'panelOpenedAnnouncement'
      | 'panelClosedAnnouncement'
      | 'workspaceOpenedAnnouncement'
      | 'workspaceClosedAnnouncement'
      | 'historyShownAnnouncement'
      | 'historyHiddenAnnouncement'
    >;
    onPanelFocusFallback: () => void;
  };
  panels: Pick<
    NativePanels,
    'inputs' | 'callbacks' | 'hosts' | 'transformHeaderIcon' | 'onTargetsReady'
  >;
  header?: Pick<
    HeaderView,
    | 'onClose'
    | 'onRestart'
    | 'onToggleHomeScreen'
    | 'isHomeScreenActive'
    | 'headerConfigOverride'
    | 'transformIcon'
  >;
  showHomeScreen: boolean;
  home: HomeScreenProps;
  input?: Pick<
    ChatInput,
    | 'inputProps'
    | 'contentOwner'
    | 'mention'
    | 'command'
    | 'autocomplete'
    | 'starters'
    | 'inputActions'
  >;
  writeables: ShellWriteableElementsOptions;
  showLauncher: boolean;
}

export interface ShellLayoutBindings {
  setInputElement: (element: ChatInput | null) => void;
  onInputHandleChange: (event: CustomEvent<InputFunctions | null>) => void;
  setPanelElement: (element: NativePanels | null) => void;
}

export interface ShellLayoutTargets {
  generation: number;
  container: HTMLDivElement;
  widget: CDSAIChatShell;
  panels: NativePanels;
  input?: ChatInput;
  messages?: HTMLDivElement;
}

export interface ShellLayoutRefs {
  container: (element?: Element) => void;
  widget: (element?: Element) => void;
  panels: (element?: Element) => void;
  input: (element?: Element) => void;
  onInputHandleChange: (event: CustomEvent<InputFunctions | null>) => void;
}

const classes = (value: string) =>
  Object.fromEntries(
    value
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => [name, true])
  );

function renderNormalRegions(
  layout: ShellLayoutInputs,
  refs: ShellLayoutRefs,
  messages?: HTMLDivElement
) {
  const { header, home, input, writeables } = layout;
  return html`
    ${
      header
        ? html`<div slot="header">
            <cds-aichat-header-view
              .onClose=${header.onClose}
              .onRestart=${header.onRestart}
              .onToggleHomeScreen=${header.onToggleHomeScreen}
              .isHomeScreenActive=${header.isHomeScreenActive}
              .headerConfigOverride=${header.headerConfigOverride}
              .transformIcon=${header.transformIcon}></cds-aichat-header-view>
          </div>`
        : nothing
    }
    ${repeat(
      getShellWriteableElements(writeables),
      (element) => element.wrapperSlot,
      (element) => html`
        <div
          slot=${element.wrapperSlot}
          class=${element.className}
          id=${element.id}
          data-floating-menu-container>
          <slot name=${element.slotName}></slot>
        </div>
      `
    )}
    <div
      slot="messages"
      class="cds-aichat--widget--expand-to-fit"
      data-testid=${PageObjectId.MAIN_PANEL}>
      ${
        layout.showHomeScreen
          ? html`
              <cds-aichat-home-screen
                .isHydrated=${home.isHydrated}
                .onSendInput=${home.onSendInput}
                .onToggleHomeScreen=${home.onToggleHomeScreen}></cds-aichat-home-screen>
            `
          : messages
      }
    </div>
    ${
      input
        ? html`
            <cds-aichat-chat-input
              slot="input"
              .inputProps=${input.inputProps}
              .contentOwner=${input.contentOwner}
              .mention=${input.mention}
              .command=${input.command}
              .autocomplete=${input.autocomplete}
              .starters=${input.starters}
              .inputActions=${input.inputActions}
              @cds-aichat-input-handle-change=${refs.onInputHandleChange}
              ${ref(refs.input)}></cds-aichat-chat-input>
          `
        : nothing
    }
    <div slot="workspace" class="cds-aichat--widget--expand-to-fit">
      <div
        class="cds-aichat--workspace-writeable-element cds-aichat--widget--expand-to-fit"
        id=${`workspacePanelElement${writeables.suffix}`}
        data-floating-menu-container>
        <slot name=${WriteableElementName.WORKSPACE_PANEL_ELEMENT}></slot>
      </div>
    </div>
    <div slot="history" class="cds-aichat--widget--expand-to-fit">
      <div
        class="cds-aichat--history-writeable-element cds-aichat--widget--expand-to-fit"
        id=${`historyPanelElement${writeables.suffix}`}
        data-floating-menu-container>
        <slot name=${WriteableElementName.HISTORY_PANEL_ELEMENT}></slot>
      </div>
    </div>
  `;
}

export function renderShellLayout(
  layout: ShellLayoutInputs,
  refs: ShellLayoutRefs,
  messages?: HTMLDivElement,
  failed = false
) {
  const { container, layer, shell, panels } = layout;
  const props = shell.props;
  return html`
    <div
      class=${classMap(classes(container.className))}
      data-theme=${container.theme}
      dir=${container.dir}
      data-namespace=${container.namespace}
      role="region"
      aria-label=${container.label}
      ${ref(refs.container)}>
      <cds-layer
        class=${classMap(classes(layer.className))}
        .level=${layer.level}>
        <cds-aichat-shell
          class=${classMap(classes(shell.className))}
          data-testid=${PageObjectId.CHAT_WIDGET}
          .aiEnabled=${props.aiEnabled}
          .showFrame=${props.showFrame}
          .cornerAll=${props.cornerAll}
          .cornerStartStart=${props.cornerStartStart}
          .cornerStartEnd=${props.cornerStartEnd}
          .cornerEndStart=${props.cornerEndStart}
          .cornerEndEnd=${props.cornerEndEnd}
          .contentMaxWidth=${props.contentMaxWidth}
          .showWorkspace=${props.showWorkspace}
          .workspaceLocation=${props.workspaceLocation}
          .showHistory=${props.showHistory}
          .workspaceAriaLabel=${props.workspaceAriaLabel}
          .historyAriaLabel=${props.historyAriaLabel}
          .messagesAriaLabel=${props.messagesAriaLabel}
          .panelOpenedAnnouncement=${props.panelOpenedAnnouncement}
          .panelClosedAnnouncement=${props.panelClosedAnnouncement}
          .workspaceOpenedAnnouncement=${props.workspaceOpenedAnnouncement}
          .workspaceClosedAnnouncement=${props.workspaceClosedAnnouncement}
          .historyShownAnnouncement=${props.historyShownAnnouncement}
          .historyHiddenAnnouncement=${props.historyHiddenAnnouncement}
          @cds-aichat-shell-panel-focus-fallback=${shell.onPanelFocusFallback}
          @scroll=${(event: Event) => {
            (event.currentTarget as HTMLElement).scrollTop = 0;
          }}
          ${ref(refs.widget)}>
          <cds-aichat-native-panels
            slot="panels"
            .inputs=${panels.inputs}
            .callbacks=${panels.callbacks}
            .hosts=${panels.hosts}
            .transformHeaderIcon=${panels.transformHeaderIcon}
            .onTargetsReady=${panels.onTargetsReady}
            ${ref(refs.panels)}></cds-aichat-native-panels>
          ${failed ? nothing : renderNormalRegions(layout, refs, messages)}
        </cds-aichat-shell>
      </cds-layer>
      ${!failed && layout.showLauncher ? html`<cds-aichat-launcher-view></cds-aichat-launcher-view>` : nothing}
    </div>
  `;
}
