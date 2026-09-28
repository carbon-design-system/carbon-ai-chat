/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Replace the composer with renderWriteableElements and CUSTOM_PROMPT_LINE.
 * Start at App, then Composer: send uses the host draft, while
 * STATE_CHANGE supplies the public loading and upload state. The host owns
 * labels, errors, keyboard behavior, busy state, and any upload integration.
 */
import {
  BusEventType,
  ChatCustomElement,
  type ChatInstance,
  type PublicConfig,
  WriteableElementName,
} from '@carbon/ai-chat';
import PromptLine from '@carbon/ai-chat-components/es/react/prompt-line.js';
import PromptLineShell from '@carbon/ai-chat-components/es/react/prompt-line-shell.js';
import InputSendControl from '@carbon/ai-chat-components/es/react/input-send-control.js';
import type {
  InputChangeEventDetail,
  PromptLineElement,
} from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { customSendMessage } from './customSendMessage';
import { isSendBlocked } from './isSendBlocked';
import './composer.css';

const config: PublicConfig = {
  messaging: { customSendMessage },
  layout: { showFrame: false },
  openChatByDefault: true,
};

function Composer({ instance }: { instance: ChatInstance | null }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(true);
  const [error, setError] = useState('');
  const sending = useRef(false);
  const input = useRef<PromptLineElement>(null);

  useEffect(() => {
    if (!instance) {
      return;
    }
    const update = () => setBlocked(isSendBlocked(instance.getState()));
    const subscription = { type: BusEventType.STATE_CHANGE, handler: update };
    update();
    instance.on(subscription);
    return () => {
      instance.off(subscription);
    };
  }, [instance]);

  async function send() {
    if (
      !instance ||
      sending.current ||
      !text.trim() ||
      isSendBlocked(instance.getState())
    ) {
      return;
    }
    // Keep focus on a control that remains focusable while the send is pending.
    input.current?.focus();
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      await instance.send({
        input: {
          text,
          structured_data: { fields: [{ id: 'composer', value: 'custom' }] },
        },
      });
      setText('');
    } catch {
      setError('Message not sent. Your draft is saved. Try again.');
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="composer" aria-label="Custom composer" aria-busy={busy}>
      <PromptLineShell rounded>
        <PromptLine
          ref={input}
          slot="editor"
          ariaLabel="Your message"
          placeholder="Write your message"
          content={text}
          disabled={busy}
          onChange={(event: CustomEvent<InputChangeEventDetail>) =>
            setText(event.detail.rawValue)
          }
          onSendIntent={send}
        />
        <InputSendControl
          slot="send-control"
          buttonLabel="Send message"
          hasValidInput={Boolean(text.trim())}
          disableSend={busy || blocked}
          onSend={send}
        />
      </PromptLineShell>
      <p>Enter sends. Shift+Enter adds a new line.</p>
      <p role="status">
        {busy ? 'Sending…' : blocked ? 'Waiting for chat to be ready.' : ''}
      </p>
      <p role="alert">{error}</p>
    </section>
  );
}

function App() {
  const [instance, setInstance] = useState<ChatInstance | null>(null);
  const [custom, setCustom] = useState(true);
  const onBeforeRender = useCallback(
    (chat: ChatInstance) => setInstance(chat),
    []
  );
  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={custom}
          onChange={(event) => setCustom(event.target.checked)}
        />
        Use custom prompt line
      </label>
      <ChatCustomElement
        className="chat-custom-element"
        {...config}
        onBeforeRender={onBeforeRender}
        renderWriteableElements={{
          // Content enables replacement. Null restores the built-in draft.
          [WriteableElementName.CUSTOM_PROMPT_LINE]: custom ? (
            <Composer instance={instance} />
          ) : null,
        }}
      />
    </>
  );
}

createRoot(document.querySelector('#root') as Element).render(<App />);
