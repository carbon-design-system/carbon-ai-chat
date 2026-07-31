/* eslint-disable */
/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * React stories for the Prompt line.
 *
 * Composes `PromptLineShell` + `PromptLine` + `CDSAIChatInputSendControl`
 * directly — no higher-level `ChatCustomElement` wrapper.
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { action } from 'storybook/actions';

import '@carbon/web-components/es/components/button/index.js';
import AddLarge16 from '@carbon/icons/es/add--large/16.js';

import PromptLine from '../../../react/prompt-line';
import PromptLineShell from '../../../react/prompt-line-shell';
import CDSAIChatInputSendControl from '../../../react/input-send-control';
import CDSAIChatFileUploads from '../../../react/file-uploads';
import CDSAIChatErrorMessage from '../../../react/error-message';
import { useChatAutocomplete } from '../../../react/hooks/useChatAutocomplete';
import { buildCarbonExtensions, FileStatusValue } from '../index';

import Chat16 from '@carbon/icons/es/chat/16.js';
import ChatOff16 from '@carbon/icons/es/chat--off/16.js';
import {
  mentionItems,
  commandItems,
  starterItems,
  typeaheadItems,
  dummyActions,
  filterItems,
} from './story-data.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const Wrapper = ({ children }) => (
  <div style={{ width: '640px', maxWidth: '100%' }}>{children}</div>
);

// Gives the prompt line breathing room above it for the autocomplete overlay.
// Mirrors .prompt-line-story-wrapper--bottom in story-styles.scss.
const WrapperBottom = ({ children }) => (
  <div style={{ width: '640px', maxWidth: '100%', marginBlockStart: '320px' }}>
    {children}
  </div>
);

const Hint = ({ children }) => (
  <p
    style={{
      fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
      fontSize: '0.875rem',
      lineHeight: '1.5',
      color: 'var(--cds-text-helper, #6f6f6f)',
      marginBottom: '0.5rem',
    }}>
    {children}
  </p>
);

const InlineCode = ({ children }) => (
  <code
    style={{
      fontFamily: "'IBM Plex Mono', 'Menlo', 'DejaVu Sans Mono', monospace",
      fontSize: '0.8125rem',
      background: 'var(--cds-layer-01, #f4f4f4)',
      padding: '0.125rem 0.25rem',
      borderRadius: '2px',
    }}>
    {children}
  </code>
);

/**
 * Renders a CarbonIcon descriptor as a React <svg> element in a named slot.
 * Mirrors the carbonIconToReact() utility used in InputActionsInline.
 */
const CarbonIconSlot = ({ icon, slot }) =>
  React.createElement(
    'svg',
    {
      slot,
      ...icon.attrs,
      width: icon.attrs.width || 16,
      height: icon.attrs.height || 16,
      fill: icon.attrs.fill || 'currentColor',
      focusable: 'false',
      style: { pointerEvents: 'none' },
    },
    icon.content.map((child, i) =>
      React.createElement(child.elem, { key: i, ...(child.attrs || {}) })
    )
  );

/**
 * Renders dummy actions as a flat row of sm ghost icon buttons, matching the
 * demo's InputActionsInline pattern (no toolbar wrapper, no justify-content:end).
 */
const InlineActions = ({ disabled }) => (
  <div slot="message-actions" style={{ display: 'flex', alignItems: 'center' }}>
    {dummyActions.map((a) => (
      <cds-icon-button
        key={a.text}
        size="sm"
        kind="ghost"
        align="top-start"
        enter-delay-ms="0"
        leave-delay-ms="0"
        disabled={disabled || undefined}
        onClick={a.onClick}>
        <CarbonIconSlot icon={a.icon} slot="icon" />
        <span slot="tooltip-content">{a.text}</span>
      </cds-icon-button>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Story meta
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
      table: { disable: true },
    },
    errorDescription: {
      control: 'text',
      description: 'Optional longer description shown below the error title.',
      table: { disable: true },
    },
    errorCollapsible: {
      control: 'boolean',
      description: 'Whether the error message description can be collapsed.',
      table: { disable: true },
    },
    errorFullscreen: {
      control: 'boolean',
      description: 'Whether the error message uses the fullscreen layout.',
      table: { disable: true },
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
    const [hasValidInput, setHasValidInput] = useState(false);

    const onChange = useCallback((e) => {
      setHasValidInput(e.detail.rawValue.length > 0);
      action('cds-aichat-prompt-change')(e.detail);
    }, []);

    return (
      <Wrapper>
        <PromptLineShell
          rounded={rounded}
          disabled={disabled}
          hasError={hasError}>
          {hasError && errorTitle && (
            <CDSAIChatErrorMessage
              slot="field-messaging"
              title={errorTitle}
              description={errorDescription}
              collapsible={errorCollapsible}
              fullscreen={errorFullscreen}
            />
          )}
          <PromptLine
            slot="editor"
            placeholder={placeholder}
            disabled={disabled}
            onChange={onChange}
            onSendIntent={(e) =>
              action('cds-aichat-prompt-send-intent')(e.detail)
            }
          />
          <CDSAIChatInputSendControl
            slot="send-control"
            disabled={disabled}
            hasValidInput={hasValidInput}
            onSend={() => action('cds-aichat-input-send')()}
          />
        </PromptLineShell>
      </Wrapper>
    );
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
    const [hasValidInput, setHasValidInput] = useState(false);

    const onChange = useCallback((e) => {
      setHasValidInput(e.detail.rawValue.length > 0);
      action('cds-aichat-prompt-change')(e.detail);
    }, []);

    return (
      <Wrapper>
        <PromptLineShell
          rounded={rounded}
          disabled={disabled}
          hasError={hasError}
          expanded>
          {hasError && errorTitle && (
            <CDSAIChatErrorMessage
              slot="field-messaging"
              title={errorTitle}
              description={errorDescription}
              collapsible={errorCollapsible}
              fullscreen={errorFullscreen}
            />
          )}
          <PromptLine
            slot="editor"
            placeholder={placeholder}
            disabled={disabled}
            onChange={onChange}
          />
          <InlineActions disabled={disabled} />
          <CDSAIChatInputSendControl
            slot="send-control"
            disabled={disabled}
            hasValidInput={hasValidInput}
            onSend={() => action('cds-aichat-input-send')()}
          />
        </PromptLineShell>
      </Wrapper>
    );
  },
};

// ---------------------------------------------------------------------------
// Commands and mentions — rich editor, @ + / pickers, hint callout
// ---------------------------------------------------------------------------

const CommandsAndMentionsStory = ({
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
  const [hasValidInput, setHasValidInput] = useState(false);
  const promptLineRef = useRef(null);
  const shellRef = useRef(null);

  const mention = useMemo(
    () => ({
      trigger: '@',
      items: async (query) => {
        if (!query) return mentionItems;
        return mentionItems.filter((m) =>
          m.label.toLowerCase().includes(query.toLowerCase())
        );
      },
      onSelect: (item) => action('mention-selected')(item),
      onRemove: (item) => action('mention-removed')(item),
    }),
    []
  );

  const command = useMemo(
    () => ({
      trigger: '/',
      triggerPosition: 'start',
      items: commandItems,
      onSelect: (item) => action('command-selected')(item),
      onRemove: (item) => action('command-removed')(item),
    }),
    []
  );

  const extensions = useMemo(
    () => buildCarbonExtensions({ mention, command }),
    [mention, command]
  );

  const { onTriggerChange, autocompleteContent } = useChatAutocomplete({
    mention,
    command,
    promptLineRef,
    attached: false,
  });

  const onChange = useCallback((e) => {
    setHasValidInput(e.detail.rawValue.length > 0);
    action('cds-aichat-prompt-change')(e.detail);
  }, []);

  React.useEffect(() => {
    const el = shellRef.current?.querySelector('cds-aichat-autocomplete');
    if (el) {
      el.enableSendButton = enableSendButton;
    }
  }, [enableSendButton, autocompleteContent]);

  return (
    <Wrapper>
      <Hint>
        Type <InlineCode>@</InlineCode> anywhere to mention a team member. Type{' '}
        <InlineCode>/</InlineCode> at the start of the line to run a command.
      </Hint>
      <div style={{ marginBlockStart: '320px' }}>
        <PromptLineShell
          ref={shellRef}
          rounded={rounded}
          disabled={disabled}
          hasError={hasError}
          expanded>
          {hasError && errorTitle && (
            <CDSAIChatErrorMessage
              slot="field-messaging"
              title={errorTitle}
              description={errorDescription}
              collapsible={errorCollapsible}
              fullscreen={errorFullscreen}
            />
          )}
          <PromptLine
            ref={promptLineRef}
            slot="editor"
            placeholder={placeholder}
            disabled={disabled}
            rich
            extensions={extensions}
            onChange={onChange}
            onTriggerChange={onTriggerChange}
          />
          {autocompleteContent}
          <InlineActions disabled={disabled} />
          <CDSAIChatInputSendControl
            slot="send-control"
            disabled={disabled}
            hasValidInput={hasValidInput}
            onSend={() => action('cds-aichat-input-send')()}
          />
        </PromptLineShell>
      </div>
    </Wrapper>
  );
};

export const CommandsAndMentions = {
  name: 'Commands and mentions',
  args: { enableSendButton: false },
  render: (args) => <CommandsAndMentionsStory {...args} />,
};

// ---------------------------------------------------------------------------
// Conversation starters — starters overlay + toggle action only
// ---------------------------------------------------------------------------

function renderCustomList({ items, onSelect, onDismiss }) {
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

const ConversationStartersStory = ({
  placeholder,
  disabled,
  rounded,
  hasError,
  errorTitle,
  errorDescription,
  errorCollapsible,
  errorFullscreen,
}) => {
  const [startersEnabled, setStartersEnabled] = useState(true);
  const [hasValidInput, setHasValidInput] = useState(false);
  const promptLineRef = useRef(null);

  // Keep starters config stable — only isOn changes
  const startersBase = useMemo(
    () => ({ items: starterItems, renderCustomList }),
    []
  );
  const starters = useMemo(
    () => ({ ...startersBase, isOn: startersEnabled }),
    [startersBase, startersEnabled]
  );

  const extensions = useMemo(
    () => buildCarbonExtensions({ starters }),
    [starters]
  );

  const { onTriggerChange, autocompleteContent } = useChatAutocomplete({
    starters,
    promptLineRef,
    attached: false,
  });

  const onChange = useCallback((e) => {
    setHasValidInput(e.detail.rawValue.length > 0);
    action('cds-aichat-prompt-change')(e.detail);
  }, []);

  const toggleIcon = startersEnabled ? ChatOff16 : Chat16;
  const toggleLabel = startersEnabled
    ? 'Hide conversation starters'
    : 'Show conversation starters';

  return (
    <WrapperBottom>
      <PromptLineShell
        rounded={rounded}
        disabled={disabled}
        hasError={hasError}
        expanded>
        {hasError && errorTitle && (
          <CDSAIChatErrorMessage
            slot="field-messaging"
            title={errorTitle}
            description={errorDescription}
            collapsible={errorCollapsible}
            fullscreen={errorFullscreen}
          />
        )}
        <PromptLine
          ref={promptLineRef}
          slot="editor"
          placeholder={placeholder}
          disabled={disabled}
          rich
          extensions={extensions}
          onChange={onChange}
          onTriggerChange={onTriggerChange}
        />
        {autocompleteContent}
        <div slot="message-actions">
          <cds-icon-button
            size="sm"
            kind="ghost"
            align="top-start"
            enter-delay-ms="0"
            leave-delay-ms="0"
            disabled={disabled || hasValidInput || undefined}
            onClick={() => setStartersEnabled((prev) => !prev)}>
            <CarbonIconSlot icon={toggleIcon} slot="icon" />
            <span slot="tooltip-content">{toggleLabel}</span>
          </cds-icon-button>
        </div>
        <CDSAIChatInputSendControl
          slot="send-control"
          disabled={disabled}
          hasValidInput={hasValidInput}
          onSend={() => action('cds-aichat-input-send')()}
        />
      </PromptLineShell>
    </WrapperBottom>
  );
};

export const ConversationStarters = {
  name: 'Conversation starters',
  argTypes: {
    enableSendButton: { table: { disable: true } },
    attached: { table: { disable: true } },
  },
  render: (args) => <ConversationStartersStory {...args} />,
};

// ---------------------------------------------------------------------------
// File uploads — file picker with simulated upload progress
// ---------------------------------------------------------------------------

const FileUploadsStory = ({
  placeholder,
  disabled,
  rounded,
  hasError,
  errorTitle,
  errorDescription,
  errorCollapsible,
  errorFullscreen,
}) => {
  const [uploads, setUploads] = useState([]);
  const [hasValidInput, setHasValidInput] = useState(false);
  const fileInputRef = useRef(null);

  const onAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileSelected = useCallback((e) => {
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

    setUploads((prev) => [...prev, ...newUploads]);
  }, []);

  const onFileRemove = useCallback((e) => {
    const { fileId } = e.detail;
    setUploads((prev) => prev.filter((u) => u.id !== fileId));
    action('cds-aichat-file-remove')({ fileId });
  }, []);

  const onChange = useCallback((e) => {
    setHasValidInput(e.detail.rawValue.length > 0);
    action('cds-aichat-prompt-change')(e.detail);
  }, []);

  // Send is valid when there is text, or at least one non-errored upload —
  // matches the demo's hasValidInput logic in Input.tsx.
  const hasValidInputOrUploads =
    hasValidInput || (uploads.length > 0 && !uploads.every((u) => u.isError));

  return (
    <Wrapper>
      <PromptLineShell
        rounded={rounded}
        disabled={disabled}
        hasError={hasError}
        expanded>
        {hasError && errorTitle && (
          <CDSAIChatErrorMessage
            slot="field-messaging"
            title={errorTitle}
            description={errorDescription}
            collapsible={errorCollapsible}
            fullscreen={errorFullscreen}
          />
        )}
        {/* Always mounted so live regions persist after the last file is removed. */}
        <CDSAIChatFileUploads
          slot="file-uploads"
          uploads={uploads}
          onFileRemove={onFileRemove}
        />
        <PromptLine
          slot="editor"
          placeholder={placeholder}
          disabled={disabled}
          onChange={onChange}
        />
        {/* Hidden file input lives beside the button inside the slot. */}
        <div slot="message-actions">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            tabIndex={-1}
            hidden
            onChange={onFileSelected}
          />
          <cds-icon-button
            size="sm"
            kind="ghost"
            align="top-start"
            enter-delay-ms="0"
            leave-delay-ms="0"
            disabled={disabled || undefined}
            onClick={onAttachClick}>
            <CarbonIconSlot icon={AddLarge16} slot="icon" />
            <span slot="tooltip-content">Attach file</span>
          </cds-icon-button>
        </div>
        <CDSAIChatInputSendControl
          slot="send-control"
          disabled={disabled}
          hasValidInput={hasValidInputOrUploads}
          onSend={() => action('cds-aichat-input-send')()}
        />
      </PromptLineShell>
    </Wrapper>
  );
};

export const FileUploads = {
  name: 'File uploads',
  argTypes: {
    enableSendButton: { table: { disable: true } },
    attached: { table: { disable: true } },
  },
  render: (args) => <FileUploadsStory {...args} />,
};

// ---------------------------------------------------------------------------
// Typeahead — live autocomplete, 7 flat items, dummy actions
// ---------------------------------------------------------------------------

const TypeaheadStory = ({
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
  const [hasValidInput, setHasValidInput] = useState(false);
  const [inputText, setInputText] = useState('');
  const promptLineRef = useRef(null);
  const shellRef = useRef(null);

  const autocomplete = useMemo(
    () => ({
      items: (query) => filterItems(typeaheadItems, query),
    }),
    []
  );

  const extensions = useMemo(
    () => buildCarbonExtensions({ autocomplete }),
    [autocomplete]
  );

  const { onTriggerChange, autocompleteContent } = useChatAutocomplete({
    autocomplete,
    promptLineRef,
    attached,
  });

  const onChange = useCallback((e) => {
    setHasValidInput(e.detail.rawValue.length > 0);
    setInputText(e.detail.rawValue);
    action('cds-aichat-prompt-change')(e.detail);
  }, []);

  // Imperatively push props onto the <cds-aichat-autocomplete> element that
  // the hook renders internally — it isn't directly accessible as JSX props.
  React.useEffect(() => {
    const el = shellRef.current?.querySelector('cds-aichat-autocomplete');
    if (el) {
      el.enableSendButton = enableSendButton;
      el.inputText = inputText;
    }
  }, [enableSendButton, inputText, autocompleteContent]);

  return (
    <WrapperBottom>
      <PromptLineShell
        ref={shellRef}
        rounded={rounded}
        disabled={disabled}
        hasError={hasError}
        expanded>
        {hasError && errorTitle && (
          <CDSAIChatErrorMessage
            slot="field-messaging"
            title={errorTitle}
            description={errorDescription}
            collapsible={errorCollapsible}
            fullscreen={errorFullscreen}
          />
        )}
        <PromptLine
          ref={promptLineRef}
          slot="editor"
          placeholder={placeholder}
          disabled={disabled}
          rich
          extensions={extensions}
          onChange={onChange}
          onTriggerChange={onTriggerChange}
        />
        {autocompleteContent}
        <InlineActions disabled={disabled} />
        <CDSAIChatInputSendControl
          slot="send-control"
          disabled={disabled}
          hasValidInput={hasValidInput}
          onSend={() => action('cds-aichat-input-send')()}
        />
      </PromptLineShell>
    </WrapperBottom>
  );
};

export const Typeahead = {
  render: (args) => <TypeaheadStory {...args} />,
};
