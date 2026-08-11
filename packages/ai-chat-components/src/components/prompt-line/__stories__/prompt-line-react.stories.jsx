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

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { action } from 'storybook/actions';
import { default as WCMeta } from './prompt-line.stories';
import './story-styles.scss';

import '@carbon/web-components/es/components/button/index.js';
import '@carbon/web-components/es/components/menu/index.js';
import AddLarge16 from '@carbon/icons/es/add--large/16.js';
import OverflowMenuVertical16 from '@carbon/icons/es/overflow-menu--vertical/16.js';
import { createOverflowHandler } from '@carbon/utilities';

import PromptLine from '../../../react/prompt-line';
import PromptLineShell from '../../../react/prompt-line-shell';
import CDSAIChatInputSendControl from '../../../react/input-send-control';
import CDSAIChatAutocomplete from '../../../react/autocomplete';
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
  <div className="prompt-line-story-wrapper">{children}</div>
);

// Gives the prompt line breathing room above it for the autocomplete overlay.
// Mirrors .prompt-line-story-wrapper--autocomplete in story-styles.scss.
const WrapperBottom = ({ children }) => (
  <div className="prompt-line-story-wrapper prompt-line-story-wrapper--autocomplete">
    {children}
  </div>
);

const Hint = ({ children }) => (
  <p className="prompt-line-story-hint">{children}</p>
);

const InlineCode = ({ children }) => <code>{children}</code>;

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
 * Mirrors InputActionsInline from @carbon/ai-chat: renders each action as a
 * standalone icon button, then uses createOverflowHandler to collapse
 * buttons that no longer fit into an overflow menu.
 */
const InlineActions = ({ actions, disabled }) => {
  const containerRef = useRef(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [measuring, setMeasuring] = useState(true);

  const hiddenActions =
    hiddenCount > 0 ? actions.slice(actions.length - hiddenCount) : [];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    setMeasuring(true);
    let handler;
    const setupRaf = requestAnimationFrame(() => {
      handler = createOverflowHandler({
        container,
        dimension: 'width',
        onChange: (visibleItems) => {
          const hidden = Math.max(0, actions.length - visibleItems.length);
          setHiddenCount(hidden);
          if (hidden === 0) setMenuOpen(false);
        },
      });
      requestAnimationFrame(() => setMeasuring(false));
    });
    return () => {
      cancelAnimationFrame(setupRaf);
      handler?.disconnect();
    };
  }, [actions]);

  return (
    <div slot="message-actions">
      <div
        ref={containerRef}
        className="prompt-line-story-inline-actions"
        style={{ position: 'relative' }}
        data-measuring={measuring ? '' : undefined}>
        {actions.map((a) => (
          <cds-icon-button
            key={a.text}
            size="sm"
            kind="ghost"
            align="top-start"
            enter-delay-ms="0"
            leave-delay-ms="0"
            disabled={disabled || a.disabled}
            onClick={a.onClick}>
            <CarbonIconSlot icon={a.icon} slot="icon" />
            <span slot="tooltip-content">{a.text}</span>
          </cds-icon-button>
        ))}

        <div
          data-offset=""
          data-hidden={hiddenCount === 0 ? '' : undefined}
          style={{ position: 'relative' }}>
          <cds-icon-button
            size="sm"
            kind="ghost"
            align="top-start"
            enter-delay-ms="0"
            leave-delay-ms="0"
            disabled={disabled || undefined}
            onClick={() => setMenuOpen((o) => !o)}>
            <CarbonIconSlot icon={OverflowMenuVertical16} slot="icon" />
            <span slot="tooltip-content">More actions</span>
          </cds-icon-button>

          {menuOpen && hiddenActions.length > 0 && (
            <cds-menu
              ref={(el) => {
                if (el) {
                  el.addEventListener('cds-menu-closed', () =>
                    setMenuOpen(false)
                  );
                }
              }}
              open
              label="More actions"
              style={{ position: 'absolute', bottom: '100%', left: 0 }}>
              {hiddenActions.map((a) => (
                <cds-menu-item
                  key={a.text}
                  label={a.text}
                  disabled={a.disabled || undefined}
                  onClick={() => {
                    setMenuOpen(false);
                    a.onClick?.();
                  }}
                />
              ))}
            </cds-menu>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Story meta
// ---------------------------------------------------------------------------

export default {
  title: 'Preview/Prompt line',
  component: PromptLine,
  argTypes: {
    ...WCMeta.argTypes,
  },
  args: { ...WCMeta.args },
};

// ---------------------------------------------------------------------------
// Default — simple textarea, no actions, no autocomplete
// ---------------------------------------------------------------------------

export const Default = {
  argTypes: {
    attached: { table: { disable: true } },
    disableDirectSend: { table: { disable: true } },
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
    attached: { table: { disable: true } },
    disableDirectSend: { table: { disable: true } },
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
          <InlineActions actions={dummyActions} disabled={disabled} />
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
          <InlineActions actions={dummyActions} disabled={disabled} />
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
  render: (args) => <CommandsAndMentionsStory {...args} />,
};

// ---------------------------------------------------------------------------
// Conversation starters — starters overlay + toggle action only
// ---------------------------------------------------------------------------

function renderStarterList({
  items,
  onSend,
  onSelect,
  onDismiss,
  attached,
  disableDirectSend,
}) {
  const el = document.createElement('cds-aichat-autocomplete');
  el.items = items;
  el.headerConfig = { showHeader: true, title: 'Prompt suggestions' };
  el.attached = attached;
  el.disableDirectSend = disableDirectSend ?? false;
  el.addEventListener('cds-aichat-autocomplete-select', (e) =>
    onSelect(e.detail.item)
  );
  el.addEventListener('cds-aichat-autocomplete-send', (e) =>
    onSend(e.detail.text)
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
  attached,
  disableDirectSend,
}) => {
  const [startersEnabled, setStartersEnabled] = useState(true);
  const [hasValidInput, setHasValidInput] = useState(false);
  const promptLineRef = useRef(null);

  const starters = useMemo(
    () => ({
      items: starterItems,
      isOn: startersEnabled,
      renderCustomList: (props) =>
        renderStarterList({ ...props, attached, disableDirectSend }),
    }),
    [startersEnabled, attached, disableDirectSend]
  );

  const extensions = useMemo(
    () => buildCarbonExtensions({ starters }),
    [starters]
  );

  const { onTriggerChange, autocompleteContent } = useChatAutocomplete({
    starters,
    promptLineRef,
    attached,
    onSelectItem: (item) => action('cds-aichat-autocomplete-select')(item),
    onSendItem: (text) => action('cds-aichat-autocomplete-send')(text),
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
    attached: { table: { disable: true } },
    disableDirectSend: { table: { disable: true } },
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
  attached,
  disableDirectSend,
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
    onSelectItem: (item) => action('cds-aichat-autocomplete-select')(item),
    onSendItem: (text) => action('cds-aichat-autocomplete-send')(text),
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
      el.inputText = inputText;
      el.disableDirectSend = disableDirectSend ?? false;
    }
  }, [inputText, disableDirectSend, autocompleteContent]);

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
        <InlineActions actions={dummyActions} disabled={disabled} />
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

// ---------------------------------------------------------------------------
// Sub-component stories — each renders the component in isolation so it can
// be explored and controlled independently. These also back the MDX
// <ArgTypes> blocks (reactDocgen can't introspect @lit/react wrappers, so
// argTypes are authored explicitly here).
// ---------------------------------------------------------------------------

// Suppresses every control inherited from the meta-level WCMeta.argTypes
// spread so sub-component stories only show their own props.
const _disableMeta = Object.fromEntries(
  Object.keys(WCMeta.argTypes).map((k) => [k, { table: { disable: true } }])
);

export const PromptLineAPI = {
  tags: ['!dev'],
  name: 'PromptLine',
  argTypes: {
    ..._disableMeta,
    placeholder: {
      control: 'text',
      description: 'Placeholder text shown when the surface is empty.',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables editing. Surface stays mounted but non-editable.',
    },
    rich: {
      control: 'boolean',
      description:
        'Upgrades the surface to the Tiptap rich editor (lazy-loaded). Required for autocomplete, mentions, and commands.',
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible label for the editing surface.',
    },
    autofocus: {
      control: 'boolean',
      description: 'Focus the surface on mount.',
    },
  },
  args: {
    placeholder: 'Ask a question...',
    disabled: false,
    rich: false,
    ariaLabel: '',
    autofocus: false,
  },
  render: ({ placeholder, disabled, rich, ariaLabel, autofocus }) => (
    <Wrapper>
      <PromptLineShell>
        <PromptLine
          slot="editor"
          placeholder={placeholder}
          disabled={disabled}
          rich={rich}
          ariaLabel={ariaLabel}
          autofocus={autofocus}
          onChange={(e) => action('cds-aichat-prompt-change')(e.detail)}
        />
        <CDSAIChatInputSendControl slot="send-control" />
      </PromptLineShell>
    </Wrapper>
  ),
};

export const PromptLineShellAPI = {
  tags: ['!dev'],
  name: 'PromptLineShell',
  argTypes: {
    ..._disableMeta,
    rounded: {
      control: 'boolean',
      description: 'Applies rounded corners to the shell border.',
    },
    expanded: {
      control: 'boolean',
      description:
        'Expanded layout: the editor fills its own full-width row; message actions and send control move to a second row beneath it.',
    },
    hasError: {
      control: 'boolean',
      description:
        'Puts the shell into the error state (red border treatment).',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the shell and all slotted content.',
    },
  },
  args: {
    rounded: false,
    expanded: false,
    hasError: false,
    disabled: false,
  },
  render: ({ rounded, expanded, hasError, disabled }) => (
    <Wrapper>
      <PromptLineShell
        rounded={rounded}
        expanded={expanded}
        hasError={hasError}
        disabled={disabled}>
        <PromptLine slot="editor" placeholder="Ask a question..." />
        <CDSAIChatInputSendControl slot="send-control" />
      </PromptLineShell>
    </Wrapper>
  ),
};

export const CDSAIChatInputSendControlAPI = {
  tags: ['!dev'],
  name: 'CDSAIChatInputSendControl',
  argTypes: {
    ..._disableMeta,
    hasValidInput: {
      control: 'boolean',
      description:
        'Enables the send button and switches to the filled send icon.',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the entire control.',
    },
    disableSend: {
      control: 'boolean',
      description: 'Disables only the send button (independent of `disabled`).',
    },
    showStopStreaming: {
      control: 'boolean',
      description: 'Swaps the send button for the stop-streaming button.',
    },
    disableStopStreaming: {
      control: 'boolean',
      description: 'Disables the stop-streaming button.',
    },
    buttonLabel: {
      control: 'text',
      description: 'Tooltip label for the send button.',
    },
    stopResponseLabel: {
      control: 'text',
      description: 'Tooltip label for the stop-streaming button.',
    },
  },
  args: {
    hasValidInput: false,
    disabled: false,
    disableSend: false,
    showStopStreaming: false,
    disableStopStreaming: false,
    buttonLabel: 'Send',
    stopResponseLabel: 'Stop response',
  },
  render: (args) => (
    <Wrapper>
      <PromptLineShell>
        <PromptLine slot="editor" placeholder="Ask a question..." />
        <CDSAIChatInputSendControl
          slot="send-control"
          {...args}
          onSend={() => action('cds-aichat-input-send')()}
          onStopStreaming={() => action('cds-aichat-input-stop-streaming')()}
        />
      </PromptLineShell>
    </Wrapper>
  ),
};

export const CDSAIChatAutocompleteAPI = {
  tags: ['!dev'],
  name: 'CDSAIChatAutocomplete',
  argTypes: {
    ..._disableMeta,
    inputText: {
      control: 'text',
      description:
        'The text already typed by the user; used to highlight the matching prefix in each item.',
    },
    attached: {
      control: 'boolean',
      description:
        'When `true`, suppresses bottom corner rounding (use when overlaying the input).',
      table: { category: '' },
    },
    disableDirectSend: {
      control: 'boolean',
      description:
        'When `false` (default), clicking an item fires `cds-aichat-autocomplete-send` and sends directly to chat. When `true`, clicking fires `cds-aichat-autocomplete-select` and inserts the item into the editor instead.',
    },
  },
  args: {
    inputText: '',
    attached: true,
    disableDirectSend: false,
  },
  render: ({ inputText, attached, disableDirectSend }) => (
    <WrapperBottom>
      <PromptLineShell rounded>
        <CDSAIChatAutocomplete
          slot="autocomplete-content"
          items={typeaheadItems.slice(0, 5)}
          inputText={inputText}
          attached={attached}
          disableDirectSend={disableDirectSend}
          onSend={(e) => action('cds-aichat-autocomplete-send')(e.detail)}
          onSelect={(e) => action('cds-aichat-autocomplete-select')(e.detail)}
          onDismiss={() => action('cds-aichat-autocomplete-dismiss')()}
        />
        <PromptLine slot="editor" placeholder="Ask a question..." />
        <CDSAIChatInputSendControl slot="send-control" />
      </PromptLineShell>
    </WrapperBottom>
  ),
};

export const CDSAIChatFileUploadsAPI = {
  tags: ['!dev'],
  name: 'CDSAIChatFileUploads',
  argTypes: {
    ..._disableMeta,
    removeFileLabel: {
      control: 'text',
      description: 'Accessible label for the remove button on each file chip.',
    },
    uploadingFileLabel: {
      control: 'text',
      description: 'Label shown while a file is uploading.',
    },
    fileRemovedLabel: {
      control: 'text',
      description: 'Screen-reader announcement when a file is removed.',
    },
    uploadSuccessLabel: {
      control: 'text',
      description: 'Screen-reader announcement on upload success.',
    },
    uploadFailureLabel: {
      control: 'text',
      description: 'Screen-reader announcement on upload failure.',
    },
  },
  args: {
    removeFileLabel: 'Remove file',
    uploadingFileLabel: 'Uploading file',
    fileRemovedLabel: 'File removed.',
    uploadSuccessLabel: 'The file was uploaded successfully.',
    uploadFailureLabel: 'There was an error uploading the file.',
  },
  render: (args) => {
    const [uploads, setUploads] = React.useState([
      {
        id: 'f1',
        file: new File([''], 'report.pdf'),
        status: FileStatusValue.EDIT,
      },
      {
        id: 'f2',
        file: new File([''], 'data.csv'),
        status: FileStatusValue.UPLOADING,
      },
    ]);
    return (
      <Wrapper>
        <PromptLineShell rounded expanded>
          <CDSAIChatFileUploads
            slot="file-uploads"
            uploads={uploads}
            {...args}
            onFileRemove={(e) => {
              action('cds-aichat-file-remove')(e.detail);
              setUploads((prev) =>
                prev.filter((u) => u.id !== e.detail.fileId)
              );
            }}
          />
          <PromptLine slot="editor" placeholder="Ask a question..." />
          <CDSAIChatInputSendControl slot="send-control" />
        </PromptLineShell>
      </Wrapper>
    );
  },
};

export const CDSAIChatErrorMessageAPI = {
  tags: ['!dev'],
  name: 'CDSAIChatErrorMessage',
  argTypes: {
    ..._disableMeta,
    title: {
      control: 'text',
      description: 'Short error title text.',
    },
    description: {
      control: 'text',
      description: 'Optional longer description shown below the title.',
    },
    collapsible: {
      control: 'boolean',
      description:
        'Whether the description can be toggled via a chevron button.',
    },
    fullscreen: {
      control: 'boolean',
      description:
        'Switches to the fullscreen layout (warning icon moves to the end of the row).',
    },
  },
  args: {
    title: 'Something went wrong.',
    description: 'Please try again or contact support.',
    collapsible: false,
    fullscreen: false,
  },
  render: (args) => (
    <Wrapper>
      <PromptLineShell rounded hasError>
        <CDSAIChatErrorMessage slot="field-messaging" {...args} />
        <PromptLine slot="editor" placeholder="Ask a question..." />
        <CDSAIChatInputSendControl slot="send-control" />
      </PromptLineShell>
    </Wrapper>
  ),
};

// ---------------------------------------------------------------------------
// Docs-only argTypes exports — no render, no args, hidden from sidebar.
// <ArgTypes of={...}> reads argTypes from the story object; these exist solely
// to give each MDX section a clean prop table with no canvas/tab chrome.
// ---------------------------------------------------------------------------

export const PromptLineArgTypes = {
  tags: ['!dev'],
  argTypes: PromptLineAPI.argTypes,
};

export const PromptLineShellArgTypes = {
  tags: ['!dev'],
  argTypes: PromptLineShellAPI.argTypes,
};

export const CDSAIChatInputSendControlArgTypes = {
  tags: ['!dev'],
  argTypes: CDSAIChatInputSendControlAPI.argTypes,
};

export const CDSAIChatAutocompleteArgTypes = {
  tags: ['!dev'],
  argTypes: CDSAIChatAutocompleteAPI.argTypes,
};

export const CDSAIChatFileUploadsArgTypes = {
  tags: ['!dev'],
  argTypes: CDSAIChatFileUploadsAPI.argTypes,
};

export const CDSAIChatErrorMessageArgTypes = {
  tags: ['!dev'],
  argTypes: CDSAIChatErrorMessageAPI.argTypes,
};
