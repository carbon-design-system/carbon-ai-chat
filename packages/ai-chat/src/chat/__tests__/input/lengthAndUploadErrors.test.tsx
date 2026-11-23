/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';

import {
  ChatInstance,
  PageObjectId,
  PublicConfig,
  StructuredData,
} from '../../../aiChatEntry';
import {
  byRole,
  click,
  contractChat,
  contractSetup,
  deferred,
  getByTestId,
  isDisabled,
  openElement,
  pickFiles,
  typeText,
} from '../helpers/contract';

const REASON = 'The test upload was rejected.';
const RECOVERY = 'Remove the attachment and try again.';
const LENGTH_TITLE = 'Error: Max character count exceeded';
const LENGTH_DETAIL =
  'Maximum character count of 5 exceeded. 8 characters, currently.';

/** Every element with `aria-live`, through open shadow roots. */
function liveRegions(
  root: ParentNode = document
): { live: string; text: string }[] {
  const found: { live: string; text: string }[] = [];
  for (const element of Array.from(root.querySelectorAll('*'))) {
    const live = element.getAttribute('aria-live');
    if (live) {
      found.push({ live, text: collapse(deepText(element)) });
    }
    if (element.shadowRoot) {
      found.push(...liveRegions(element.shadowRoot));
    }
  }
  return found;
}

/** An element's text, including the shadow trees under it. */
function deepText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (!(node instanceof Element) || node.tagName === 'STYLE') {
    return '';
  }
  const own = Array.from(node.childNodes).map(deepText).join(' ');
  const shadow = node.shadowRoot
    ? Array.from(node.shadowRoot.childNodes).map(deepText).join(' ')
    : '';
  return `${shadow} ${own}`;
}

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** The first element with this tag, through open shadow roots. */
function deepQuery(tag: string, root: ParentNode = document): Element | null {
  for (const element of Array.from(root.querySelectorAll('*'))) {
    if (element.localName === tag) {
      return element;
    }
    const inner = element.shadowRoot && deepQuery(tag, element.shadowRoot);
    if (inner) {
      return inner;
    }
  }
  return null;
}

/**
 * The input's live regions whose text includes `text`. The chat's own
 * announcer also repeats the length error, so the search stays inside the
 * input, where the error message and the upload chips own their regions.
 */
const carrying = (text: string) =>
  liveRegions(deepQuery('cds-aichat-chat-input')).filter((region) =>
    region.text.includes(text)
  );

type Mount = (config: Partial<PublicConfig>) => Promise<ChatInstance>;

const HOSTS: Array<[string, Mount]> = [
  [
    'ChatContainer',
    async (config) =>
      (
        await contractChat({
          ...config,
          openChatByDefault: true,
          messaging: { skipWelcome: true, ...config.messaging },
        })
      ).instance,
  ],
  [
    'cds-aichat-custom-element',
    async (config) =>
      (await openElement('cds-aichat-custom-element', { ...config })).instance,
  ],
];

describe.each(HOSTS)('length and upload errors through %s', (_name, mount) => {
  contractSetup();

  it('keep separate live regions, and neither clobbers the other', async () => {
    const upload = deferred<StructuredData>();
    const sent: string[] = [];
    const instance = await mount({
      input: { maxInputCharacters: 5 },
      messaging: {
        customSendMessage: (request): void => {
          sent.push(request.input.text);
        },
      },
      upload: {
        isOn: true,
        accept: '.txt',
        maxFiles: 1,
        onFileUpload: () => upload.promise,
      },
    });
    const filename = 'failure.txt';
    await pickFiles('Add files to upload', [
      new File(['An editable text attachment'], filename, {
        type: 'text/plain',
      }),
    ]);
    await waitFor(() =>
      expect(instance.getState().input.hasInFlightUploads).toBe(true)
    );

    await typeText('Too long');
    await waitFor(() => {
      const length = carrying(LENGTH_TITLE);
      expect(length).toHaveLength(1);
      expect(length[0].live).toBe('polite');
    });
    await click(byRole('button', 'Expand error message'));
    await waitFor(() =>
      expect(carrying(LENGTH_TITLE)[0].text).toContain(LENGTH_DETAIL)
    );

    await act(async () => {
      upload.reject(new Error(REASON));
      await upload.promise.catch((): void => undefined);
    });
    await waitFor(() =>
      expect(instance.getState().input.hasInFlightUploads).toBe(false)
    );
    // The failure shows in its own region before either region is checked.
    await waitFor(() => expect(carrying(REASON)).toHaveLength(1));

    const length = carrying(LENGTH_TITLE);
    expect(length).toHaveLength(1);
    expect(length[0].live).toBe('polite');
    expect(length[0].text).toContain(LENGTH_DETAIL);
    expect(length[0].text).not.toContain(REASON);

    const failure = carrying(REASON);
    expect(failure).toHaveLength(1);
    expect(failure[0].live).toBe('assertive');
    expect(failure[0].text).toBe(`File upload error. ${REASON} ${RECOVERY}`);
    expect(failure[0].text).not.toContain(LENGTH_TITLE);
    expect(byRole('button', `Remove ${filename}`)).not.toBeNull();

    // Back under the limit, the length error goes and the file's error row
    // takes its place, silent so it doesn't repeat the announcement.
    await typeText('Fine');
    await waitFor(() => expect(carrying(LENGTH_TITLE)).toHaveLength(0));
    const row = carrying(`File upload error: ${filename}`);
    expect(row).toHaveLength(1);
    expect(row[0].live).toBe('off');
    expect(row[0].text).toContain(`${REASON} ${RECOVERY}`);
    expect(
      carrying(REASON)
        .map((region) => region.live)
        .sort()
    ).toEqual(['assertive', 'off']);
    expect(isDisabled(getByTestId(PageObjectId.INPUT_SEND))).toBe(true);
    expect(sent).toEqual([]);
  });
});
