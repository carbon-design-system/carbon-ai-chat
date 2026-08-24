/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A file uploaded through `UploadConfig.onFileUpload` lands on
 * `input.structured_data` of the outgoing request, which is an ordinary part of a
 * `MessageRequest` — so it round-trips through a `HistoryItem` with no extra
 * persistence. These tests pin that round trip end to end: the field survives
 * hydration, and the restored bubble renders a chip for it.
 *
 * A restored request may carry attachments and no text at all, which is why the
 * bubble's text-item gate had to be relaxed. Two of these tests pin that.
 */

import { waitFor } from '@testing-library/react';

import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../../test_helpers';
import {
  MessageRequest,
  MessageResponseTypes,
} from '../../../../src/types/messaging/Messages';
import { HistoryItem } from '../../../../src/types/messaging/History';

const REFERENCE = {
  type: 'reference',
  id: 'doc-1',
  name: 'report.pdf',
  mime_type: 'application/pdf',
};

/** A restored user request carrying one `file`-typed structured field. */
function requestWithFile(
  input: Record<string, unknown>,
  id = 'hist-1'
): HistoryItem {
  return {
    message: {
      id,
      input: {
        ...input,
        structured_data: {
          fields: [{ id: 'file', type: 'file', value: REFERENCE }],
        },
      },
    },
    time: '2026-07-30T12:00:00.000Z',
  } as unknown as HistoryItem;
}

function textResponse(text: string, id: string): HistoryItem {
  return {
    message: {
      id,
      output: {
        generic: [{ response_type: MessageResponseTypes.TEXT, text }],
      },
    },
    time: '2026-07-30T12:00:01.000Z',
  } as unknown as HistoryItem;
}

/**
 * The chat mounts its React tree inside the `cds-aichat-react` shadow root, so
 * transcript queries have to go through it rather than through `document`.
 */
function chatShadowRoot(): ShadowRoot | null {
  return document.querySelector('cds-aichat-react')?.shadowRoot ?? null;
}

/** Chips rendered in the transcript, in DOM order. */
function renderedChips(): HTMLElement[] {
  return Array.from(
    chatShadowRoot()?.querySelectorAll<HTMLElement>(
      'cds-aichat-file-upload-item'
    ) ?? []
  );
}

/**
 * Text from the transcript. Walks nested shadow roots, because message text is
 * rendered by `cds-aichat-markdown`, which has a shadow root of its own — a plain
 * `textContent` on the chat's shadow root stops short of it.
 */
function deepText(root: ParentNode | null): string {
  if (!root) {
    return '';
  }

  let text = '';
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
      return;
    }
    if (node instanceof Element) {
      text += deepText(node.shadowRoot);
      text += deepText(node);
    }
  });

  return text;
}

function transcriptText(): string {
  return deepText(chatShadowRoot());
}

function chipAttachments(): unknown[] {
  return renderedChips().map(
    (chip) => (chip as unknown as { upload: unknown }).upload
  );
}

async function bootWithHistory(historyItems: HistoryItem[]) {
  const base = createBaseConfig();
  const config = {
    ...base,
    // Boot hydration, and therefore customLoadHistory, only runs when the main
    // window opens.
    openChatByDefault: true,
    messaging: {
      ...base.messaging,
      customLoadHistory: jest.fn(async () => historyItems),
    },
  };

  return renderChatAndGetInstanceWithStore(config as never);
}

describe('restoring file attachments from history', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('renders a chip for a restored request carrying a file field', async () => {
    await bootWithHistory([
      requestWithFile({ text: 'Here is the report.' }),
      textResponse('Thanks, got it.', 'hist-2'),
    ]);

    await waitFor(
      () => {
        expect(renderedChips()).toHaveLength(1);
      },
      { timeout: 5000 }
    );

    expect(chipAttachments()).toEqual([
      { id: 'doc-1', name: 'report.pdf', mimeType: 'application/pdf' },
    ]);
    expect(transcriptText()).toContain('Here is the report.');
  });

  it('renders attachments for a restored request with no text', async () => {
    // Pins the relaxed render gate: before this change `renderRequest` returned
    // null for any item whose `text` was undefined, so the attachment was lost.
    await bootWithHistory([requestWithFile({})]);

    await waitFor(
      () => {
        expect(renderedChips()).toHaveLength(1);
      },
      { timeout: 5000 }
    );
  });

  it('renders attachments for a restored request with empty text', async () => {
    // `''` and `undefined` take different paths through `isTextItem`, so both are
    // covered. Empty text renders no heading, only the chip.
    await bootWithHistory([requestWithFile({ text: '' })]);

    await waitFor(
      () => {
        expect(renderedChips()).toHaveLength(1);
      },
      { timeout: 5000 }
    );
  });

  it('preserves structured_data on the stored message', async () => {
    // Nothing in the history pipeline validates or strips `structured_data`; this
    // pins that, since the rendering depends on it arriving intact.
    const { store } = await bootWithHistory([
      requestWithFile({ text: 'Here is the report.' }),
    ]);

    await waitFor(
      () => {
        expect(store.getState().allMessagesByID['hist-1']).toBeDefined();
      },
      { timeout: 5000 }
    );

    const stored = store.getState().allMessagesByID[
      'hist-1'
    ] as unknown as MessageRequest;

    expect(stored.input.structured_data).toEqual({
      fields: [{ id: 'file', type: 'file', value: REFERENCE }],
    });
  });

  it('skips a malformed file field without breaking hydration', async () => {
    const malformed = {
      message: {
        id: 'hist-1',
        input: {
          text: 'This one is broken.',
          structured_data: {
            fields: [{ id: 'file', type: 'file', value: 'oops' }],
          },
        },
      },
      time: '2026-07-30T12:00:00.000Z',
    } as unknown as HistoryItem;

    await bootWithHistory([malformed, textResponse('Still here.', 'hist-2')]);

    await waitFor(
      () => {
        expect(transcriptText()).toContain('This one is broken.');
      },
      { timeout: 5000 }
    );

    expect(renderedChips()).toHaveLength(0);
    expect(transcriptText()).toContain('Still here.');
  });

  it('renders a restored inline file using the fallback label', async () => {
    // A raw File cannot serialize into a HistoryItem, so a restored inline file has
    // no name to show. The chip still renders, labelled generically.
    const inlineItem = {
      message: {
        id: 'hist-1',
        input: {
          text: 'Attached inline.',
          structured_data: {
            fields: [
              {
                id: 'file',
                type: 'file',
                value: { type: 'inline', id: 'i1', file: {} },
              },
            ],
          },
        },
      },
      time: '2026-07-30T12:00:00.000Z',
    } as unknown as HistoryItem;

    await bootWithHistory([inlineItem]);

    await waitFor(
      () => {
        expect(renderedChips()).toHaveLength(1);
      },
      { timeout: 5000 }
    );

    expect(chipAttachments()).toEqual([
      { id: 'i1', name: undefined, mimeType: undefined },
    ]);
  });
});
