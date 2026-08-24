/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Web Components stories for the Prompt line.
 *
 * Composes `<cds-aichat-prompt-line-shell>` + `<cds-aichat-prompt-line>` +
 * `<cds-aichat-input-send-control>` directly — no higher-level
 * `<cds-aichat-custom-element>` wrapper.
 *
 * Stateful stories (Conversation Starters, File Uploads) use small Lit
 * elements pre-registered at module load time so they work in Storybook's
 * synchronous render context.
 */

import '../index';
import '../autocomplete/index';
import '../../file-uploads/index';
import '@carbon/web-components/es/components/button/index.js';
import '@carbon/web-components/es/components/menu/index.js';

import { html, LitElement, nothing } from 'lit';
import { ref, createRef } from 'lit/directives/ref.js';
import { action } from 'storybook/actions';
import { createOverflowHandler } from '@carbon/utilities';

import AddLarge16 from '@carbon/icons/es/add--large/16.js';
import Chat16 from '@carbon/icons/es/chat/16.js';
import ChatOff16 from '@carbon/icons/es/chat--off/16.js';
import OverflowMenuVertical16 from '@carbon/icons/es/overflow-menu--vertical/16.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';

import styles from './story-styles.scss?lit';
import {
  mentionItems,
  commandItems,
  starterItems,
  typeaheadItems,
  dummyActions,
  filterItems,
} from './story-data.js';
import { buildCarbonExtensions, FileStatusValue } from '../index';

// ---------------------------------------------------------------------------
// Stateful element: Inline actions with responsive overflow
// Mirrors InputActionsInline from @carbon/ai-chat.
// ---------------------------------------------------------------------------

class PromptLineInlineActionsStory extends LitElement {
  static properties = {
    actions: { type: Array },
    disabled: { type: Boolean },
    _hiddenCount: { state: true },
    _menuOpen: { state: true },
    _measuring: { state: true },
  };

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.actions = [];
    this.disabled = false;
    this._hiddenCount = 0;
    this._menuOpen = false;
    this._measuring = true;
    this._containerRef = createRef();
    this._handler = undefined;
    this._setupRaf = 0;
    this._revealRaf = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    this.slot = 'message-actions';
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this._setupRaf);
    cancelAnimationFrame(this._revealRaf);
    this._handler?.disconnect();
    this._handler = undefined;
  }

  firstUpdated() {
    this._setupRaf = requestAnimationFrame(() => {
      this._setupHandler();
      // One more frame after handler's own rAF measure before revealing.
      this._revealRaf = requestAnimationFrame(() => {
        this._measuring = false;
      });
    });
  }

  _setupHandler() {
    const container = this._containerRef.value;
    if (!container) {
      return;
    }
    this._handler?.disconnect();

    this._handler = createOverflowHandler({
      container,
      dimension: 'width',
      onChange: (visibleItems) => {
        const hidden = Math.max(0, this.actions.length - visibleItems.length);
        this._hiddenCount = hidden;
        if (hidden === 0 && this._menuOpen) {
          this._menuOpen = false;
        }
      },
    });
  }

  get _hiddenActions() {
    const { actions, _hiddenCount: count } = this;
    return count > 0 ? actions.slice(actions.length - count) : [];
  }

  _renderButton(a) {
    return html`
      <cds-icon-button
        size="sm"
        kind="ghost"
        align="top-start"
        enter-delay-ms="0"
        leave-delay-ms="0"
        ?disabled=${this.disabled || a.disabled}
        @click=${a.onClick}>
        ${iconLoader(a.icon, { slot: 'icon' })}
        <span slot="tooltip-content">${a.text}</span>
      </cds-icon-button>
    `;
  }

  render() {
    const hiddenActions = this._hiddenActions;

    return html`
      <div
        class="prompt-line-story-inline-actions"
        style="flex:1 1 auto; position: relative;"
        ?data-measuring=${this._measuring}
        ${ref(this._containerRef)}>
        ${this.actions.map((a) => this._renderButton(a))}

        <div
          data-offset=""
          ?data-hidden=${this._hiddenCount === 0}
          style="position: relative;">
          <cds-icon-button
            size="sm"
            kind="ghost"
            align="top-start"
            enter-delay-ms="0"
            leave-delay-ms="0"
            ?disabled=${this.disabled}
            @click=${() => {
              this._menuOpen = !this._menuOpen;
            }}>
            ${iconLoader(OverflowMenuVertical16, { slot: 'icon' })}
            <span slot="tooltip-content">More actions</span>
          </cds-icon-button>

          ${
            this._menuOpen && hiddenActions.length > 0
              ? html`
                  <cds-menu
                    open
                    label="More actions"
                    style="position: absolute; bottom: 100%; left: 0;"
                    @cds-menu-closed=${() => {
                      this._menuOpen = false;
                    }}>
                    ${hiddenActions.map(
                      (a) => html`
                        <cds-menu-item
                          label=${a.text}
                          ?disabled=${a.disabled}
                          @click=${() => {
                            this._menuOpen = false;
                            a.onClick?.();
                          }}>
                        </cds-menu-item>
                      `
                    )}
                  </cds-menu>
                `
              : nothing
          }
        </div>
      </div>
    `;
  }
}

// Register the demo component
if (!customElements.get('prompt-line-story-inline-actions')) {
  customElements.define(
    'prompt-line-story-inline-actions',
    PromptLineInlineActionsStory
  );
}

// ---------------------------------------------------------------------------
// Stateful element: Conversation Starters story
// ---------------------------------------------------------------------------

class PromptLineStartersStory extends LitElement {
  static properties = {
    _startersEnabled: { state: true },
    _inputHasText: { state: true },
    placeholder: {},
    disabled: { type: Boolean },
    rounded: { type: Boolean },
    hasError: { type: Boolean },
    errorTitle: {},
    errorDescription: {},
    errorCollapsible: { type: Boolean },
    errorFullscreen: { type: Boolean },
    disableDirectSend: { type: Boolean },
    attached: { type: Boolean },
  };

  constructor() {
    super();
    this._startersEnabled = true;
    this._inputHasText = false;
    this.placeholder = 'Ask a question…';
    this.disabled = false;
    this.rounded = false;
    this.hasError = false;
    this.errorTitle = '';
    this.errorDescription = '';
    this.errorCollapsible = false;
    this.errorFullscreen = true;
    this.disableDirectSend = false;
    this.attached = false;
  }

  // Render in light DOM so story-styles.scss reaches the content.
  createRenderRoot() {
    return this;
  }

  _onPromptChange(e) {
    this._inputHasText = e.detail.rawValue.length > 0;
    action('cds-aichat-prompt-change')(e.detail);
  }

  _onSend() {
    action('cds-aichat-input-send')();
  }

  _onItemSelected(e) {
    action('cds-aichat-autocomplete-select')(e.detail.item);
  }

  _onItemSend(e) {
    action('cds-aichat-autocomplete-send')(e.detail.text);
  }

  _renderCustomList({ items, onSelect, onDismiss, onSend }) {
    const el = document.createElement('cds-aichat-autocomplete');
    el.items = items;
    el.headerConfig = { showHeader: true, title: 'Prompt suggestions' };
    el.attached = this.attached;
    el.disableDirectSend = this.disableDirectSend;
    el.addEventListener('cds-aichat-autocomplete-dismiss', onDismiss);
    el.addEventListener('cds-aichat-autocomplete-select', (e) =>
      onSelect(e.detail.item)
    );
    el.addEventListener('cds-aichat-autocomplete-send', (e) =>
      onSend(e.detail.text)
    );
    return el;
  }

  render() {
    const startersConfig = {
      items: starterItems,
      isOn: this._startersEnabled,
      renderCustomList: (props) => this._renderCustomList(props),
    };

    const extensions = buildCarbonExtensions({ starters: startersConfig });

    const toggleIcon = this._startersEnabled ? ChatOff16 : Chat16;
    const toggleLabel = this._startersEnabled
      ? 'Hide conversation starters'
      : 'Show conversation starters';

    return html`
      <style>
        ${styles}
      </style>
      <div
        class="prompt-line-story-wrapper prompt-line-story-wrapper--autocomplete">
        <cds-aichat-prompt-line-shell
          ?rounded=${this.rounded}
          ?disabled=${this.disabled}
          ?has-error=${this.hasError}
          expanded>
          ${
            this.hasError && this.errorTitle
              ? html`<cds-aichat-error-message
                  slot="field-messaging"
                  title=${this.errorTitle}
                  description=${this.errorDescription}
                  ?collapsible=${this.errorCollapsible}
                  ?fullscreen=${this.errorFullscreen}></cds-aichat-error-message>`
              : null
          }
          <cds-aichat-prompt-line
            slot="editor"
            placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            rich
            .extensions=${extensions}
            @cds-aichat-prompt-change=${(e) =>
              this._onPromptChange(e)}></cds-aichat-prompt-line>
          <cds-aichat-autocomplete-controller
            slot="autocomplete-content"
            .starters=${startersConfig}
            @cds-aichat-autocomplete-item-selected=${(e) => this._onItemSelected(e)}
            @cds-aichat-autocomplete-item-send=${(e) => this._onItemSend(e)}></cds-aichat-autocomplete-controller>
          <div slot="message-actions">
            <cds-icon-button
              size="sm"
              kind="ghost"
              align="top-start"
              enter-delay-ms="0"
              leave-delay-ms="0"
              ?disabled=${this.disabled || this._inputHasText}
              @click=${() => {
                this._startersEnabled = !this._startersEnabled;
              }}>
              ${iconLoader(toggleIcon, { slot: 'icon' })}
              <span slot="tooltip-content">${toggleLabel}</span>
            </cds-icon-button>
          </div>
          <cds-aichat-input-send-control
            slot="send-control"
            ?disabled=${this.disabled}
            .hasValidInput=${this._inputHasText}
            @cds-aichat-input-send=${() =>
              this._onSend()}></cds-aichat-input-send-control>
        </cds-aichat-prompt-line-shell>
      </div>
    `;
  }
}

if (!customElements.get('prompt-line-story-starters')) {
  customElements.define('prompt-line-story-starters', PromptLineStartersStory);
}

// ---------------------------------------------------------------------------
// Stateful element: File Uploads story
// ---------------------------------------------------------------------------

class PromptLineFileUploadsStory extends LitElement {
  static properties = {
    _uploads: { state: true },
    placeholder: {},
    disabled: { type: Boolean },
    rounded: { type: Boolean },
    hasError: { type: Boolean },
    errorTitle: {},
    errorDescription: {},
    errorCollapsible: { type: Boolean },
    errorFullscreen: { type: Boolean },
  };

  constructor() {
    super();
    this._uploads = [];
    this.placeholder = 'Ask a question…';
    this.disabled = false;
    this.rounded = false;
    this.hasError = false;
    this.errorTitle = '';
    this.errorDescription = '';
    this.errorCollapsible = false;
    this.errorFullscreen = true;
    this._fileInputRef = createRef();
  }

  createRenderRoot() {
    return this;
  }

  _onAttachClick() {
    this._fileInputRef.value?.click();
  }

  _onFileSelected(e) {
    const input = e.target;
    const files = Array.from(input.files ?? []);
    // Reset early so re-selecting the same file fires `change` again.
    input.value = '';

    if (files.length === 0) {
      return;
    }

    const newUploads = files.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: FileStatusValue.EDIT,
    }));

    this._uploads = [...this._uploads, ...newUploads];
  }

  _onFileRemove(e) {
    const { fileId } = e.detail;
    this._uploads = this._uploads.filter((u) => u.id !== fileId);
    action('cds-aichat-file-remove')({ fileId });
  }

  _onPromptChange(e) {
    const sendControl = this.querySelector('cds-aichat-input-send-control');
    if (sendControl) {
      // Send is valid when there is text, or at least one non-errored upload.
      const hasText = e.detail.rawValue.length > 0;
      const hasUploads =
        this._uploads.length > 0 && !this._uploads.every((u) => u.isError);
      sendControl.hasValidInput = hasText || hasUploads;
    }
    action('cds-aichat-prompt-change')(e.detail);
  }

  render() {
    return html`
      <style>
        ${styles}
      </style>
      <div class="prompt-line-story-wrapper">
        <cds-aichat-prompt-line-shell
          ?rounded=${this.rounded}
          ?disabled=${this.disabled}
          ?has-error=${this.hasError}
          expanded>
          ${
            this.hasError && this.errorTitle
              ? html`<cds-aichat-error-message
                  slot="field-messaging"
                  title=${this.errorTitle}
                  description=${this.errorDescription}
                  ?collapsible=${this.errorCollapsible}
                  ?fullscreen=${this.errorFullscreen}></cds-aichat-error-message>`
              : null
          }
          <!-- Always mounted so live regions persist after the last file is removed. -->
          <cds-aichat-file-uploads
            slot="file-uploads"
            .uploads=${this._uploads}
            @cds-aichat-file-remove=${(e) =>
              this._onFileRemove(e)}></cds-aichat-file-uploads>
          <cds-aichat-prompt-line
            slot="editor"
            placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            @cds-aichat-prompt-change=${(e) =>
              this._onPromptChange(e)}></cds-aichat-prompt-line>
          <!-- Hidden file input lives beside the button inside the slot. -->
          <div slot="message-actions">
            <input
              type="file"
              multiple
              tabindex="-1"
              hidden
              @change=${(e) => this._onFileSelected(e)}
              ${ref(this._fileInputRef)} />
            <cds-icon-button
              size="sm"
              kind="ghost"
              align="top-start"
              enter-delay-ms="0"
              leave-delay-ms="0"
              ?disabled=${this.disabled}
              @click=${() => this._onAttachClick()}>
              ${iconLoader(AddLarge16, { slot: 'icon' })}
              <span slot="tooltip-content">Attach file</span>
            </cds-icon-button>
          </div>
          <cds-aichat-input-send-control
            slot="send-control"
            ?disabled=${this.disabled}
            @cds-aichat-input-send=${() =>
              action(
                'cds-aichat-input-send'
              )()}></cds-aichat-input-send-control>
        </cds-aichat-prompt-line-shell>
      </div>
    `;
  }
}

if (!customElements.get('prompt-line-story-file-uploads')) {
  customElements.define(
    'prompt-line-story-file-uploads',
    PromptLineFileUploadsStory
  );
}

// ---------------------------------------------------------------------------
// Stateful element: Commands and mentions story
// ---------------------------------------------------------------------------

class PromptLineCommandsAndMentionsStory extends LitElement {
  static properties = {
    placeholder: {},
    disabled: { type: Boolean },
    rounded: { type: Boolean },
    hasError: { type: Boolean },
    errorTitle: {},
    errorDescription: {},
    errorCollapsible: { type: Boolean },
    errorFullscreen: { type: Boolean },
  };

  constructor() {
    super();
    this.placeholder = 'Type something...';
    this.disabled = false;
    this.rounded = true;
    this.hasError = false;
    this.errorTitle = '';
    this.errorDescription = '';
    this.errorCollapsible = false;
    this.errorFullscreen = true;
    this._sendControlRef = createRef();
    this._mentionConfig = {
      trigger: '@',
      items: async (query) => {
        if (!query) {
          return mentionItems;
        }
        return mentionItems.filter((m) =>
          m.label.toLowerCase().includes(query.toLowerCase())
        );
      },
      onSelect: (item) => action('mention-selected')(item),
      onRemove: (item) => action('mention-removed')(item),
    };
    this._commandConfig = {
      trigger: '/',
      triggerPosition: 'start',
      items: commandItems,
      onSelect: (item) => action('command-selected')(item),
      onRemove: (item) => action('command-removed')(item),
    };
    this._extensions = buildCarbonExtensions({
      mention: this._mentionConfig,
      command: this._commandConfig,
    });
  }

  createRenderRoot() {
    return this;
  }

  _onPromptChange(e) {
    if (this._sendControlRef.value) {
      this._sendControlRef.value.hasValidInput = e.detail.rawValue.length > 0;
    }
    action('cds-aichat-prompt-change')(e.detail);
  }

  render() {
    return html`
      <style>
        ${styles}
      </style>
      <div class="prompt-line-story-wrapper">
        <p class="prompt-line-story-hint">
          Type <code>@</code> anywhere to mention a team member. Type
          <code>/</code> at the start of the line to run a command.
        </p>
        <div class="prompt-line-story-wrapper--autocomplete">
          <cds-aichat-prompt-line-shell
            ?rounded=${this.rounded}
            ?disabled=${this.disabled}
            ?has-error=${this.hasError}
            expanded>
            ${
              this.hasError && this.errorTitle
                ? html`<cds-aichat-error-message
                    slot="field-messaging"
                    title=${this.errorTitle}
                    description=${this.errorDescription}
                    ?collapsible=${this.errorCollapsible}
                    ?fullscreen=${this.errorFullscreen}></cds-aichat-error-message>`
                : null
            }
            <cds-aichat-prompt-line
              slot="editor"
              placeholder=${this.placeholder}
              ?disabled=${this.disabled}
              rich
              .extensions=${this._extensions}
              @cds-aichat-prompt-change=${(e) =>
                this._onPromptChange(e)}></cds-aichat-prompt-line>
            <cds-aichat-autocomplete-controller
              slot="autocomplete-content"
              .mention=${this._mentionConfig}
              .command=${this._commandConfig}></cds-aichat-autocomplete-controller>
            <prompt-line-story-inline-actions
              .actions=${dummyActions}
              ?disabled=${this.disabled}></prompt-line-story-inline-actions>
            <cds-aichat-input-send-control
              slot="send-control"
              ?disabled=${this.disabled}
              @cds-aichat-input-send=${() => action('cds-aichat-input-send')()}
              ${ref(this._sendControlRef)}></cds-aichat-input-send-control>
          </cds-aichat-prompt-line-shell>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('prompt-line-story-commands-and-mentions')) {
  customElements.define(
    'prompt-line-story-commands-and-mentions',
    PromptLineCommandsAndMentionsStory
  );
}

// ---------------------------------------------------------------------------
// Stateful element: Typeahead story
// ---------------------------------------------------------------------------

class PromptLineTypeaheadStory extends LitElement {
  static properties = {
    _inputText: { state: true },
    placeholder: {},
    disabled: { type: Boolean },
    rounded: { type: Boolean },
    hasError: { type: Boolean },
    errorTitle: {},
    errorDescription: {},
    errorCollapsible: { type: Boolean },
    errorFullscreen: { type: Boolean },
    disableDirectSend: { type: Boolean },
    attached: { type: Boolean },
  };

  constructor() {
    super();
    this._inputText = '';
    this.placeholder = 'Type something...';
    this.disabled = false;
    this.rounded = true;
    this.hasError = false;
    this.errorTitle = '';
    this.errorDescription = '';
    this.errorCollapsible = false;
    this.errorFullscreen = true;
    this.disableDirectSend = false;
    this.attached = false;
    this._autocompleteConfig = {
      items: (query) => filterItems(typeaheadItems, query),
    };
    this._extensions = buildCarbonExtensions({
      autocomplete: this._autocompleteConfig,
    });
    this._sendControlRef = createRef();
  }

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    // Watch for <cds-aichat-autocomplete> being added by the controller so we
    // can push props onto it the moment it appears, not just on our own updates.
    this._autocompleteObserver = new MutationObserver(() => {
      this._pushAutocompleteProps();
    });
    this._autocompleteObserver.observe(this, {
      childList: true,
      subtree: true,
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._autocompleteObserver?.disconnect();
    this._autocompleteObserver = null;
  }

  updated() {
    // Push inputText, attached, and disableDirectSend onto the autocomplete
    // element whenever they change (e.g. from Storybook controls or user typing).
    this._pushAutocompleteProps();
  }

  _pushAutocompleteProps() {
    const autocompleteEl = this.querySelector('cds-aichat-autocomplete');
    if (autocompleteEl) {
      autocompleteEl.disableDirectSend = this.disableDirectSend;
      autocompleteEl.attached = this.attached;
      autocompleteEl.inputText = this._inputText;
    }
  }

  _onPromptChange(e) {
    this._inputText = e.detail.rawValue;
    if (this._sendControlRef.value) {
      this._sendControlRef.value.hasValidInput = e.detail.rawValue.length > 0;
    }
    action('cds-aichat-prompt-change')(e.detail);
  }

  _onItemSelected(e) {
    action('cds-aichat-autocomplete-select')(e.detail.item);
  }

  _onItemSend(e) {
    action('cds-aichat-autocomplete-send')(e.detail.text);
  }

  render() {
    return html`
      <style>
        ${styles}
      </style>
      <div
        class="prompt-line-story-wrapper prompt-line-story-wrapper--autocomplete">
        <cds-aichat-prompt-line-shell
          ?rounded=${this.rounded}
          ?disabled=${this.disabled}
          ?has-error=${this.hasError}
          expanded>
          ${
            this.hasError && this.errorTitle
              ? html`<cds-aichat-error-message
                  slot="field-messaging"
                  title=${this.errorTitle}
                  description=${this.errorDescription}
                  ?collapsible=${this.errorCollapsible}
                  ?fullscreen=${this.errorFullscreen}></cds-aichat-error-message>`
              : null
          }
          <cds-aichat-prompt-line
            slot="editor"
            placeholder=${this.placeholder}
            ?disabled=${this.disabled}
            rich
            .extensions=${this._extensions}
            @cds-aichat-prompt-change=${(e) =>
              this._onPromptChange(e)}></cds-aichat-prompt-line>
          <cds-aichat-autocomplete-controller
            slot="autocomplete-content"
            .autocomplete=${this._autocompleteConfig}
            @cds-aichat-autocomplete-item-selected=${(e) => this._onItemSelected(e)}
            @cds-aichat-autocomplete-item-send=${(e) => this._onItemSend(e)}></cds-aichat-autocomplete-controller>
          <prompt-line-story-inline-actions
            .actions=${dummyActions}
            ?disabled=${this.disabled}></prompt-line-story-inline-actions>
          <cds-aichat-input-send-control
            slot="send-control"
            ?disabled=${this.disabled}
            @cds-aichat-input-send=${() => action('cds-aichat-input-send')()}
            ${ref(this._sendControlRef)}></cds-aichat-input-send-control>
        </cds-aichat-prompt-line-shell>
      </div>
    `;
  }
}

if (!customElements.get('prompt-line-story-typeahead')) {
  customElements.define(
    'prompt-line-story-typeahead',
    PromptLineTypeaheadStory
  );
}

// ---------------------------------------------------------------------------
// Story exports
// ---------------------------------------------------------------------------

export default {
  title: 'Preview/Prompt line',
  argTypes: {
    placeholder: {
      control: 'text',
      description: 'Placeholder text shown when the editor is empty.',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the prompt line is disabled.',
    },
    rounded: {
      control: 'boolean',
      description: 'Whether the shell has rounded corners.',
    },
    hasError: {
      control: 'boolean',
      description: 'Whether the shell is in an error state.',
    },
    errorTitle: {
      control: 'text',
      description:
        'Short error title shown in the error message bar (requires hasError).',
    },
    errorDescription: {
      control: 'text',
      description: 'Optional longer description shown below the error title.',
    },
    errorCollapsible: {
      control: 'boolean',
      description: 'Whether the error message description can be collapsed.',
    },
    errorFullscreen: {
      control: 'boolean',
      description: 'Whether the error message uses the fullscreen layout.',
    },
    disableDirectSend: {
      control: 'boolean',
      description:
        'When `false` (default), clicking an autocomplete item fires `cds-aichat-autocomplete-send` and sends directly to chat. When `true`, clicking fires `cds-aichat-autocomplete-select` and inserts the item into the editor instead.',
      table: { category: 'Autocomplete' },
    },
    attached: {
      control: 'boolean',
      description:
        'Whether the autocomplete popover is visually attached to the input — removes bottom-corner rounding (Typeahead only).',
      table: { category: 'Autocomplete' },
    },
  },
  args: {
    placeholder: 'Type something...',
    disabled: false,
    rounded: true,
    hasError: false,
    errorTitle: 'Something went wrong.',
    errorDescription: '',
    errorCollapsible: false,
    errorFullscreen: true,
    disableDirectSend: false,
    attached: false,
  },
};

// ---------------------------------------------------------------------------
// Default — simple textarea, no actions, no autocomplete
// ---------------------------------------------------------------------------

export const Default = {
  argTypes: {
    disableDirectSend: { table: { disable: true } },
    attached: { table: { disable: true } },
  },
  render: ({
    placeholder,
    disabled,
    rounded,
    hasError,
    errorTitle,
    errorDescription,
    errorCollapsible,
    errorFullscreen,
  }) => {
    let sendControlEl = null;

    const onPromptChange = (e) => {
      if (sendControlEl) {
        sendControlEl.hasValidInput = e.detail.rawValue.length > 0;
      }
      action('cds-aichat-prompt-change')(e.detail);
    };

    return html`
      <style>
        ${styles}
      </style>
      <div class="prompt-line-story-wrapper">
        <cds-aichat-prompt-line-shell
          ?rounded=${rounded}
          ?disabled=${disabled}
          ?has-error=${hasError}>
          ${
            hasError && errorTitle
              ? html`<cds-aichat-error-message
                  slot="field-messaging"
                  title=${errorTitle}
                  description=${errorDescription}
                  ?collapsible=${errorCollapsible}
                  ?fullscreen=${errorFullscreen}></cds-aichat-error-message>`
              : null
          }
          <cds-aichat-prompt-line
            slot="editor"
            placeholder=${placeholder}
            ?disabled=${disabled}
            @cds-aichat-prompt-change=${onPromptChange}
            @cds-aichat-prompt-send-intent=${(e) =>
              action('cds-aichat-prompt-send-intent')(
                e.detail
              )}></cds-aichat-prompt-line>
          <cds-aichat-input-send-control
            slot="send-control"
            ?disabled=${disabled}
            @cds-aichat-input-send=${() => action('cds-aichat-input-send')()}
            ${ref((el) => {
              sendControlEl = el ?? null;
            })}></cds-aichat-input-send-control>
        </cds-aichat-prompt-line-shell>
      </div>
    `;
  },
};

// ---------------------------------------------------------------------------
// Expanded — full-width editor row + 10 dummy action buttons beneath it
// ---------------------------------------------------------------------------

export const Expanded = {
  argTypes: {
    disableDirectSend: { table: { disable: true } },
    attached: { table: { disable: true } },
  },
  render: ({
    placeholder,
    disabled,
    rounded,
    hasError,
    errorTitle,
    errorDescription,
    errorCollapsible,
    errorFullscreen,
  }) => {
    let sendControlEl = null;

    const onPromptChange = (e) => {
      if (sendControlEl) {
        sendControlEl.hasValidInput = e.detail.rawValue.length > 0;
      }
      action('cds-aichat-prompt-change')(e.detail);
    };

    return html`
      <style>
        ${styles}
      </style>
      <div class="prompt-line-story-wrapper">
        <cds-aichat-prompt-line-shell
          ?rounded=${rounded}
          ?disabled=${disabled}
          ?has-error=${hasError}
          expanded>
          ${
            hasError && errorTitle
              ? html`<cds-aichat-error-message
                  slot="field-messaging"
                  title=${errorTitle}
                  description=${errorDescription}
                  ?collapsible=${errorCollapsible}
                  ?fullscreen=${errorFullscreen}></cds-aichat-error-message>`
              : null
          }
          <cds-aichat-prompt-line
            slot="editor"
            placeholder=${placeholder}
            ?disabled=${disabled}
            @cds-aichat-prompt-change=${onPromptChange}></cds-aichat-prompt-line>
          <prompt-line-story-inline-actions
            .actions=${dummyActions}
            ?disabled=${disabled}></prompt-line-story-inline-actions>
          <cds-aichat-input-send-control
            slot="send-control"
            ?disabled=${disabled}
            @cds-aichat-input-send=${() => action('cds-aichat-input-send')()}
            ${ref((el) => {
              sendControlEl = el ?? null;
            })}></cds-aichat-input-send-control>
        </cds-aichat-prompt-line-shell>
      </div>
    `;
  },
};

// ---------------------------------------------------------------------------
// Commands and mentions — rich editor, @ + / pickers, hint callout
// ---------------------------------------------------------------------------

export const CommandsAndMentions = {
  name: 'Commands and mentions',
  render: ({
    placeholder,
    disabled,
    rounded,
    hasError,
    errorTitle,
    errorDescription,
    errorCollapsible,
    errorFullscreen,
  }) => {
    const el = document.createElement(
      'prompt-line-story-commands-and-mentions'
    );
    el.placeholder = placeholder;
    el.disabled = disabled;
    el.rounded = rounded;
    el.hasError = hasError;
    el.errorTitle = errorTitle;
    el.errorDescription = errorDescription;
    el.errorCollapsible = errorCollapsible;
    el.errorFullscreen = errorFullscreen;
    return el;
  },
};

// ---------------------------------------------------------------------------
// Conversation starters — starters overlay + toggle action only
// ---------------------------------------------------------------------------

export const ConversationStarters = {
  name: 'Conversation starters',
  render: ({
    placeholder,
    disabled,
    rounded,
    hasError,
    errorTitle,
    errorDescription,
    errorCollapsible,
    errorFullscreen,
    disableDirectSend,
    attached,
  }) => {
    const el = document.createElement('prompt-line-story-starters');
    el.placeholder = placeholder;
    el.disabled = disabled;
    el.rounded = rounded;
    el.hasError = hasError;
    el.errorTitle = errorTitle;
    el.errorDescription = errorDescription;
    el.errorCollapsible = errorCollapsible;
    el.errorFullscreen = errorFullscreen;
    el.disableDirectSend = disableDirectSend;
    el.attached = attached;
    return el;
  },
};

// ---------------------------------------------------------------------------
// File uploads — file picker with simulated upload progress
// ---------------------------------------------------------------------------

export const FileUploads = {
  name: 'File uploads',
  argTypes: {
    disableDirectSend: { table: { disable: true } },
    attached: { table: { disable: true } },
  },
  render: ({
    placeholder,
    disabled,
    rounded,
    hasError,
    errorTitle,
    errorDescription,
    errorCollapsible,
    errorFullscreen,
  }) => {
    const el = document.createElement('prompt-line-story-file-uploads');
    el.placeholder = placeholder;
    el.disabled = disabled;
    el.rounded = rounded;
    el.hasError = hasError;
    el.errorTitle = errorTitle;
    el.errorDescription = errorDescription;
    el.errorCollapsible = errorCollapsible;
    el.errorFullscreen = errorFullscreen;
    return el;
  },
};

// ---------------------------------------------------------------------------
// Typeahead — live autocomplete, 7 flat items, dummy actions
// ---------------------------------------------------------------------------

export const Typeahead = {
  render: ({
    placeholder,
    disabled,
    rounded,
    hasError,
    errorTitle,
    errorDescription,
    errorCollapsible,
    errorFullscreen,
    disableDirectSend,
    attached,
  }) => {
    const el = document.createElement('prompt-line-story-typeahead');
    el.placeholder = placeholder;
    el.disabled = disabled;
    el.rounded = rounded;
    el.hasError = hasError;
    el.errorTitle = errorTitle;
    el.errorDescription = errorDescription;
    el.errorCollapsible = errorCollapsible;
    el.errorFullscreen = errorFullscreen;
    el.disableDirectSend = disableDirectSend;
    el.attached = attached;
    return el;
  },
};
