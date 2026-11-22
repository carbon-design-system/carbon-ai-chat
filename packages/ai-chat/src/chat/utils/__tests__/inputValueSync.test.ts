/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { JSONContent } from '@tiptap/core';
import { mirrorInputValue, sendInputValue } from '../inputValueSync';

function sendFixture() {
  const promptLine = {
    clearContent: vi.fn(),
    resetHistory: vi.fn(),
  };
  const args = {
    getRawValue: vi.fn(() => '  message  '),
    getDisplayContent: vi.fn<(...args: []) => JSONContent | null>(() => null),
    effectiveDisableSend: false,
    onSendInput: vi.fn(),
    clearLocalValue: vi.fn(),
    getPromptLine: vi.fn(() => promptLine),
    clearTrackedValue: vi.fn(),
  };
  return { args, promptLine };
}

describe('sendInputValue', () => {
  it('sends the live trimmed value and the same document before clearing the live surface and slice', () => {
    const { args, promptLine: previousPromptLine } = sendFixture();
    const order: string[] = [];
    const document: JSONContent = {
      type: 'doc',
      content: [{ type: 'mention', attrs: { id: 'person' } }],
    };
    let rawValue = 'previous render';
    let displayContent: JSONContent | null = document;
    let activeSlice = 'assistant';
    let promptLine = previousPromptLine;
    const nextPromptLine = {
      clearContent: vi.fn(() => order.push('editor')),
      resetHistory: vi.fn(() => order.push('history')),
    };
    args.getRawValue.mockImplementation(() => rawValue);
    args.getDisplayContent.mockImplementation(() => displayContent);
    args.onSendInput.mockImplementation((text, content) => {
      order.push('send');
      expect(text).toBe('current message');
      expect(content).toBe(document);
      expect(displayContent).toBe(document);
      promptLine = nextPromptLine;
      activeSlice = 'agent';
    });
    args.clearLocalValue.mockImplementation(() => {
      order.push('local');
      displayContent = null;
    });
    args.getPromptLine.mockImplementation(() => {
      order.push('surface lookup');
      expect(displayContent).toBeNull();
      return promptLine;
    });
    args.clearTrackedValue.mockImplementation(() => {
      order.push(`tracked ${activeSlice}`);
    });
    rawValue = '  current message \n';

    sendInputValue(args);

    expect(order).toEqual([
      'send',
      'local',
      'surface lookup',
      'editor',
      'history',
      'tracked agent',
    ]);
    expect(previousPromptLine.clearContent).not.toHaveBeenCalled();
    expect(previousPromptLine.resetHistory).not.toHaveBeenCalled();
  });
});

describe('mirrorInputValue', () => {
  function fixture() {
    const promptLine = {
      getValue: vi.fn(() => 'old surface'),
      setContent: vi.fn(),
    };
    const args = {
      rawValue: 'next value',
      sliceChanged: false,
      restoreDraft: true,
      getRawValue: vi.fn(() => 'old value'),
      changeLocalValue: vi.fn(),
      getPromptLine: vi.fn(() => promptLine),
    };
    return { args, promptLine };
  }

  it('updates the local value without overwriting a new slice before its rich draft restores', () => {
    const { args, promptLine } = fixture();

    mirrorInputValue({ ...args, sliceChanged: true });

    expect(args.changeLocalValue).toHaveBeenCalledWith('next value');
    expect(args.getPromptLine).not.toHaveBeenCalled();
    expect(promptLine.setContent).not.toHaveBeenCalled();
  });
});
