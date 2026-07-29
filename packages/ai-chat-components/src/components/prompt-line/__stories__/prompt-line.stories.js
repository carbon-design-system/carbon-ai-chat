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
import '../../autocomplete/index';
import '../../toolbar/index';
import '../../file-uploads/index';
import '@carbon/web-components/es/components/button/index.js';

import { html, LitElement } from 'lit';
import { ref, createRef } from 'lit/directives/ref.js';
import { action } from 'storybook/actions';

import Attachment16 from '@carbon/icons/es/attachment/16.js';
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
  };

  constructor() {
    super();
    this._startersEnabled = true;
    this._inputHasText = false;
    this.placeholder = 'Ask a question…';
    this.disabled = false;
    this.rounded = false;
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

    const toggleAction = {
      text: this._startersEnabled
        ? 'Hide conversation starters'
        : 'Show conversation starters',
      icon: iconLoader(this._startersEnabled ? ChatOff16 : Chat16),
      disabled: this._inputHasText,
      onClick: () => {
        this._startersEnabled = !this._startersEnabled;
      },
    };

    return html`
      <style>
        ${styles}
      </style>
      <div class="prompt-line-story-wrapper">
        <cds-aichat-prompt-line-shell
          ?rounded=${this.rounded}
          ?disabled=${this.disabled}
          expanded>
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
          <cds-aichat-toolbar
            slot="message-actions"
            .actions=${[toggleAction]}></cds-aichat-toolbar>
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
  };

  constructor() {
    super();
    this._uploads = [];
    this.placeholder = 'Ask a question…';
    this.disabled = false;
    this.rounded = false;
    this._fileInputRef = createRef();
  }

  createRenderRoot() {
    return this;
  }

  _onAttachClick() {
    this._fileInputRef.value?.click();
  }

  _onFileSelected(e) {
    const files = Array.from(e.target.files ?? []);
    const newUploads = files.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      status: FileStatusValue.UPLOADING,
      isError: false,
    }));

    this._uploads = [...this._uploads, ...newUploads];

    // Simulate each file completing after 1.5 s
    newUploads.forEach(({ id }) => {
      setTimeout(() => {
        this._uploads = this._uploads.map((u) =>
          u.id === id ? { ...u, status: FileStatusValue.SUCCESS } : u
        );
      }, 1500);
    });

    e.target.value = '';
  }

  _onFileRemove(e) {
    const { id } = e.detail;
    this._uploads = this._uploads.filter((u) => u.id !== id);
    action('cds-aichat-file-remove')({ id });
  }

  _onPromptChange(e) {
    const sendControl = this.querySelector('cds-aichat-input-send-control');
    if (sendControl) {
      sendControl.hasValidInput = e.detail.rawValue.length > 0;
    }
    action('cds-aichat-prompt-change')(e.detail);
  }

  render() {
    const attachAction = {
      text: 'Attach file',
      icon: iconLoader(Attachment16),
      onClick: () => this._onAttachClick(),
    };

    return html`
      <style>
        ${styles}
      </style>
      <input
        type="file"
        multiple
        style="display:none"
        @change=${(e) => this._onFileSelected(e)}
        ${ref(this._fileInputRef)} />
      <div class="prompt-line-story-wrapper">
        <cds-aichat-prompt-line-shell
          ?rounded=${this.rounded}
          ?disabled=${this.disabled}
          expanded>
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
          <cds-aichat-toolbar
            slot="message-actions"
            .actions=${[attachAction]}></cds-aichat-toolbar>
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
  },
  args: {
    placeholder: 'Ask a question…',
    disabled: false,
    rounded: false,
  },
};

// ---------------------------------------------------------------------------
// Default — simple textarea, no actions, no autocomplete
// ---------------------------------------------------------------------------

export const Default = {
  render: ({ placeholder, disabled, rounded }) => {
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
        <cds-aichat-prompt-line-shell ?rounded=${rounded} ?disabled=${disabled}>
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
  render: ({ placeholder, disabled, rounded }) => {
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
          expanded>
          <cds-aichat-prompt-line
            slot="editor"
            placeholder=${placeholder}
            ?disabled=${disabled}
            @cds-aichat-prompt-change=${onPromptChange}></cds-aichat-prompt-line>
          <cds-aichat-toolbar
            slot="message-actions"
            overflow
            .actions=${dummyActions}></cds-aichat-toolbar>
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
  render: ({ placeholder, disabled, rounded }) => {
    const mentionConfig = {
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

    const commandConfig = {
      trigger: '/',
      triggerPosition: 'start',
      items: commandItems,
      onSelect: (item) => action('command-selected')(item),
      onRemove: (item) => action('command-removed')(item),
    };

    const extensions = buildCarbonExtensions({
      mention: mentionConfig,
      command: commandConfig,
    });

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
        <p class="prompt-line-story-hint">
          Type <code>@</code> anywhere to mention a team member. Type
          <code>/</code> at the start of the line to run a command.
        </p>
        <cds-aichat-prompt-line-shell
          ?rounded=${rounded}
          ?disabled=${disabled}
          expanded>
          <cds-aichat-prompt-line
            slot="editor"
            placeholder=${placeholder}
            ?disabled=${disabled}
            rich
            .extensions=${extensions}
            @cds-aichat-prompt-change=${onPromptChange}></cds-aichat-prompt-line>
          <cds-aichat-autocomplete-controller
            slot="autocomplete-content"
            .mention=${mentionConfig}
            .command=${commandConfig}></cds-aichat-autocomplete-controller>
          <cds-aichat-toolbar
            slot="message-actions"
            overflow
            .actions=${dummyActions}></cds-aichat-toolbar>
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
// Conversation starters — starters overlay + toggle action only
// ---------------------------------------------------------------------------

export const ConversationStarters = {
  name: 'Conversation starters',
  render: ({ placeholder, disabled, rounded }) => {
    const el = document.createElement('prompt-line-story-starters');
    el.placeholder = placeholder;
    el.disabled = disabled;
    el.rounded = rounded;
    return el;
  },
};

// ---------------------------------------------------------------------------
// File uploads — file picker with simulated upload progress
// ---------------------------------------------------------------------------

export const FileUploads = {
  name: 'File uploads',
  render: ({ placeholder, disabled, rounded }) => {
    const el = document.createElement('prompt-line-story-file-uploads');
    el.placeholder = placeholder;
    el.disabled = disabled;
    el.rounded = rounded;
    return el;
  },
};

// ---------------------------------------------------------------------------
// Typeahead — live autocomplete, 7 flat items, dummy actions
// ---------------------------------------------------------------------------

export const Typeahead = {
  render: ({ placeholder, disabled, rounded }) => {
    const autocompleteConfig = {
      items: (query) => filterItems(typeaheadItems, query),
    };

    const extensions = buildCarbonExtensions({
      autocomplete: autocompleteConfig,
    });

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
          expanded>
          <cds-aichat-prompt-line
            slot="editor"
            placeholder=${placeholder}
            ?disabled=${disabled}
            rich
            .extensions=${extensions}
            @cds-aichat-prompt-change=${onPromptChange}></cds-aichat-prompt-line>
          <cds-aichat-autocomplete-controller
            slot="autocomplete-content"
            .autocomplete=${autocompleteConfig}></cds-aichat-autocomplete-controller>
          <cds-aichat-toolbar
            slot="message-actions"
            overflow
            .actions=${dummyActions}></cds-aichat-toolbar>
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
