/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Shared setup for the browser scroll tests. They mount a real chat, stream
 * responses through the public messaging API, and read real scroll geometry,
 * so nothing here stubs layout.
 */

import React from 'react';
import { render } from '@testing-library/react';

import '../../../web-components/cds-aichat-container';
import { ChatContainer } from '../../../react/ChatContainer';
import { ChatCustomElement } from '../../../react/ChatCustomElement';
import type { ChatContainerProps } from '../../../types/component/ChatContainer';
import type { ChatInstance } from '../../../types/instance/ChatInstance';
import type { CustomSendMessageOptions } from '../../../types/config/MessagingConfig';
import { MessageState } from '../../../types/config/MessagingConfig';
import type {
  CarouselItem,
  CompleteItemChunk,
  GenericItem,
  MessageRequest,
  MessageResponse,
  PartialItemChunk,
  ReasoningStep,
} from '../../../types/messaging/Messages';
import { MessageResponseTypes } from '../../../types/messaging/Messages';
import { BusEventType } from '../../../types/events/eventBusTypes';
import { ViewType } from '../../../types/instance/apiTypes';
import { getChatHost } from './render';
import { createBaseConfig } from './config';

/**
 * How a response reaches the chat: `addMessage` / `addMessageChunk`, or
 * `upsertMessage` snapshots.
 */
export type SendMode = 'addMessage' | 'upsertMessage';

export const SEND_MODES: SendMode[] = ['addMessage', 'upsertMessage'];

/** Delay between streamed words. */
const WORD_DELAY = 5;

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

// ---------------------------------------------------------------------------
// Response content
// ---------------------------------------------------------------------------

const TEXT = `Carbon is a **chemical element** with the *atomic number* 6 and symbol **C**. \`C + O₂ → CO₂\` represents one of carbon's most fundamental reactions.

Carbon forms [covalent bonds](https://ibm.com) through electron sharing and creates carbon chains that are essential for organic molecules.
`;

/** Long mixed markdown, like the response a plain text request gets. */
export const MARKDOWN = `
${TEXT}
---
### Carbon elements
| Allotrope | Form | Notes |
|----------|------|-------|
| Diamond | Crystalline | Hardest natural material |
| Graphite | Layered | Used in pencils and lubricants |
| Graphene | Single layer | Excellent conductivity |
---
# Header 1 sized header
${TEXT}

## Header 2 sized header
${TEXT}

### Header 3 sized header
${TEXT}
---
> Carbon is the **fourth most abundant** element in the *observable universe* by mass after hydrogen, helium, and oxygen. Carbon's unique tetravalent bonding capability enables complex molecular architectures.
>
> The carbon cycle describes how carbon moves between Earth's atmosphere, oceans, and living organisms through photosynthesis and respiration.
---
1. Carbon bonding types
  a. Single bonds (sp³)
  b. Double bonds (sp²)
2. Triple bonds (sp)
3. Aromatic bonding
---
- Carbon allotropes
- Diamond
- Graphite
  - Graphene layers
  - Hexagonal structure
- Fullerenes
- Carbon nanotubes
---
`;

/** Several fenced code blocks, which mount code editors as they stream. */
export const CODE = `\`\`\`
from dataclasses import dataclass

class Greeter:
    """Doc string referencing https://example.com"""
    def __init__(self, name: str) -> None:
        self.name = name

    def greet(self) -> str:
        for attempt in range(3):
            if attempt == 1:
                break
        return f"Hello {self.name}!"
\`\`\`

\`\`\`
:root {
  --brand-color: #0f62fe;
}

.hero {
  color: var(--brand-color);
  margin: 1rem !important;
}

@media screen and (min-width: 40rem) {
  .hero {
    padding: 2rem;
  }
}
\`\`\`

\`\`\`
#define MAX(a, b) ((a) > (b) ? (a) : (b))
char initial = 'A';
enum role { ROLE_USER, ROLE_ADMIN };
\`\`\``;

export const REASONING_STEPS: ReasoningStep[] = [
  {
    title: 'Interpret the request',
    content:
      "Identified the user's main objective and clarified any constraints so downstream steps share the same intent.",
  },
  { title: 'Considering' },
  {
    title: 'Check supporting documents',
    content: `Gathered references from the mock knowledge base, prioritizing the latest entries.

\`\`\`json
{ "tool": "search_docs", "args": { "query": "latest release notes", "limit": 3 } }
\`\`\``,
  },
  {
    title: 'Compose the response',
    content:
      'Structured the final answer with plain-language explanations and cited the most trustworthy sources.',
  },
];

/** The text a `user_defined` response carries. */
const USER_DEFINED_TEXT = `Some text that came from the server inside the user_defined object. Bacon ipsum dolor amet salami capicola chislic, meatball tail beef ham hock brisket cow ground round chuck. Turkey pork loin pastrami, ribeye jerky meatball drumstick kielbasa corned beef shankle picanha. Spare ribs leberkas hamburger strip steak beef ribs sirloin brisket capicola, sausage meatball drumstick ham swine alcatra.`;

function card(title: string, body: string, price: string) {
  return {
    response_type: MessageResponseTypes.CARD,
    body: [
      { response_type: MessageResponseTypes.TEXT, text: `##### ${title}` },
      { response_type: MessageResponseTypes.TEXT, text: body },
      { response_type: MessageResponseTypes.TEXT, text: `#### ${price}` },
    ],
  } as CarouselItem['items'][number];
}

/** The three cards a streamed carousel adds one at a time. */
const CAROUSEL_CARDS: CarouselItem['items'] = [
  card(
    'Peach Colored Blouse',
    "I'm baby beard cornhole gatekeep, lyft hoodie disrupt locavore raw denim meggings.",
    '$59.99'
  ),
  card(
    'Green Leopard Jacket',
    'Street art banjo vaporware, hot chicken marxism art party neutra quinoa sustainable activated charcoal.',
    '$29.99'
  ),
  card(
    'Yellow Wool Hat',
    'Succulents skateboard adaptogen solarpunk semiotics, viral locavore palo santo.',
    '$29.99'
  ),
];

// ---------------------------------------------------------------------------
// Sending responses
// ---------------------------------------------------------------------------

type Identified = MessageResponse & { id: string };

interface ResponseStream {
  partial: (chunk: PartialItemChunk) => Promise<void>;
  complete: (chunk: CompleteItemChunk) => Promise<void>;
  final: (finalResponse: Identified) => Promise<void>;
}

export function sendResponse(
  instance: ChatInstance,
  message: Identified,
  mode: SendMode
) {
  return mode === 'upsertMessage'
    ? instance.messaging.upsertMessage(
        message.id,
        MessageState.COMPLETE,
        () => message
      )
    : instance.messaging.addMessage(message);
}

type StreamedItem = GenericItem & {
  text?: string;
  user_defined?: Record<string, unknown>;
};

/**
 * Writes a stream in either mode. In upsert mode it keeps the running
 * snapshot, appending each partial item's text, and sends it whole each time.
 */
function createResponseStream(
  instance: ChatInstance,
  responseID: string,
  mode: SendMode
): ResponseStream {
  if (mode === 'addMessage') {
    return {
      partial: (chunk) => instance.messaging.addMessageChunk(chunk),
      complete: (chunk) => instance.messaging.addMessageChunk(chunk),
      final: (finalResponse) =>
        instance.messaging.addMessageChunk({ final_response: finalResponse }),
    };
  }
  let snapshot: Identified = { id: responseID, output: { generic: [] } };
  const write = (
    item: StreamedItem,
    combine: (previous: StreamedItem) => StreamedItem,
    chunk: PartialItemChunk | CompleteItemChunk
  ) => {
    const items = (snapshot.output.generic ?? []) as StreamedItem[];
    const index = items.findIndex(
      (existing) =>
        existing.streaming_metadata?.id === item.streaming_metadata?.id
    );
    const generic =
      index === -1
        ? [...items, item]
        : items.map((existing, at) =>
            at === index ? combine(existing) : existing
          );
    const options = chunk.partial_response?.message_options;
    snapshot = {
      ...snapshot,
      request_id: chunk.streaming_metadata?.request_id ?? snapshot.request_id,
      output: { ...snapshot.output, generic },
      ...(options
        ? {
            message_options: {
              ...snapshot.message_options,
              ...options,
            } as MessageResponse['message_options'],
          }
        : {}),
    };
    const next = snapshot;
    return instance.messaging.upsertMessage(
      responseID,
      MessageState.STREAMING,
      () => next
    );
  };
  return {
    partial: (chunk) => {
      const item = chunk.partial_item as StreamedItem;
      return write(
        item,
        (previous) => {
          const next = { ...previous, ...item };
          if (previous.response_type === MessageResponseTypes.USER_DEFINED) {
            next.user_defined = {
              ...previous.user_defined,
              ...item.user_defined,
              text: `${previous.user_defined?.text ?? ''}${item.user_defined?.text ?? ''}`,
            };
          } else {
            next.text = `${previous.text ?? ''}${item.text ?? ''}`;
          }
          return next;
        },
        chunk
      );
    },
    complete: (chunk) =>
      write(
        chunk.complete_item as StreamedItem,
        (previous) => ({ ...previous, ...chunk.complete_item }) as StreamedItem,
        chunk
      ),
    final: (finalResponse) =>
      instance.messaging.upsertMessage(
        responseID,
        MessageState.COMPLETE,
        () => finalResponse
      ),
  };
}

let nextResponseID = 0;

function responseID() {
  nextResponseID += 1;
  return `scroll-response-${nextResponseID}`;
}

/**
 * Streams `text` word by word, optionally after streaming reasoning steps,
 * then completes the item and sends the final response.
 */
export async function streamText(
  instance: ChatInstance,
  mode: SendMode,
  requestID: string,
  text: string,
  reasoningSteps?: ReasoningStep[]
) {
  const id = responseID();
  const stream = createResponseStream(instance, id, mode);
  const streaming_metadata = { response_id: id, request_id: requestID };
  const textItem = (value: string) =>
    ({
      response_type: MessageResponseTypes.TEXT,
      text: value,
      streaming_metadata: { id: '1', cancellable: true },
    }) as GenericItem;
  if (reasoningSteps) {
    const shown: ReasoningStep[] = [];
    for (const step of reasoningSteps) {
      await sleep(WORD_DELAY);
      shown.push({ ...step, content: step.content ? '' : undefined });
      const emit = () =>
        stream.partial({
          partial_item: textItem(''),
          streaming_metadata,
          partial_response: {
            message_options: {
              reasoning: { steps: shown.map((entry) => ({ ...entry })) },
            },
          },
        });
      await emit();
      let partial = '';
      const text = typeof step.content === 'string' ? step.content : '';
      for (const token of text.match(/\S+\s*/g) ?? []) {
        partial += token;
        shown[shown.length - 1] = { ...step, content: partial };
        await sleep(WORD_DELAY);
        await emit();
      }
    }
  }
  for (const word of text.split(' ')) {
    await sleep(WORD_DELAY);
    await stream.partial({
      partial_item: textItem(`${word} `),
      streaming_metadata,
    });
  }
  const reasoning = reasoningSteps ? { steps: reasoningSteps } : undefined;
  const completeItem = {
    response_type: MessageResponseTypes.TEXT,
    text,
    streaming_metadata: { id: '1' },
  } as GenericItem;
  await stream.complete({
    complete_item: completeItem,
    streaming_metadata,
    partial_response: reasoning
      ? { message_options: { reasoning } }
      : undefined,
  });
  await stream.final({
    id,
    request_id: requestID,
    output: { generic: [completeItem] },
    message_options: reasoning ? { reasoning } : undefined,
  });
}

/** Sends the two `user_defined` items a non-streamed custom response has. */
export function sendUserDefined(
  instance: ChatInstance,
  mode: SendMode,
  requestID: string
) {
  return sendResponse(
    instance,
    {
      id: responseID(),
      request_id: requestID,
      output: {
        generic: [
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: {
              user_defined_type: 'green',
              text: USER_DEFINED_TEXT,
            },
          },
          {
            response_type: MessageResponseTypes.USER_DEFINED,
            user_defined: { user_defined_type: 'green', text: 'As full width' },
            full_width: true,
          },
        ],
      },
    },
    mode
  );
}

/** Streams a `user_defined` item word by word. */
export async function streamUserDefined(
  instance: ChatInstance,
  mode: SendMode,
  requestID: string
) {
  const id = responseID();
  const stream = createResponseStream(instance, id, mode);
  const streaming_metadata = { response_id: id, request_id: requestID };
  for (const word of USER_DEFINED_TEXT.split(' ')) {
    await sleep(WORD_DELAY);
    await stream.partial({
      partial_item: {
        response_type: MessageResponseTypes.USER_DEFINED,
        user_defined: { user_defined_type: 'green', text: `${word},` },
        streaming_metadata: { id: '1', cancellable: true },
      } as GenericItem,
      streaming_metadata,
    });
  }
  const completeItem = {
    response_type: MessageResponseTypes.USER_DEFINED,
    user_defined: { user_defined_type: 'green', text: USER_DEFINED_TEXT },
    streaming_metadata: { id: '1' },
  } as GenericItem;
  await stream.complete({ complete_item: completeItem, streaming_metadata });
  await stream.final({
    id,
    request_id: requestID,
    output: { generic: [completeItem] },
  });
}

/**
 * Streams a carousel through `upsertMessage`, adding one card per STREAMING
 * snapshot, then completes it. `upsertMessage` shows the carousel while it
 * streams; `addMessageChunk` holds the whole item until its final response.
 */
export async function streamCarousel(
  instance: ChatInstance,
  requestID: string,
  cardDelay: number
) {
  const id = responseID();
  const carousel = (count: number) =>
    ({
      response_type: MessageResponseTypes.CAROUSEL,
      items: CAROUSEL_CARDS.slice(0, count),
      streaming_metadata: { id: '1' },
    }) as CarouselItem;
  for (let count = 1; count <= CAROUSEL_CARDS.length; count++) {
    await sleep(cardDelay);
    await instance.messaging.upsertMessage(id, MessageState.STREAMING, () => ({
      id,
      request_id: requestID,
      output: { generic: [carousel(count)] },
    }));
  }
  await instance.messaging.upsertMessage(id, MessageState.COMPLETE, () => ({
    id,
    request_id: requestID,
    output: { generic: [carousel(CAROUSEL_CARDS.length)] },
  }));
}

// ---------------------------------------------------------------------------
// Mounting
// ---------------------------------------------------------------------------

/** Answers one request. The welcome request has no text. */
export type Responder = (
  text: string,
  request: MessageRequest,
  options: CustomSendMessageOptions,
  instance: ChatInstance
) => Promise<void> | void;

/**
 * A user_defined renderer with external styles, like a host's custom
 * response, so tests can resize it.
 */
function renderUserDefinedResponse({
  messageItem,
  partialItems,
}: Parameters<
  NonNullable<ChatContainerProps['renderUserDefinedResponse']>
>[0]) {
  const text = messageItem
    ? (messageItem.user_defined?.text as string)
    : partialItems?.map((item) => item.user_defined?.text).join('');
  return React.createElement(
    'div',
    {
      className: 'external',
      style: {
        marginTop: '1rem',
        background: 'green',
        color: '#fff',
        padding: '1rem',
      },
    },
    React.createElement(
      'p',
      null,
      'This is a user_defined response type with external styles hosted inside its own slot.'
    ),
    React.createElement(
      'p',
      null,
      `The following is some text passed along for use by the back-end: ${text}.`
    )
  );
}

export interface ScrollChat {
  instance: ChatInstance;
  root: ShadowRoot;
  /** `.cds-aichat--messages`. */
  list: HTMLElement;
  /** The list's scroll container. */
  scroller: HTMLElement;
  unmount: () => void;
}

const HOST_STYLE_ID = 'scroll-test-host-style';

/**
 * Mounts the chat open, with its messages list ready. `layout: 'fullscreen'`
 * fills a fixed 928x672 element through `ChatCustomElement`; `'float'` uses
 * `ChatContainer`'s own floating window.
 */
export async function mountScrollChat(
  respond: Responder,
  {
    layout = 'fullscreen',
    config = {},
  }: {
    layout?: 'fullscreen' | 'float';
    config?: Partial<ChatContainerProps>;
  } = {}
): Promise<ScrollChat> {
  if (!document.getElementById(HOST_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = HOST_STYLE_ID;
    style.textContent =
      '.scroll-test-host { position: fixed; bottom: 0; inset-inline-end: 0; width: 928px; height: 672px; }';
    document.head.appendChild(style);
  }
  let instance: ChatInstance;
  let resolveRendered: () => void;
  const rendered = new Promise<void>((resolve) => {
    resolveRendered = resolve;
  });
  const props: ChatContainerProps = {
    ...createBaseConfig(),
    openChatByDefault: true,
    shouldTakeFocusIfOpensAutomatically: false,
    launcher: { isOn: layout === 'float' },
    layout: layout === 'fullscreen' ? { showFrame: false } : undefined,
    ...config,
    messaging: {
      customSendMessage: async (request, options, chat) => {
        if (request.input.message_type !== 'event') {
          await respond(request.input.text ?? '', request, options, chat);
        }
      },
      ...config.messaging,
    },
    renderUserDefinedResponse,
    onBeforeRender: (chat) => {
      instance = chat;
    },
    onAfterRender: () => resolveRendered(),
  };
  const view = render(
    layout === 'fullscreen'
      ? React.createElement(ChatCustomElement, {
          ...props,
          className: 'scroll-test-host',
        })
      : React.createElement(ChatContainer, props)
  );
  await rendered;
  const root = getChatHost().shadowRoot;
  let list: HTMLElement | null = null;
  while (!list) {
    if (!instance.getState().viewState.mainWindow) {
      await instance.changeView(ViewType.MAIN_WINDOW);
    }
    await nextFrame();
    list = root.querySelector<HTMLElement>('.cds-aichat--messages');
  }
  return {
    instance,
    root,
    list,
    scroller: list.parentElement,
    unmount: () => view.unmount(),
  };
}

/**
 * Whether `root`, or a shadow root under it, has a text node that includes
 * `text`.
 */
export function hasText(root: Node, text: string): boolean {
  if (root.nodeType === Node.TEXT_NODE) {
    return root.textContent.includes(text);
  }
  const { shadowRoot } = root as Element;
  return (
    (shadowRoot ? hasText(shadowRoot, text) : false) ||
    Array.from(root.childNodes).some((child) => hasText(child, text))
  );
}

/**
 * Sends `text` and resolves once the chat has received its response and its
 * scroll position has settled, as a user waiting for an answer would.
 */
export async function sendAndReceive(
  { instance, list, scroller }: ScrollChat,
  text: string
) {
  const received = new Promise<void>((resolve) => {
    instance.once({ type: BusEventType.RECEIVE, handler: () => resolve() });
  });
  await instance.messaging.send(text);
  await received;
  await settle(() => [scroller.scrollTop, list.offsetHeight]);
}

/**
 * Resolves once `read` returns the same value for 10 frames in a row, and at
 * least 200ms have passed: the chat's throttled scroll work runs at most
 * 150ms apart.
 */
export async function settle(read: () => unknown) {
  let previous = JSON.stringify(read());
  let stable = 0;
  const started = performance.now();
  while (stable < 10 || performance.now() - started < 200) {
    await nextFrame();
    const current = JSON.stringify(read());
    stable = current === previous ? stable + 1 : 0;
    previous = current;
  }
}
