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
  contractChat,
  contractSetup,
  mainPanelText,
  textResponse,
} from '../helpers/contract';

describe('legacy public message ownership', () => {
  contractSetup();

  it('freezes caller metadata containing typed null and undefined values', async () => {
    const nested: Record<string, unknown> = { empty: null };
    const payload: Record<string, unknown> = {
      empty: null,
      missing: undefined,
      nested,
    };
    const message = textResponse('Null metadata', 'legacy-null');
    message.output.generic[0].user_defined = payload;
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    try {
      await act(() => mount.instance.messaging.addMessage(message));
      expect(Object.isFrozen(message)).toBe(true);
      expect(Object.isFrozen(payload)).toBe(true);
      expect(Object.isFrozen(nested)).toBe(true);
      expect(payload.empty).toBeNull();
      expect('missing' in payload).toBe(true);
      expect(payload.missing).toBeUndefined();
      await waitFor(() => expect(mainPanelText()).toContain('Null metadata'));
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('preserves and freezes a typed caller metadata cycle', async () => {
    const payload: Record<string, unknown> = { label: 'cycle' };
    payload.self = payload;
    const message = textResponse('Cyclic metadata', 'legacy-cycle');
    message.output.generic[0].user_defined = payload;
    const mount = await contractChat({
      openChatByDefault: true,
      messaging: { skipWelcome: true },
    });
    try {
      await act(() => mount.instance.messaging.addMessage(message));
      expect(Object.isFrozen(message)).toBe(true);
      expect(Object.isFrozen(payload)).toBe(true);
      expect(payload.self).toBe(payload);
      await waitFor(() => expect(mainPanelText()).toContain('Cyclic metadata'));
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
