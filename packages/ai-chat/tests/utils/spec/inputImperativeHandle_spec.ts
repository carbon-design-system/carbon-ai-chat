/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { InputFunctions } from '../../../src/chat/components/input/Input';
import {
  createInputImperativeHandle,
  registerInputImperativeHandle,
} from '../../../src/chat/utils/inputImperativeHandle';

type Editor = NonNullable<ReturnType<InputFunctions['getEditor']>>;

function createSurface() {
  const field = document.createElement('textarea');
  document.body.append(field);
  return {
    field,
    promptLine: {
      focus: jest.fn(() => field.focus()),
      hasFocus: jest.fn(() => document.activeElement === field),
      setContent: jest.fn(),
      insertContent: jest.fn(),
      getEditor: jest.fn(() => null as Editor | null),
      ensureEditor: jest.fn<Promise<Editor>, []>(),
    },
  };
}

function createRegistration() {
  let current: InputFunctions | null = null;
  return {
    getInputFunctionsRef: () => current,
    setInputFunctionsRef: jest.fn((next: InputFunctions | null) => {
      current = next;
    }),
  };
}

afterEach(() => document.body.replaceChildren());

describe('createInputImperativeHandle', () => {
  it('does no setup work and preserves missing-surface results and synchronous errors', () => {
    const getPromptLine = jest.fn((): null => null);
    const latchRich = jest.fn();
    const handle = createInputImperativeHandle(getPromptLine, latchRich);

    expect(getPromptLine).not.toHaveBeenCalled();
    expect(latchRich).not.toHaveBeenCalled();
    expect(handle.requestFocus()).toBe(false);
    expect(handle.hasFocus()).toBe(false);
    expect(handle.getEditor()).toBeNull();
    expect(() => handle.setContent('draft')).toThrow(
      'Input is not currently rendered'
    );
    expect(() => handle.insertContent('draft')).toThrow(
      'Input is not currently rendered'
    );
    expect(() => handle.ensureEditor()).toThrow(
      'Input is not currently rendered'
    );
    expect(latchRich).not.toHaveBeenCalled();
  });

  it('keeps retained methods on the live surface through replacement and removal', () => {
    const first = createSurface();
    const second = createSurface();
    const firstEditor = {} as Editor;
    const secondEditor = {} as Editor;
    first.promptLine.getEditor.mockReturnValue(firstEditor);
    second.promptLine.getEditor.mockReturnValue(secondEditor);
    let current: typeof first.promptLine | null = first.promptLine;
    const { requestFocus, hasFocus, setContent, insertContent, getEditor } =
      createInputImperativeHandle(() => current, jest.fn());

    expect(hasFocus()).toBe(false);
    expect(requestFocus()).toBe(true);
    expect(document.activeElement).toBe(first.field);
    expect(hasFocus()).toBe(true);
    setContent('first draft');
    insertContent('first insertion');
    expect(getEditor()).toBe(firstEditor);

    current = second.promptLine;
    expect(hasFocus()).toBe(false);
    expect(requestFocus()).toBe(true);
    expect(document.activeElement).toBe(second.field);
    expect(hasFocus()).toBe(true);
    const update: Parameters<InputFunctions['setContent']>[0] = (previous) =>
      previous;
    const content = { type: 'text', text: 'second insertion' };
    const options = { at: 3 };
    setContent(update);
    insertContent(content, options);
    expect(getEditor()).toBe(secondEditor);
    expect(first.promptLine.focus).toHaveBeenCalledTimes(1);
    expect(first.promptLine.setContent.mock.calls).toEqual([['first draft']]);
    expect(first.promptLine.insertContent.mock.calls).toEqual([
      ['first insertion', undefined],
    ]);
    expect(second.promptLine.setContent).toHaveBeenCalledWith(update);
    expect(second.promptLine.insertContent).toHaveBeenCalledWith(
      content,
      options
    );

    current = null;
    expect(requestFocus()).toBe(false);
    expect(hasFocus()).toBe(false);
    expect(getEditor()).toBeNull();
    expect(() => setContent('removed')).toThrow(
      'Input is not currently rendered'
    );
    expect(second.promptLine.setContent).toHaveBeenCalledTimes(1);
  });

  it('probes without loading and latches before returning each live upgrade promise unchanged', async () => {
    const first = createSurface();
    const second = createSurface();
    const firstEditor = {} as Editor;
    const secondEditor = {} as Editor;
    let finishUpgrade: (editor: Editor) => void;
    const firstUpgrade = new Promise<Editor>((resolve) => {
      finishUpgrade = resolve;
    });
    const secondUpgrade = Promise.resolve(secondEditor);
    const order: string[] = [];
    first.promptLine.ensureEditor.mockImplementation(() => {
      order.push('first upgrade');
      return firstUpgrade;
    });
    second.promptLine.ensureEditor.mockImplementation(() => {
      order.push('second upgrade');
      return secondUpgrade;
    });
    let current = first.promptLine;
    const { getEditor, ensureEditor } = createInputImperativeHandle(
      () => current,
      () => order.push('latch')
    );

    expect(getEditor()).toBeNull();
    expect(first.promptLine.ensureEditor).not.toHaveBeenCalled();
    expect(order).toEqual([]);
    const pending = ensureEditor();
    expect(pending).toBe(firstUpgrade);
    current = second.promptLine;
    expect(getEditor()).toBeNull();
    expect(second.promptLine.ensureEditor).not.toHaveBeenCalled();
    expect(ensureEditor()).toBe(secondUpgrade);
    expect(order).toEqual([
      'latch',
      'first upgrade',
      'latch',
      'second upgrade',
    ]);
    finishUpgrade(firstEditor);
    await expect(pending).resolves.toBe(firstEditor);
    await expect(secondUpgrade).resolves.toBe(secondEditor);
  });

  it('preserves the upgrade rejection and its promise identity', async () => {
    const { promptLine } = createSurface();
    const failure = new Error('editor load failed');
    const upgrade = Promise.reject(failure);
    promptLine.ensureEditor.mockReturnValue(upgrade);
    const handle = createInputImperativeHandle(() => promptLine, jest.fn());

    const pending = handle.ensureEditor();
    expect(pending).toBe(upgrade);
    await expect(pending).rejects.toBe(failure);
  });
});

describe('registerInputImperativeHandle', () => {
  it('registers explicitly and clears its own handle only once', () => {
    const registration = createRegistration();
    const handle = createInputImperativeHandle(() => null, jest.fn());
    expect(registration.getInputFunctionsRef()).toBeNull();

    const release = registerInputImperativeHandle(registration, handle);
    expect(registration.getInputFunctionsRef()).toBe(handle);
    release();
    release();
    expect(registration.getInputFunctionsRef()).toBeNull();
    expect(registration.setInputFunctionsRef.mock.calls).toEqual([
      [handle],
      [null],
    ]);
  });

  it('leaves replacements and later registrations intact after a stale release', () => {
    const registration = createRegistration();
    const handle = createInputImperativeHandle(() => null, jest.fn());
    const replacement = createInputImperativeHandle(() => null, jest.fn());
    const release = registerInputImperativeHandle(registration, handle);
    const releaseReplacement = registerInputImperativeHandle(
      registration,
      replacement
    );

    release();
    expect(registration.getInputFunctionsRef()).toBe(replacement);
    releaseReplacement();
    const releaseReconnected = registerInputImperativeHandle(
      registration,
      handle
    );
    release();
    releaseReplacement();
    expect(registration.getInputFunctionsRef()).toBe(handle);
    releaseReconnected();
    expect(registration.getInputFunctionsRef()).toBeNull();
    expect(registration.setInputFunctionsRef.mock.calls).toEqual([
      [handle],
      [replacement],
      [null],
      [handle],
      [null],
    ]);
  });
});
