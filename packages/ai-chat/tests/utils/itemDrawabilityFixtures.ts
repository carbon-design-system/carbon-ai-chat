/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createBaseConfig,
  getChatShadowRoot,
  renderChatAndGetInstanceWithStore,
} from '../test_helpers';
import { ChatInstance } from '../../src/types/instance/ChatInstance';
import { AppState } from '../../src/types/state/AppState';
import { MessageResponse } from '../../src/types/messaging/Messages';

/**
 * One host item, with the paths the chat can't draw it without. `before` holds items
 * that come before it in the message. `failsIn` says where an item that can't draw
 * threw before the chat checked it: while its local items were built, or in a renderer.
 */
interface DrawFixture {
  name: string;
  item: unknown;
  before?: unknown[];
  missing: string[];
  failsIn?: 'builder' | 'renderer';
}

const text = (value = 'Hello') => ({ response_type: 'text', text: value });
const card = (extra: Record<string, unknown> = {}) => ({
  response_type: 'card',
  body: [text('Card body')],
  ...extra,
});
const grid = (rows: unknown, extra: Record<string, unknown> = {}) => ({
  response_type: 'grid',
  rows,
  ...extra,
});
const cellOf = (items: unknown) => ({ cells: [{ items }] });
const showPanelButton = (panel: Record<string, unknown>) => ({
  response_type: 'button',
  button_type: 'show_panel',
  label: 'Open',
  panel: { title: 'Panel', ...panel },
});
const option = (value: string) => ({
  label: value,
  value: { input: { text: value } },
});

/** Items the chat can't draw: each one threw at the base, from the builder or a renderer. */
const MALFORMED: DrawFixture[] = [
  {
    name: 'show-panel button, panel.body not a list',
    item: showPanelButton({ body: 'Body' }),
    missing: ['panel.body'],
    failsIn: 'builder',
  },
  {
    name: 'show-panel button, panel.footer not a list',
    item: showPanelButton({ footer: 'Footer' }),
    missing: ['panel.footer'],
    failsIn: 'builder',
  },
  {
    name: 'show-panel button, null panel.body entry',
    item: showPanelButton({ body: [null] }),
    missing: ['panel.body[0]'],
    failsIn: 'builder',
  },
  {
    name: 'show-panel button, panel.body grid with no rows',
    item: showPanelButton({ body: [grid(undefined)] }),
    missing: ['panel.body[0].rows'],
    failsIn: 'builder',
  },
  {
    name: 'post-back button, null panel.body entry',
    item: {
      response_type: 'button',
      button_type: 'post_back',
      label: 'Go',
      panel: { body: [null] },
    },
    missing: ['panel.body[0]'],
    failsIn: 'builder',
  },
  {
    name: 'post-back button, panel.body not a list',
    item: {
      response_type: 'button',
      button_type: 'post_back',
      label: 'Go',
      panel: { body: 'Body' },
    },
    missing: ['panel.body'],
    failsIn: 'builder',
  },
  {
    name: 'card, body not a list',
    item: card({ body: 'Body' }),
    missing: ['body'],
    failsIn: 'builder',
  },
  {
    name: 'card, footer not a list',
    item: card({ footer: 'Footer' }),
    missing: ['footer'],
    failsIn: 'builder',
  },
  {
    name: 'card, null body entry',
    item: card({ body: [null] }),
    missing: ['body[0]'],
    failsIn: 'builder',
  },
  {
    name: 'card, null footer entry',
    item: card({ footer: [null] }),
    missing: ['footer[0]'],
    failsIn: 'builder',
  },
  {
    name: 'card, body grid with no rows',
    item: card({ body: [grid(undefined)] }),
    missing: ['body[0].rows'],
    failsIn: 'builder',
  },
  {
    name: 'carousel, no items',
    item: { response_type: 'carousel' },
    missing: ['items'],
    failsIn: 'renderer',
  },
  {
    name: 'carousel, null items',
    item: { response_type: 'carousel', items: null },
    missing: ['items'],
    failsIn: 'builder',
  },
  {
    name: 'carousel, null entry',
    item: { response_type: 'carousel', items: [null] },
    missing: ['items[0]'],
    failsIn: 'builder',
  },
  {
    name: 'carousel, card with a null body entry',
    item: { response_type: 'carousel', items: [card({ body: [null] })] },
    missing: ['items[0].body[0]'],
    failsIn: 'builder',
  },
  {
    name: 'carousel, card with a footer not a list',
    item: { response_type: 'carousel', items: [card({ footer: 'Footer' })] },
    missing: ['items[0].footer'],
    failsIn: 'builder',
  },
  {
    name: 'grid, no rows',
    item: grid(undefined),
    missing: ['rows'],
    failsIn: 'builder',
  },
  {
    name: 'grid, null row',
    item: grid([null]),
    missing: ['rows[0]'],
    failsIn: 'builder',
  },
  {
    name: 'grid, row with no cells',
    item: grid([{}]),
    missing: ['rows[0].cells'],
    failsIn: 'builder',
  },
  {
    name: 'grid, null cell',
    item: grid([{ cells: [null] }]),
    missing: ['rows[0].cells[0]'],
    failsIn: 'builder',
  },
  {
    name: 'grid, cell with no items',
    item: grid([{ cells: [{}] }]),
    missing: ['rows[0].cells[0].items'],
    failsIn: 'builder',
  },
  {
    name: 'grid, null cell item',
    item: grid([cellOf([null])]),
    missing: ['rows[0].cells[0].items[0]'],
    failsIn: 'builder',
  },
  {
    name: 'grid, cell item that cannot draw',
    item: grid([cellOf([grid(undefined)])]),
    missing: ['rows[0].cells[0].items[0].rows'],
    failsIn: 'builder',
  },
  {
    name: 'grid, column width not a string',
    item: grid([cellOf([text()])], { columns: [{ width: 2 }] }),
    missing: ['columns[0].width'],
    failsIn: 'renderer',
  },
  {
    name: 'option, no options',
    item: { response_type: 'option', title: 'Pick one' },
    missing: ['options'],
    failsIn: 'renderer',
  },
  {
    name: 'option, null entry',
    item: { response_type: 'option', title: 'Pick one', options: [null] },
    missing: ['options[0]'],
    failsIn: 'renderer',
  },
  {
    name: 'option, dropdown entry with no value.input',
    item: {
      response_type: 'option',
      title: 'Pick one',
      preference: 'dropdown',
      options: [{ label: 'One' }],
    },
    missing: ['options[0].value.input'],
    failsIn: 'renderer',
  },
  {
    name: 'option, more than four entries, one with no value',
    item: {
      response_type: 'option',
      title: 'Pick one',
      options: [
        option('One'),
        option('Two'),
        option('Three'),
        option('Four'),
        { label: 'Five' },
      ],
    },
    missing: ['options[4].value.input'],
    failsIn: 'renderer',
  },
  {
    name: 'conversational_search, citations not a list',
    item: {
      response_type: 'conversational_search',
      text: 'Answer',
      citations: 'Cited',
    },
    missing: ['citations'],
    failsIn: 'renderer',
  },
  {
    name: 'conversational_search, null citation',
    item: {
      response_type: 'conversational_search',
      text: 'Answer',
      citations: [null],
    },
    missing: ['citations[0]'],
    failsIn: 'renderer',
  },
  {
    name: 'system, after a null item in the message',
    item: { response_type: 'system', title: 'Joined' },
    before: [null],
    missing: ['output.generic[0]'],
    failsIn: 'renderer',
  },
];

/** Items the chat draws today, though some lack fields their types call required. */
const LOOSE: DrawFixture[] = [
  { name: 'text', item: text(), missing: [] },
  {
    name: 'inline_error, no text',
    item: { response_type: 'inline_error' },
    missing: [],
  },
  {
    name: 'user_defined',
    item: { response_type: 'user_defined', user_defined: { kind: 'x' } },
    missing: [],
  },
  { name: 'unknown type', item: { response_type: 'mystery' }, missing: [] },
  { name: 'no response_type', item: { text: 'Hello' }, missing: [] },
  { name: 'image, no source', item: { response_type: 'image' }, missing: [] },
  { name: 'video, no source', item: { response_type: 'video' }, missing: [] },
  { name: 'audio, no source', item: { response_type: 'audio' }, missing: [] },
  { name: 'iframe, no source', item: { response_type: 'iframe' }, missing: [] },
  { name: 'date', item: { response_type: 'date' }, missing: [] },
  {
    name: 'preview_card, no workspace_id',
    item: { response_type: 'preview_card', title: 'Preview' },
    missing: [],
  },
  {
    name: 'button, no button_type',
    item: { response_type: 'button', label: 'Go' },
    missing: [],
  },
  {
    name: 'show-panel button',
    item: showPanelButton({ body: [text()], footer: [] }),
    missing: [],
  },
  {
    name: 'show-panel button, panel card with a footer not a list',
    item: showPanelButton({ body: [card({ footer: 'Footer' })] }),
    missing: [],
  },
  { name: 'card, empty', item: { response_type: 'card' }, missing: [] },
  { name: 'card', item: card({ footer: [] }), missing: [] },
  {
    name: 'card, unsupported body item',
    item: card({ body: [{ response_type: 'option', options: 'x' }] }),
    missing: [],
  },
  {
    name: 'card, unsupported footer item',
    item: card({ footer: [text()] }),
    missing: [],
  },
  {
    name: 'carousel, empty',
    item: { response_type: 'carousel', items: [] },
    missing: [],
  },
  {
    name: 'carousel, unsupported item',
    item: { response_type: 'carousel', items: [text()] },
    missing: [],
  },
  {
    name: 'carousel',
    item: { response_type: 'carousel', items: [card(), card()] },
    missing: [],
  },
  { name: 'grid, empty', item: grid([]), missing: [] },
  { name: 'grid, no columns', item: grid([cellOf([text()])]), missing: [] },
  {
    name: 'grid, unsupported cell item',
    item: grid([cellOf([card()])]),
    missing: [],
  },
  {
    name: 'grid, string column width',
    item: grid([cellOf([text()])], { columns: [{ width: '1' }] }),
    missing: [],
  },
  {
    name: 'grid, columns not a list',
    item: grid([cellOf([text()])], { columns: 'Wide' }),
    missing: [],
  },
  {
    name: 'option, button-mode entries with no value',
    item: {
      response_type: 'option',
      title: 'Pick one',
      options: [{ label: 'One' }, { label: 'Two' }],
    },
    missing: [],
  },
  {
    name: 'option, dropdown',
    item: {
      response_type: 'option',
      title: 'Pick one',
      preference: 'dropdown',
      options: [option('One'), option('Two')],
    },
    missing: [],
  },
  {
    name: 'conversational_search, no text',
    item: { response_type: 'conversational_search', citations: [] },
    missing: [],
  },
  {
    name: 'conversational_search, empty citations',
    item: {
      response_type: 'conversational_search',
      text: 'Answer',
      citations: '',
    },
    missing: [],
  },
  {
    name: 'system, no title',
    item: { response_type: 'system' },
    missing: [],
  },
];

/** The id of every fixture message. */
const MESSAGE_ID = 'fixture-message';

/** A message holding the fixture's item, after anything in `before`. */
const fixtureMessage = (
  fixture: DrawFixture,
  id = MESSAGE_ID
): MessageResponse =>
  ({
    id,
    output: { generic: [...(fixture.before ?? []), fixture.item] },
  }) as unknown as MessageResponse;

/** What a host sees after one write: whether it rejected, what `onError` got, and what drew. */
interface WriteOutcome {
  rejects: boolean;
  shownItems: number;
  reports: string[];
  failedItems: number;
  catastrophic: boolean;
}

/** Lets React commit and the announcer's microtask flush. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 60));

/** Renders an open chat that reports to the returned `onError` mock. */
async function renderOpenChat(onError = jest.fn()) {
  const base = createBaseConfig();
  const rendered = await renderChatAndGetInstanceWithStore({
    ...base,
    openChatByDefault: true,
    messaging: { ...base.messaging, skipWelcome: true },
    onError,
  } as any);
  await settle();
  return { ...rendered, onError };
}

/**
 * Text from the chat. Message text renders inside `cds-aichat-markdown`'s own shadow
 * root, which a plain `textContent` doesn't reach.
 */
function chatText(root: ParentNode | null = getChatShadowRoot()): string {
  let text = '';
  root?.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
    } else if (node instanceof Element) {
      text += chatText(node.shadowRoot) + chatText(node);
    }
  });
  return text;
}

/** How many message items show the chat's "failed to draw" error. */
const failedItemCount = () =>
  getChatShadowRoot()?.querySelectorAll('.cds-aichat--message--inline-error')
    .length ?? 0;

/** The shown local items of a message, in order. */
function itemsOf(store: { getState: () => AppState }, messageID: string) {
  const state = store.getState();
  return state.assistantMessageState.localMessageIDs
    .map((id) => state.allMessageItemsByID[id])
    .filter((item) => item?.fullMessageID === messageID);
}

/**
 * Renders an open chat, runs `write` against it, and records what the host sees. A
 * render error React can't contain is kept from failing the test, since recording it is
 * the point.
 */
async function observeWrite(
  write: (instance: ChatInstance) => Promise<unknown>
): Promise<WriteOutcome> {
  const swallow = (event: ErrorEvent) => event.preventDefault();
  window.addEventListener('error', swallow);
  const { instance, store, onError } = await renderOpenChat();
  let rejects = false;
  try {
    await write(instance);
  } catch {
    rejects = true;
  }
  await settle();
  window.removeEventListener('error', swallow);
  return {
    rejects,
    shownItems: itemsOf(store, MESSAGE_ID).length,
    reports: onError.mock.calls.map(
      ([data]) => `${data.errorType}: ${data.message}`
    ),
    failedItems: failedItemCount(),
    catastrophic: Boolean(store.getState().catastrophicErrorType),
  };
}

export {
  MESSAGE_ID,
  DrawFixture,
  LOOSE,
  MALFORMED,
  WriteOutcome,
  chatText,
  failedItemCount,
  fixtureMessage,
  itemsOf,
  observeWrite,
  renderOpenChat,
  settle,
};
