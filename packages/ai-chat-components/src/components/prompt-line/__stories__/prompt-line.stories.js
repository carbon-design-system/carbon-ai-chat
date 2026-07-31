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

import { html, LitElement } from 'lit';
import { ref, createRef } from 'lit/directives/ref.js';
import { action } from 'storybook/actions';

import AddLarge16 from '@carbon/icons/es/add--large/16.js';
import Chat16 from '@carbon/icons/es/chat/16.js';
import ChatOff16 from '@carbon/icons/es/chat--off/16.js';
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

/**
 * Renders dummy actions as a flat row of sm ghost icon buttons, matching the
 * demo's InputActionsInline pattern (no toolbar wrapper, no justify-content:end).
 */
const renderInlineActions = (actions, disabled) => html`
  <div slot="message-actions" style="display:flex;align-items:center;">
    ${actions.map(
      (a) => html`
        <cds-icon-button
          size="sm"
          kind="ghost"
          align="top-start"
          enter-delay-ms="0"
          leave-delay-ms="0"
          ?disabled=${disabled}
          @click=${a.onClick}>
          ${iconLoader(a.icon, { slot: 'icon' })}
          <span slot="tooltip-content">${a.text}</span>
        </cds-icon-button>
      `
    )}
  </div>
`;

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

  _renderCustomList({ items, onSelect, onDismiss }) {
    const el = document.createElement('cds-aichat-autocomplete');
    el.items = items;
    el.headerConfig = { showHeader: true, title: 'Prompt suggestions' };
    el.attached = false;
    el.enableSendButton = false;
    el.addEventListener('cds-aichat-autocomplete-select', (e) =>
      onSelect(e.detail.item)
    );
    el.addEventListener('cds-aichat-autocomplete-dismiss', onDismiss);
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
      <div style="width:640px;max-inline-size:100%;margin-block-start:320px">
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
            .starters=${startersConfig}></cds-aichat-autocomplete-controller>
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
      <div style="width:640px;max-inline-size:100%;">
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
    enableSendButton: { type: Boolean },
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
    this.enableSendButton = false;
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

  connectedCallback() {
    super.connectedCallback();
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
    this._pushAutocompleteProps();
  }

  _pushAutocompleteProps() {
    const autocompleteEl = this.querySelector('cds-aichat-autocomplete');
    if (autocompleteEl) {
      autocompleteEl.enableSendButton = this.enableSendButton;
    }
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
        <div style="margin-block-start:320px">
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
            ${renderInlineActions(dummyActions, this.disabled)}
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
    enableSendButton: { type: Boolean },
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
    this.enableSendButton = true;
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
    // Also push on every reactive update (e.g. when enableSendButton/attached
    // change from Storybook controls, or _inputText changes).
    this._pushAutocompleteProps();
  }

  _pushAutocompleteProps() {
    const autocompleteEl = this.querySelector('cds-aichat-autocomplete');
    if (autocompleteEl) {
      autocompleteEl.enableSendButton = this.enableSendButton;
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

  render() {
    return html`
      <style>
        ${styles}
      </style>
      <div class="prompt-line-story-wrapper" style="margin-block-start:320px">
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
            .autocomplete=${this._autocompleteConfig}></cds-aichat-autocomplete-controller>
          ${renderInlineActions(dummyActions, this.disabled)}
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
    enableSendButton: {
      control: 'boolean',
      description:
        'Whether the send arrow is shown inside each autocomplete suggestion item (Typeahead only).',
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
    enableSendButton: true,
    attached: false,
  },
};

// ---------------------------------------------------------------------------
// Default — simple textarea, no actions, no autocomplete
// ---------------------------------------------------------------------------

export const Default = {
  argTypes: {
    enableSendButton: { table: { disable: true } },
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
    enableSendButton: { table: { disable: true } },
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
          ${renderInlineActions(dummyActions, disabled)}
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
  args: { enableSendButton: false },
  render: ({
    placeholder,
    disabled,
    rounded,
    hasError,
    errorTitle,
    errorDescription,
    errorCollapsible,
    errorFullscreen,
    enableSendButton,
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
    el.enableSendButton = enableSendButton;
    return el;
  },
};

// ---------------------------------------------------------------------------
// Conversation starters — starters overlay + toggle action only
// ---------------------------------------------------------------------------

export const ConversationStarters = {
  name: 'Conversation starters',
  argTypes: {
    enableSendButton: { table: { disable: true } },
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
    const el = document.createElement('prompt-line-story-starters');
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
// File uploads — file picker with simulated upload progress
// ---------------------------------------------------------------------------

export const FileUploads = {
  name: 'File uploads',
  argTypes: {
    enableSendButton: { table: { disable: true } },
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
    enableSendButton,
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
    el.enableSendButton = enableSendButton;
    el.attached = attached;
    return el;
  },
};
