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

import PromptLine from '../../../react/prompt-line';
import PromptLineShell from '../../../react/prompt-line-shell';
import CDSAIChatInputSendControl from '../../../react/input-send-control';
import CDSAIChatFileUploads from '../../../react/file-uploads';
import Toolbar from '../../../react/toolbar';
import CDSAIChatAutocomplete from '../../../react/autocomplete';
import { useChatAutocomplete } from '../../../react/hooks/useChatAutocomplete';
import { buildCarbonExtensions, FileStatusValue } from '../index';

import {
  Chat,
  ChatOff,
  Attachment,
  Document,
  Translate,
  Idea,
  Edit,
  MagicWand,
  Code,
  Image,
  Search,
  Microphone,
} from '@carbon/icons-react';
import {
  mentionItems,
  commandItems,
  starterItems,
  typeaheadItems,
  filterItems,
} from './story-data.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const Wrapper = ({ children }) => (
  <div style={{ width: '640px', maxWidth: '100%' }}>{children}</div>
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

// React-compatible dummy actions — @carbon/icons-react icons are
// auto-transformed to CarbonIcon format by the Toolbar React wrapper.
const dummyActionsReact = [
  {
    text: 'Summarize conversation',
    icon: Document,
    onClick: () => action('dummy-action')('Summarize conversation'),
  },
  {
    text: 'Translate last message',
    icon: Translate,
    onClick: () => action('dummy-action')('Translate last message'),
  },
  {
    text: 'Brainstorm ideas',
    icon: Idea,
    onClick: () => action('dummy-action')('Brainstorm ideas'),
  },
  {
    text: 'Refine my writing',
    icon: Edit,
    onClick: () => action('dummy-action')('Refine my writing'),
  },
  {
    text: 'Suggest a follow-up',
    icon: MagicWand,
    onClick: () => action('dummy-action')('Suggest a follow-up'),
  },
  {
    text: 'Explain this code',
    icon: Code,
    onClick: () => action('dummy-action')('Explain this code'),
  },
  {
    text: 'Describe an image',
    icon: Image,
    onClick: () => action('dummy-action')('Describe an image'),
  },
  {
    text: 'Search the web',
    icon: Search,
    onClick: () => action('dummy-action')('Search the web'),
  },
  {
    text: 'Dictate a message',
    icon: Microphone,
    onClick: () => action('dummy-action')('Dictate a message'),
  },
  {
    text: 'Start a new chat',
    icon: Chat,
    onClick: () => action('dummy-action')('Start a new chat'),
  },
];

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
    const [hasValidInput, setHasValidInput] = useState(false);

    const onChange = useCallback((e) => {
      setHasValidInput(e.detail.rawValue.length > 0);
      action('cds-aichat-prompt-change')(e.detail);
    }, []);

    return (
      <Wrapper>
        <PromptLineShell rounded={rounded} disabled={disabled}>
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
  render: ({ placeholder, disabled, rounded }) => {
    const [hasValidInput, setHasValidInput] = useState(false);

    const onChange = useCallback((e) => {
      setHasValidInput(e.detail.rawValue.length > 0);
      action('cds-aichat-prompt-change')(e.detail);
    }, []);

    return (
      <Wrapper>
        <PromptLineShell rounded={rounded} disabled={disabled} expanded>
          <PromptLine
            slot="editor"
            placeholder={placeholder}
            disabled={disabled}
            onChange={onChange}
          />
          <Toolbar
            slot="message-actions"
            overflow
            actions={dummyActionsReact}
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
// Commands and mentions — rich editor, @ + / pickers, hint callout
// ---------------------------------------------------------------------------

const CommandsAndMentionsStory = ({ placeholder, disabled, rounded }) => {
  const [hasValidInput, setHasValidInput] = useState(false);
  const promptLineRef = useRef(null);

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
    attached: true,
  });

  const onChange = useCallback((e) => {
    setHasValidInput(e.detail.rawValue.length > 0);
    action('cds-aichat-prompt-change')(e.detail);
  }, []);

  return (
    <Wrapper>
      <Hint>
        Type <InlineCode>@</InlineCode> anywhere to mention a team member. Type{' '}
        <InlineCode>/</InlineCode> at the start of the line to run a command.
      </Hint>
      <PromptLineShell rounded={rounded} disabled={disabled} expanded>
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
        <Toolbar slot="message-actions" overflow actions={dummyActionsReact} />
        <CDSAIChatInputSendControl
          slot="send-control"
          disabled={disabled}
          hasValidInput={hasValidInput}
          onSend={() => action('cds-aichat-input-send')()}
        />
      </PromptLineShell>
    </Wrapper>
  );
};

export const CommandsAndMentions = {
  name: 'Commands and mentions',
  render: (args) => <CommandsAndMentionsStory {...args} />,
};

// ---------------------------------------------------------------------------
// Conversation starters — starters overlay + toggle action only
// ---------------------------------------------------------------------------

function renderCustomList({ items, onSelect, onDismiss }) {
  return (
    <CDSAIChatAutocomplete
      items={items}
      headerConfig={{ showHeader: true, title: 'Prompt suggestions' }}
      attached={false}
      enableSendButton={false}
      onSelect={(e) => onSelect(e.detail.item)}
      onDismiss={onDismiss}
    />
  );
}

const ConversationStartersStory = ({ placeholder, disabled, rounded }) => {
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

  const toggleAction = useMemo(
    () => [
      {
        text: startersEnabled
          ? 'Hide conversation starters'
          : 'Show conversation starters',
        icon: startersEnabled ? ChatOff : Chat,
        disabled: hasValidInput,
        onClick: () => setStartersEnabled((prev) => !prev),
      },
    ],
    [startersEnabled, hasValidInput]
  );

  return (
    <Wrapper>
      <PromptLineShell rounded={rounded} disabled={disabled} expanded>
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
        <Toolbar slot="message-actions" actions={toggleAction} />
        <CDSAIChatInputSendControl
          slot="send-control"
          disabled={disabled}
          hasValidInput={hasValidInput}
          onSend={() => action('cds-aichat-input-send')()}
        />
      </PromptLineShell>
    </Wrapper>
  );
};

export const ConversationStarters = {
  name: 'Conversation starters',
  render: (args) => <ConversationStartersStory {...args} />,
};

// ---------------------------------------------------------------------------
// File uploads — file picker with simulated upload progress
// ---------------------------------------------------------------------------

const FileUploadsStory = ({ placeholder, disabled, rounded }) => {
  const [uploads, setUploads] = useState([]);
  const [hasValidInput, setHasValidInput] = useState(false);
  const fileInputRef = useRef(null);

  const onAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileSelected = useCallback((e) => {
    const files = Array.from(e.target.files ?? []);
    const newUploads = files.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      status: FileStatusValue.UPLOADING,
      isError: false,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    newUploads.forEach(({ id }) => {
      setTimeout(() => {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, status: FileStatusValue.SUCCESS } : u
          )
        );
      }, 1500);
    });

    e.target.value = '';
  }, []);

  const onFileRemove = useCallback((e) => {
    const { id } = e.detail;
    setUploads((prev) => prev.filter((u) => u.id !== id));
    action('cds-aichat-file-remove')({ id });
  }, []);

  const onChange = useCallback((e) => {
    setHasValidInput(e.detail.rawValue.length > 0);
    action('cds-aichat-prompt-change')(e.detail);
  }, []);

  const attachAction = useMemo(
    () => [
      {
        text: 'Attach file',
        icon: Attachment,
        onClick: onAttachClick,
      },
    ],
    [onAttachClick]
  );

  return (
    <Wrapper>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={onFileSelected}
      />
      <PromptLineShell rounded={rounded} disabled={disabled} expanded>
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
        <Toolbar slot="message-actions" actions={attachAction} />
        <CDSAIChatInputSendControl
          slot="send-control"
          disabled={disabled}
          hasValidInput={hasValidInput}
          onSend={() => action('cds-aichat-input-send')()}
        />
      </PromptLineShell>
    </Wrapper>
  );
};

export const FileUploads = {
  name: 'File uploads',
  render: (args) => <FileUploadsStory {...args} />,
};

// ---------------------------------------------------------------------------
// Typeahead — live autocomplete, 7 flat items, dummy actions
// ---------------------------------------------------------------------------

const TypeaheadStory = ({ placeholder, disabled, rounded }) => {
  const [hasValidInput, setHasValidInput] = useState(false);
  const promptLineRef = useRef(null);

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
    attached: true,
  });

  const onChange = useCallback((e) => {
    setHasValidInput(e.detail.rawValue.length > 0);
    action('cds-aichat-prompt-change')(e.detail);
  }, []);

  return (
    <Wrapper>
      <PromptLineShell rounded={rounded} disabled={disabled} expanded>
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
        <Toolbar slot="message-actions" overflow actions={dummyActionsReact} />
        <CDSAIChatInputSendControl
          slot="send-control"
          disabled={disabled}
          hasValidInput={hasValidInput}
          onSend={() => action('cds-aichat-input-send')()}
        />
      </PromptLineShell>
    </Wrapper>
  );
};

export const Typeahead = {
  render: (args) => <TypeaheadStory {...args} />,
};
