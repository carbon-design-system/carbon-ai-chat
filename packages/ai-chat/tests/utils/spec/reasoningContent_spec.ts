/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  hasReasoningContent,
  synthesizeReasoningLocalMessageItem,
} from '../../../src/chat/utils/reasoningContent';
import {
  GenericItem,
  MessageResponseTypes,
  TextItem,
} from '../../../src/types/messaging/Messages';

describe('reasoningContent', () => {
  describe('hasReasoningContent', () => {
    it('returns false for undefined', () => {
      expect(hasReasoningContent(undefined)).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(hasReasoningContent('')).toBe(false);
    });

    it('returns true for a non-empty string', () => {
      expect(hasReasoningContent('hello')).toBe(true);
    });

    it('returns false for an empty array', () => {
      expect(hasReasoningContent([])).toBe(false);
    });

    it('returns true for an array with at least one item', () => {
      const item: TextItem = {
        response_type: MessageResponseTypes.TEXT,
        text: 'hi',
      };
      expect(hasReasoningContent([item])).toBe(true);
    });
  });

  describe('synthesizeReasoningLocalMessageItem', () => {
    const textItem: TextItem = {
      response_type: MessageResponseTypes.TEXT,
      text: 'step body',
    };

    it('returns the minimum-viable LocalMessageItem shape', () => {
      const wrapper = synthesizeReasoningLocalMessageItem(
        textItem,
        'msg-1',
        'msg-1-reasoning-step-0-item-0'
      );

      expect(wrapper).toEqual({
        item: textItem,
        ui_state: {
          id: 'msg-1-reasoning-step-0-item-0',
          needsAnnouncement: false,
        },
        fullMessageID: 'msg-1',
      });
    });

    it('passes the id and fullMessageID through verbatim', () => {
      const wrapper = synthesizeReasoningLocalMessageItem(
        textItem,
        'parent-xyz',
        'stable-key-42'
      );

      expect(wrapper.ui_state.id).toBe('stable-key-42');
      expect(wrapper.fullMessageID).toBe('parent-xyz');
    });

    it('preserves the original item reference so streaming mutations propagate', () => {
      const streamingItem: GenericItem = {
        response_type: MessageResponseTypes.TEXT,
        text: '',
      } as TextItem;
      const wrapper = synthesizeReasoningLocalMessageItem(
        streamingItem,
        'msg-1',
        'stable-id'
      );

      (streamingItem as TextItem).text = 'now streamed';

      expect(wrapper.item).toBe(streamingItem);
      expect((wrapper.item as TextItem).text).toBe('now streamed');
    });

    it('returns stable output across calls with the same arguments', () => {
      const a = synthesizeReasoningLocalMessageItem(
        textItem,
        'msg-1',
        'stable-id'
      );
      const b = synthesizeReasoningLocalMessageItem(
        textItem,
        'msg-1',
        'stable-id'
      );

      expect(a.ui_state.id).toBe(b.ui_state.id);
      expect(a.fullMessageID).toBe(b.fullMessageID);
      expect(a.item).toBe(b.item);
    });
  });
});
