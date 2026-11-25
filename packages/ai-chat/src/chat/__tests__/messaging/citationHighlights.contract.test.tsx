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
  MessageResponseTypes,
  type MessageResponse,
} from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  isHidden,
  mainPanelText,
  shownText,
} from '../helpers/contract';

const TOGGLE = 'Show owned highlight sources';
const NEXT = 'Owned next source';
const ALPHA_URL = 'http://alpha.example.test/document';
const BETA_URL = 'http://beta.example.test/document';

/** A link card's name: its title, its excerpt, then the source's host. */
const ALPHA_LINK = 'Alpha sourceThe alpha excerptalpha.example.test';
const BETA_LINK = 'Beta sourceThe beta excerptbeta.example.test';

/** An answer whose two sources each cite one word of it. */
const ANSWER: MessageResponse = {
  id: 'highlight-answer',
  output: {
    generic: [
      {
        response_type: MessageResponseTypes.CONVERSATIONAL_SEARCH,
        text: 'Alpha Beta',
        citations: [
          {
            title: 'Alpha source',
            text: 'The alpha excerpt',
            url: ALPHA_URL,
            ranges: [{ start: 0, end: 5 }],
          },
          {
            title: 'Beta source',
            text: 'The beta excerpt',
            url: BETA_URL,
            ranges: [{ start: 6, end: 10 }],
          },
        ],
      },
    ],
  },
};

/** Every element under `root`, through open shadow roots. */
function* everyElement(root: ParentNode): Generator<Element> {
  for (const element of Array.from(root.querySelectorAll('*'))) {
    yield element;
    if (element.shadowRoot) {
      yield* everyElement(element.shadowRoot);
    }
  }
}

/**
 * The text of each visible highlight: an element with the ARIA `mark` role,
 * set explicitly or implied by the HTML `mark` element (HTML-AAM). The shared
 * `roleOf` helper doesn't map that implicit role.
 */
function highlights(): string[] {
  return [...everyElement(document)]
    .filter((element) => {
      const role = element.getAttribute('role')?.trim().split(/\s+/)[0];
      return role ? role === 'mark' : element.localName === 'mark';
    })
    .filter((element) => !isHidden(element))
    .map((element) => shownText(element).trim());
}

/** The visible link to `url` with this accessible name. */
function linkTo(name: string, url: string): HTMLElement {
  const link = allByRole('link', name).find(
    (element) => element.getAttribute('href') === url
  );
  if (!link) {
    throw new Error(`no visible link "${name}" to ${url}`);
  }
  return link;
}

describe('public citation highlights', () => {
  contractSetup();

  it('highlights the open source’s cited words, follows the source the user moves to, and clears when sources close', async () => {
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
      strings: {
        conversationalSearch_toggleCitations: TOGGLE,
        carousel_nextNavButton: NEXT,
      },
    });
    try {
      await act(() => mount.instance.messaging.addMessage(ANSWER));
      const toggle = await waitFor(() => byRole('button', TOGGLE));
      await waitFor(() => expect(mainPanelText()).toContain('Alpha Beta'));
      expect(highlights()).toEqual([]);

      await click(toggle);
      await waitFor(() => expect(highlights()).toEqual(['Alpha']));

      // The sources show one at a time: once the carousel has started, only
      // the first is in view.
      await waitFor(() => linkTo(ALPHA_LINK, ALPHA_URL));
      await waitFor(() => expect(allByRole('link', BETA_LINK)).toHaveLength(0));
      // A keyboard user moves to the next source and tabs to it.
      await click(await waitFor(() => byRole('button', NEXT)));
      const beta = await waitFor(() => linkTo(BETA_LINK, BETA_URL));
      await act(async () => {
        beta.focus();
      });
      await waitFor(() => expect(highlights()).toEqual(['Beta']));

      await click(byRole('button', TOGGLE));
      await waitFor(() => expect(highlights()).toEqual([]));
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
