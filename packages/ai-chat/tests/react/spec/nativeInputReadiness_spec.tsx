/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useRef } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';
import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';
import type { JSONContent } from '@tiptap/core';
import '../../../src/web-components/cds-aichat-container';
import '../../../src/web-components/cds-aichat-custom-element';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { ChatCustomElement } from '../../../src/react/ChatCustomElement';
import type ChatInput from '../../../src/chat/components/input/ChatInput';
import { useSelector } from '../../../src/chat/hooks/useSelector';
import { selectInputFieldVisible } from '../../../src/chat/store/selectors';
import { resolvablePromise } from '../../../src/chat/utils/resolvablePromise';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import type { InputFunctions } from '../../../src/chat/utils/inputTypes';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

type Phase = 'first effect' | 'after render' | 'shown effect';

interface Observation {
  phase: Phase;
  native: ChatInput | null;
  prompt: PromptLineElement | null;
  handle: InputFunctions | null;
  connected: boolean;
  directEditorSlot: boolean;
  registered: boolean;
  shellHandle: boolean;
  focusDelegate: boolean;
  mainWindow: boolean;
  publicFocus: boolean;
  handleFocus: boolean;
  focusedAfterHandle: boolean;
  text?: string;
  stateText?: string;
  editorMatches?: boolean;
  error?: unknown;
}

function textDocument(text: string): JSONContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

function readInputTargets(instance: ChatInstance) {
  const native = deepQuerySelector(
    document,
    'cds-aichat-chat-input'
  ) as ChatInput;
  expect(native).not.toBeNull();
  const prompt = native.querySelector<PromptLineElement>(
    'cds-aichat-prompt-line'
  );
  expect(prompt).not.toBeNull();
  const handle = native.inputFunctions;
  expect(handle).toBeDefined();
  const assignedSlot = prompt.assignedSlot;
  expect(assignedSlot).not.toBeNull();
  const manager = (
    instance.serviceManager.actions as unknown as {
      serviceManager: ServiceManager;
    }
  ).serviceManager;
  return {
    native,
    prompt,
    handle,
    connected: native.isConnected && prompt.isConnected,
    directEditorSlot:
      prompt.parentElement.localName === 'cds-aichat-prompt-line-shell' &&
      assignedSlot.name === 'editor',
    registered: manager.getInputFunctionsRef() === handle,
    shellHandle: manager.inputComponent === handle,
    focusDelegate: typeof manager.appWindow?.requestFocus === 'function',
    mainWindow: instance.getState().viewState.mainWindow,
  };
}

async function observeInput(
  instance: ChatInstance,
  phase: Phase,
  observations: Observation[]
) {
  const observation: Observation = {
    phase,
    native: null,
    prompt: null,
    handle: null,
    connected: false,
    directEditorSlot: false,
    registered: false,
    shellHandle: false,
    focusDelegate: false,
    mainWindow: false,
    publicFocus: false,
    handleFocus: false,
    focusedAfterHandle: false,
  };
  observations.push(observation);
  try {
    const targets = readInputTargets(instance);
    Object.assign(observation, targets);
    const { prompt, handle } = targets;
    instance.requestFocus();
    await waitFor(() => expect(prompt.hasFocus()).toBe(true));
    observation.publicFocus = prompt.hasFocus();
    observation.handleFocus = handle.requestFocus();
    observation.focusedAfterHandle = prompt.hasFocus();
    await instance.input.updateContent(() => textDocument(phase));
    observation.text = prompt.getValue();
    observation.stateText = instance.getState().input.rawValue;
    if (phase === 'after render') {
      const editor = await instance.input.getEditor();
      observation.editorMatches = Boolean(
        editor &&
        editor === prompt.getEditor() &&
        !editor.isDestroyed &&
        editor.getText() === phase
      );
    }
  } catch (error) {
    observation.error = error;
  }
}

function expectUsableInput(observation: Observation) {
  expect(observation.error).toBeUndefined();
  expect(observation.native).not.toBeNull();
  expect(observation.prompt).not.toBeNull();
  expect(observation.connected).toBe(true);
  expect(observation.directEditorSlot).toBe(true);
  expect(observation.registered).toBe(true);
  expect(observation.shellHandle).toBe(true);
  expect(observation.focusDelegate).toBe(true);
  expect(observation.handleFocus).toBe(true);
  expect(observation.focusedAfterHandle).toBe(true);
  if (observation.mainWindow) {
    expect(observation.publicFocus).toBe(true);
  }
  expect(observation.text).toBe(observation.phase);
  expect(observation.stateText).toBe(observation.phase);
  if (observation.phase === 'after render') {
    expect(observation.mainWindow).toBe(true);
    expect(observation.editorMatches).toBe(true);
  }
}

const config = (): PublicConfig => ({
  ...createBaseConfig(),
  openChatByDefault: true,
  homescreen: { isOn: false },
});

beforeEach(setupBeforeEach);
afterEach(() => {
  setupAfterEach();
  jest.restoreAllMocks();
});

it.each([
  ['ChatContainer', ChatContainer],
  ['ChatCustomElement', ChatCustomElement],
] as const)(
  'keeps consumer effects in their tree and makes native input APIs usable after-render through %s',
  async (_name, Wrapper) => {
    let instance: ChatInstance;
    const observations: Observation[] = [];
    const effectOrder: Phase[] = [];
    const ready = resolvablePromise();
    const consumerRendered = jest.fn();
    function Consumer() {
      const visible = useSelector(selectInputFieldVisible);
      const observedFirstEffect = useRef(false);
      consumerRendered();
      useEffect(() => {
        if (visible) {
          const phase = observedFirstEffect.current
            ? 'shown effect'
            : 'first effect';
          observedFirstEffect.current = true;
          effectOrder.push(phase);
        }
      }, [visible]);
      return <span data-native-input-consumer />;
    }
    const after = jest.fn(async (chat: ChatInstance) => {
      effectOrder.push('after render');
      await observeInput(chat, 'after render', observations);
      ready.doResolve();
    });

    render(
      <Wrapper
        {...config()}
        className=""
        onBeforeRender={(chat) => {
          instance = chat;
        }}
        onAfterRender={after}
        renderWriteableElements={{ beforeInputElement: <Consumer /> }}
      />
    );

    await ready;
    expect(after).toHaveBeenCalledTimes(1);
    expect(consumerRendered).toHaveBeenCalled();
    expect(effectOrder).toEqual(['first effect', 'after render']);
    expect(observations).toHaveLength(1);
    expectUsableInput(observations[0]);

    await act(async () => {
      instance.updateInputFieldVisibility(false);
    });
    expect(
      observations[0].native.querySelector('cds-aichat-prompt-line')
    ).toBeNull();
    expect(
      (
        instance.serviceManager.actions as unknown as {
          serviceManager: ServiceManager;
        }
      ).serviceManager.getInputFunctionsRef()
    ).toBe(observations[0].handle);
    expect(observations[0].handle.requestFocus()).toBe(false);
    await act(async () => {
      instance.updateInputFieldVisibility(true);
    });
    expect(effectOrder).toEqual([
      'first effect',
      'after render',
      'shown effect',
    ]);
    await observations[0].native.ready;
    await observeInput(instance, 'shown effect', observations);
    expectUsableInput(observations[1]);
    expect(observations[1].native).toBe(observations[0].native);
    expect(observations[1].handle).toBe(observations[0].handle);
    expect(observations[1].prompt).not.toBe(observations[0].prompt);
    expect(observations[0].prompt.isConnected).toBe(false);
    expect(after).toHaveBeenCalledTimes(1);
  }
);

it.each(['cds-aichat-container', 'cds-aichat-custom-element'])(
  'makes native input focus, content and editor APIs usable in %s after-render',
  async (tagName) => {
    const observations: Observation[] = [];
    const ready = resolvablePromise();
    const before = jest.fn();
    const after = jest.fn(async (instance: ChatInstance) => {
      await observeInput(instance, 'after render', observations);
      ready.doResolve();
    });
    const host = document.createElement(tagName) as HTMLElement & {
      config: PublicConfig;
      onBeforeRender: typeof before;
      onAfterRender: typeof after;
    };
    host.config = config();
    host.onBeforeRender = before;
    host.onAfterRender = after;
    document.body.append(host);

    await ready;
    expect(before).toHaveBeenCalledTimes(1);
    expect(after).toHaveBeenCalledTimes(1);
    expect(observations).toHaveLength(1);
    expectUsableInput(observations[0]);
  }
);
