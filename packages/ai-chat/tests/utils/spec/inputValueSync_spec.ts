/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { JSONContent } from '@tiptap/core';
import {
  changeInputValue,
  mirrorInputValue,
  sendInputValue,
} from '../../../src/chat/utils/inputValueSync';
import {
  FileStatusValue,
  type FileUpload,
} from '../../../src/types/config/ServiceDeskConfig';

function upload(overrides: Partial<FileUpload> = {}): FileUpload {
  return {
    id: 'upload-1',
    file: new File(['report'], 'report.txt'),
    status: FileStatusValue.COMPLETE,
    ...overrides,
  } as FileUpload;
}

function sendFixture() {
  const promptLine = {
    clearContent: jest.fn(),
    resetHistory: jest.fn(),
  };
  const args = {
    getRawValue: jest.fn(() => '  message  '),
    getDisplayContent: jest.fn<JSONContent | null, []>(() => null),
    effectiveDisableSend: false,
    onSendInput: jest.fn(),
    clearLocalValue: jest.fn(),
    getPromptLine: jest.fn(() => promptLine),
    clearTrackedValue: jest.fn(),
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
      clearContent: jest.fn(() => order.push('editor')),
      resetHistory: jest.fn(() => order.push('history')),
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

  it.each([
    ['empty input', '', undefined, false],
    ['whitespace', ' \n\t ', undefined, false],
    ['only failed files', '', [upload({ isError: true })], false],
    ['disabled input', 'message', undefined, true],
    [
      'disabled uploading file',
      '',
      [upload({ status: FileStatusValue.UPLOADING })],
      true,
    ],
  ] as const)(
    'does not send or clear %s',
    (_label, rawValue, pendingUploads, disabled) => {
      const { args, promptLine } = sendFixture();
      args.getRawValue.mockReturnValue(rawValue);

      sendInputValue({
        ...args,
        pendingUploads: pendingUploads ? [...pendingUploads] : undefined,
        effectiveDisableSend: disabled,
      });

      expect(args.onSendInput).not.toHaveBeenCalled();
      expect(args.getDisplayContent).not.toHaveBeenCalled();
      expect(args.clearLocalValue).not.toHaveBeenCalled();
      expect(args.getPromptLine).not.toHaveBeenCalled();
      expect(promptLine.clearContent).not.toHaveBeenCalled();
      expect(args.clearTrackedValue).not.toHaveBeenCalled();
    }
  );

  it('sends a file without text and clears local input when tracking and the surface are absent', () => {
    const { args } = sendFixture();
    args.getRawValue.mockReturnValue('   ');

    sendInputValue({
      ...args,
      pendingUploads: [upload()],
      getPromptLine: () => null,
      clearTrackedValue: undefined,
    });

    expect(args.onSendInput).toHaveBeenCalledWith('', undefined);
    expect(args.clearLocalValue).toHaveBeenCalledTimes(1);
    expect(args.clearTrackedValue).not.toHaveBeenCalled();
  });

  it('propagates a synchronous send failure without clearing', () => {
    const { args, promptLine } = sendFixture();
    const error = new Error('send failed');
    args.onSendInput.mockImplementation(() => {
      throw error;
    });

    expect(() => sendInputValue(args)).toThrow(error);

    expect(args.clearLocalValue).not.toHaveBeenCalled();
    expect(args.getPromptLine).not.toHaveBeenCalled();
    expect(promptLine.resetHistory).not.toHaveBeenCalled();
    expect(args.clearTrackedValue).not.toHaveBeenCalled();
  });

  it('clears synchronously without waiting for a send promise that later rejects', async () => {
    const { args, promptLine } = sendFixture();
    let rejectSend: (reason: Error) => void;
    const sent = new Promise<void>((_resolve, reject) => {
      rejectSend = reject;
    });
    args.onSendInput.mockReturnValue(sent);

    expect(sendInputValue(args)).toBeUndefined();
    expect(args.clearLocalValue).toHaveBeenCalledTimes(1);
    expect(promptLine.clearContent).toHaveBeenCalledTimes(1);
    expect(promptLine.resetHistory).toHaveBeenCalledTimes(1);
    expect(args.clearTrackedValue).toHaveBeenCalledTimes(1);

    const error = new Error('async send failed');
    rejectSend(error);
    await expect(sent).rejects.toBe(error);
  });
});

describe('changeInputValue', () => {
  it('applies local state before tracking the same rich document', () => {
    const content: JSONContent = { type: 'doc', content: [] };
    const order: string[] = [];
    const changeLocalValue = jest.fn(() => order.push('local'));
    const changeTrackedValue = jest.fn(
      (_value: { rawValue: string; content?: JSONContent }) =>
        order.push('tracked')
    );

    changeInputValue(
      { rawValue: 'unchanged whitespace  ', content },
      changeLocalValue,
      changeTrackedValue
    );

    expect(order).toEqual(['local', 'tracked']);
    expect(changeLocalValue).toHaveBeenCalledWith(
      'unchanged whitespace  ',
      content
    );
    expect(changeTrackedValue.mock.calls[0][0].content).toBe(content);
  });

  it('keeps missing local content null and tracks an empty document only when requested', () => {
    const changeLocalValue = jest.fn();
    const changeTrackedValue = jest.fn();

    changeInputValue(
      { rawValue: 'plain' },
      changeLocalValue,
      changeTrackedValue
    );
    changeInputValue({ rawValue: 'untracked' }, changeLocalValue);

    expect(changeLocalValue.mock.calls).toEqual([
      ['plain', null],
      ['untracked', null],
    ]);
    expect(changeTrackedValue.mock.calls).toEqual([
      [{ rawValue: 'plain', content: { type: 'doc', content: [] } }],
    ]);
  });
});

describe('mirrorInputValue', () => {
  function fixture() {
    const promptLine = {
      getValue: jest.fn(() => 'old surface'),
      setContent: jest.fn(),
    };
    const args = {
      rawValue: 'next value',
      sliceChanged: false,
      restoreDraft: true,
      getRawValue: jest.fn(() => 'old value'),
      changeLocalValue: jest.fn(),
      getPromptLine: jest.fn(() => promptLine),
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

  it.each([
    [false, true],
    [true, false],
  ])(
    'mirrors text when sliceChanged=%s and restoreDraft=%s',
    (sliceChanged, restoreDraft) => {
      const { args, promptLine } = fixture();
      args.getPromptLine.mockImplementation(() => {
        expect(args.changeLocalValue).toHaveBeenCalledWith('next value');
        return promptLine;
      });

      mirrorInputValue({ ...args, sliceChanged, restoreDraft });

      expect(promptLine.setContent).toHaveBeenCalledWith('next value');
    }
  );

  it('leaves the surface alone when the local raw value already matches', () => {
    const { args, promptLine } = fixture();
    args.getRawValue.mockReturnValue(args.rawValue);

    mirrorInputValue(args);

    expect(args.changeLocalValue).not.toHaveBeenCalled();
    expect(promptLine.setContent).not.toHaveBeenCalled();
  });

  it('leaves a matching surface alone and tolerates an absent surface', () => {
    const { args, promptLine } = fixture();
    promptLine.getValue.mockReturnValue(args.rawValue);

    mirrorInputValue(args);
    mirrorInputValue({ ...args, getPromptLine: () => null });

    expect(args.changeLocalValue).toHaveBeenCalledTimes(2);
    expect(promptLine.setContent).not.toHaveBeenCalled();
  });
});
