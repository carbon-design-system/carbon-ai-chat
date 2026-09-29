/*
 *  Copyright IBM Corp. 2025, 2026
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
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';
import { waitFor } from '@testing-library/react';
import type { StructuredData } from '../../../src/types/messaging/Messages';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';

function makeFile(name = 'test.pdf'): File {
  return new File(['content'], name, { type: 'application/pdf' });
}

function createUploadConfig(
  onFileUpload: (file: File, signal: AbortSignal) => Promise<StructuredData>
): PublicConfig {
  return {
    ...createBaseConfig(),
    upload: { isOn: true, onFileUpload },
  };
}

function chatShadowRoot(): ShadowRoot {
  const root = getChatShadowRoot();
  if (!root) {
    throw new Error('The chat has not rendered its shadow root');
  }
  return root;
}

/** Every live region in the rendered chat, paired with its politeness. */
function liveRegions(): { live: string; text: string }[] {
  const found: { live: string; text: string }[] = [];
  const walk = (root: ParentNode) => {
    root.querySelectorAll('[aria-live]').forEach((region) => {
      found.push({
        live: region.getAttribute('aria-live') ?? '',
        text: (region.textContent ?? '').trim(),
      });
    });
    root.querySelectorAll('*').forEach((element) => {
      const nested = (element as HTMLElement).shadowRoot;
      if (nested) {
        walk(nested);
      }
    });
  };
  walk(chatShadowRoot());
  return found;
}

describe('upload failure announcement', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('announces a failed upload assertively, exactly once', async () => {
    const onFileUpload = jest
      .fn()
      .mockRejectedValue(new Error('The file is larger than the 5 MB limit.'));

    const { serviceManager } = await renderChatAndGetInstanceWithStore(
      createUploadConfig(onFileUpload)
    );

    await serviceManager.actions.handleFileSelectedForUpload(makeFile());

    await waitFor(() =>
      expect(
        liveRegions().filter((region) => region.text.includes('5 MB limit'))
      ).not.toHaveLength(0)
    );

    // Settle past the announcer's 250 ms debounce so a second write to a
    // different region is observed rather than raced.
    await new Promise((resolve) => setTimeout(resolve, 400));

    // A blocking failure interrupts, and no second region repeats it — the
    // defect was the same text landing in three regions, two of them polite.
    const carrying = liveRegions().filter((region) =>
      region.text.includes('5 MB limit')
    );
    expect(carrying).toHaveLength(1);
    expect(carrying[0].live).toBe('assertive');
  });

  it('silences the AnnounceOnMount wrapper while an upload has failed', async () => {
    const onFileUpload = jest.fn().mockRejectedValue(new Error('Boom'));

    const { serviceManager } = await renderChatAndGetInstanceWithStore(
      createUploadConfig(onFileUpload)
    );

    await serviceManager.actions.handleFileSelectedForUpload(makeFile());

    await waitFor(() => {
      const messaging = deepQuerySelector(
        chatShadowRoot(),
        '[slot="field-messaging"]'
      );
      // The wrapper stays mounted so it cannot remount and re-announce; it goes
      // quiet instead, because file-uploads owns this announcement.
      expect(
        messaging?.querySelector('[aria-live]')?.getAttribute('aria-live')
      ).toBe('off');
    });
  });

  it('announces the localized title with the host reason and recovery', async () => {
    const onFileUpload = jest
      .fn()
      .mockRejectedValue(new Error('The file is larger than the 5 MB limit.'));

    const { serviceManager } = await renderChatAndGetInstanceWithStore(
      createUploadConfig(onFileUpload)
    );

    await serviceManager.actions.handleFileSelectedForUpload(makeFile());

    await waitFor(() => {
      const assertive = liveRegions()
        .filter((region) => region.live === 'assertive')
        .map((region) => region.text)
        .join(' ');
      // The title is punctuated so a screen reader pauses before the reason
      // rather than running the two together.
      expect(assertive).toContain('File upload error.');
      expect(assertive).toContain('The file is larger than the 5 MB limit.');
      expect(assertive).toContain('Remove the attachment and try again.');
    });
  });

  it('names each remove button after its own file', async () => {
    const onFileUpload = jest.fn().mockResolvedValue({});

    const { serviceManager } = await renderChatAndGetInstanceWithStore(
      createUploadConfig(onFileUpload)
    );

    await serviceManager.actions.handleFileSelectedForUpload(
      makeFile('ok.txt')
    );
    await serviceManager.actions.handleFileSelectedForUpload(
      makeFile('report.pdf')
    );

    await waitFor(() => {
      const names: string[] = [];
      const walk = (root: ParentNode) => {
        root.querySelectorAll('button.cds--file-close').forEach((button) => {
          names.push(button.getAttribute('aria-label') ?? '');
        });
        root.querySelectorAll('*').forEach((element) => {
          const nested = (element as HTMLElement).shadowRoot;
          if (nested) {
            walk(nested);
          }
        });
      };
      walk(chatShadowRoot());

      expect(names).toHaveLength(2);
      expect(names[0]).toContain('ok.txt');
      expect(names[1]).toContain('report.pdf');
      expect(names[0]).not.toEqual(names[1]);
    });
  });
});
