/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, waitFor } from '@testing-library/react';
import {
  type ChatInstance,
  ErrorType,
  type GenericItem,
  MessageResponseTypes,
  PageObjectId,
  type SuggestionItem,
  UserType,
  ViewType,
  type KeyboardShortcuts,
  type PublicConfig,
  type ServiceDesk,
  type ServiceDeskCallback,
  readCarbonChatSession,
} from '../../../aiChatEntry';
import {
  allByRole,
  byRole,
  byTestId,
  changeView,
  click,
  contractChat,
  contractSetup,
  deepActiveElement,
  fakeBackend,
  flatChildren,
  focusIsInInput,
  getByTestId,
  inputField,
  isDisabled,
  isHidden,
  isShownWithin,
  mainPanelText,
  pause,
  responseOf,
  shownText,
  textResponse,
  typeText,
} from '../helpers/contract';

function props(extra: Partial<PublicConfig> = {}): Partial<PublicConfig> {
  return {
    openChatByDefault: true,
    messaging: { skipWelcome: true },
    ...extra,
  };
}

async function key(name: string): Promise<boolean> {
  const event = new KeyboardEvent('keydown', {
    key: name,
    code: name,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  await act(async () => {
    deepActiveElement().dispatchEvent(event);
  });
  return event.defaultPrevented;
}

/**
 * The first text node under `root`, in the flat tree a user sees, whose text
 * includes `text`.
 */
function shownTextNode(root: Node, text: string): Text | null {
  for (const child of flatChildren(root)) {
    if (
      child.nodeType === Node.TEXT_NODE &&
      (child.textContent ?? '').includes(text)
    ) {
      return child as Text;
    }
    const found = shownTextNode(child, text);
    if (found) {
      return found;
    }
  }
  return null;
}

/** Blurs and then focuses the rich editor, as a user tabbing back would. */
async function refocusEditor(instance: ChatInstance): Promise<void> {
  const editor = await act(() => instance.input.getEditor());
  await act(async () => {
    editor.commands.blur();
  });
  await act(async () => {
    editor.commands.focus();
  });
}

describe('public runtime config consumers', () => {
  contractSetup();

  it('keeps the live draft, caret and mention picker across an unrelated action change', async () => {
    const onClick = (): void => undefined;
    const config = (disabled: boolean) =>
      props({
        strings: { input_actionsMenuLabel: 'Draft actions' },
        input: {
          mention: {
            trigger: '@',
            items: [{ id: 'alice', label: 'Alice', value: '@alice' }],
          },
          actions: [{ text: 'Review draft', onClick, disabled }],
        },
      });
    const mount = await contractChat(config(false));
    try {
      await click(byRole('button', 'Draft actions'));
      const action = await waitFor(() => byRole('menuitem', 'Review draft'));
      expect(isDisabled(action)).toBe(false);
      await click(action);
      const editor = await act(() => mount.instance.input.getEditor());
      await act(async () => {
        editor.commands.setContent({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Draft  end' }],
            },
          ],
        });
        editor.commands.setTextSelection(7);
        editor.commands.focus();
      });
      await waitFor(() =>
        expect(mount.instance.state.get().input.focused).toBe(true)
      );
      expect(mount.instance.state.get().input.rawValue).toBe('Draft  end');
      expect(editor.state.selection.from).toBe(7);
      await act(async () => {
        editor.commands.insertContent('@al');
      });
      await waitFor(() => expect(byRole('option', 'Alice')).not.toBeNull());
      expect(mount.instance.state.get().input.rawValue).toBe('Draft @al end');
      expect(editor.state.selection.from).toBe(10);
      await mount.rerender(config(true));
      const current = await act(() => mount.instance.input.getEditor());
      expect(mount.instance.state.get().input.rawValue).toBe('Draft @al end');
      expect(current.state.selection.from).toBe(10);
      expect(current.isFocused).toBe(true);
      await waitFor(() => expect(byRole('option', 'Alice')).not.toBeNull());
      await click(byRole('option', 'Alice'));
      expect(mount.instance.state.get().input.rawValue).toContain(
        'Draft @Alice'
      );
      expect(mount.instance.state.get().input.rawValue).toContain('end');
      await click(byRole('button', 'Draft actions'));
      await waitFor(() =>
        expect(isDisabled(byRole('menuitem', 'Review draft'))).toBe(true)
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('applies runtime shortcut defaults, switches bindings and retracts an omitted shortcut', async () => {
    const config = (keyboardShortcuts?: KeyboardShortcuts) =>
      props({
        assistantName: 'Runtime bot',
        strings: { messages_assistantSaid: 'Reply from {assistantName}' },
        keyboardShortcuts,
      });
    const mount = await contractChat(config());
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          textResponse('Hi', 'shortcut-reply')
        )
      );
      await act(async () => {
        mount.instance.requestFocus();
      });
      await waitFor(() => expect(focusIsInInput()).toBe(true));
      await mount.rerender(config({ messageFocusToggle: { isOn: true } }));
      expect(await key('F6')).toBe(true);
      await waitFor(() =>
        expect(deepActiveElement()).toBe(
          byRole('button', 'Reply from Runtime bot Hi')
        )
      );
      await key('F6');
      await waitFor(() => expect(focusIsInInput()).toBe(true));
      await mount.rerender(
        config({
          messageFocusToggle: { isOn: true, key: 'F7' },
        })
      );
      expect(await key('F6')).toBe(false);
      expect(focusIsInInput()).toBe(true);
      expect(await key('F7')).toBe(true);
      await waitFor(() =>
        expect(deepActiveElement()).toBe(
          byRole('button', 'Reply from Runtime bot Hi')
        )
      );
      await act(async () => {
        mount.instance.requestFocus();
      });
      await waitFor(() => expect(focusIsInInput()).toBe(true));
      await mount.rerender(config());
      expect(await key('F7')).toBe(false);
      expect(await key('F6')).toBe(false);
      expect(focusIsInInput()).toBe(true);
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('shows and hides the home screen of an empty conversation at runtime', async () => {
    const mount = await contractChat(props({ homescreen: { isOn: false } }));
    try {
      expect(mount.instance.state.get().homeScreenState.isHomeScreenOpen).toBe(
        false
      );
      await mount.rerender(
        props({
          homescreen: { isOn: true, greeting: 'Runtime greeting' },
        })
      );
      await waitFor(() =>
        expect(
          mount.instance.state.get().homeScreenState.isHomeScreenOpen
        ).toBe(true)
      );
      await waitFor(() =>
        expect(mainPanelText()).toContain('Runtime greeting')
      );
      await mount.rerender(props({ homescreen: { isOn: false } }));
      await waitFor(() =>
        expect(
          mount.instance.state.get().homeScreenState.isHomeScreenOpen
        ).toBe(false)
      );
      await waitFor(() =>
        expect(mainPanelText()).not.toContain('Runtime greeting')
      );
      await typeText('Back in the conversation');
      expect(mount.instance.state.get().input.rawValue).toBe(
        'Back in the conversation'
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('keeps the public input override through a rerender and clears it on request', async () => {
    const mount = await contractChat(props({ isReadonly: false }));
    try {
      await act(async () => {
        mount.instance.updateInputIsDisabled(true);
      });
      await waitFor(() => expect(inputField().disabled).toBe(true));
      await mount.rerender(
        props({
          isReadonly: false,
          header: { title: 'Updated override host' },
        })
      );
      await waitFor(() =>
        expect(shownText(getByTestId(PageObjectId.HEADER_TITLE))).toBe(
          'Updated override host'
        )
      );
      expect(inputField().disabled).toBe(true);
      await act(async () => {
        mount.instance.updateInputIsDisabled(false);
      });
      await waitFor(() => expect(inputField().disabled).toBe(false));
      await typeText('Editable after clearing');
      expect(mount.instance.state.get().input.rawValue).toBe(
        'Editable after clearing'
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('uses agent input flags and recovers editing through actual desk disconnection callbacks', async () => {
    let callback: ServiceDeskCallback;
    const sent: string[] = [];
    const desk: ServiceDesk = {
      getName: () => 'Input isolation desk',
      startChat: async () => undefined,
      endChat: async () => undefined,
      sendMessageToAgent: async (message) => {
        sent.push(message.input.text);
      },
    };
    const config: Partial<PublicConfig> = props({
      isReadonly: true,
      input: { isDisabled: true, isVisible: false },
      serviceDeskFactory: async (parameters) => {
        callback = parameters.callback;
        return desk;
      },
    });
    const mount = await contractChat(config);
    try {
      await act(() => mount.instance.serviceDesk.startConversation());
      await act(() =>
        callback.agentJoined({
          id: 'agent',
          nickname: 'Ada',
          user_type: UserType.HUMAN,
        })
      );
      await waitFor(() => expect(inputField().disabled).toBe(false));
      expect(isHidden(inputField())).toBe(false);
      await typeText('Before disconnection');
      await click(getByTestId(PageObjectId.INPUT_SEND));
      await waitFor(() => expect(sent).toEqual(['Before disconnection']));
      await act(() =>
        callback.setErrorStatus({
          type: ErrorType.DISCONNECTED,
          isDisconnected: true,
        })
      );
      await waitFor(() => expect(inputField().disabled).toBe(true));
      await act(() =>
        callback.setErrorStatus({
          type: ErrorType.DISCONNECTED,
          isDisconnected: false,
        })
      );
      await waitFor(() => expect(inputField().disabled).toBe(false));
      await typeText('After reconnection');
      await click(getByTestId(PageObjectId.INPUT_SEND));
      await waitFor(() =>
        expect(sent).toEqual(['Before disconnection', 'After reconnection'])
      );
      await act(() => mount.instance.serviceDesk.endConversation());
      await waitFor(() => {
        const assistantField = byTestId(PageObjectId.INPUT);
        expect(assistantField === null || isHidden(assistantField)).toBe(true);
      });
    } finally {
      await act(() => mount.instance.serviceDesk.endConversation());
      await act(async () => mount.unmount());
    }
  });

  it('keeps a shown user-defined response, its typed value and the transcript through an unrelated rerender and an input update', async () => {
    const widget = {
      response_type: MessageResponseTypes.USER_DEFINED,
      user_defined: { name: 'retained-widget' },
    } as GenericItem;
    const renderUserDefinedResponse = () => (
      <input aria-label="Retained widget field" />
    );
    const config = (assistantName: string, title: string) => ({
      ...props({ assistantName, header: { title } }),
      renderUserDefinedResponse,
    });
    const mount = await contractChat(config('Retaining bot', 'Before update'));
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          textResponse('Keep this transcript', 'retained-text')
        )
      );
      await act(() =>
        mount.instance.messaging.addMessage(
          responseOf('retained-widget', [widget])
        )
      );
      const panel = () => getByTestId(PageObjectId.MAIN_PANEL);
      const field = await waitFor(() => {
        const shown = byRole('textbox', 'Retained widget field');
        expect(isShownWithin(shown, panel())).toBe(true);
        return shown as HTMLInputElement;
      });
      await waitFor(() =>
        expect(shownTextNode(panel(), 'Keep this transcript')).not.toBeNull()
      );
      const text = shownTextNode(panel(), 'Keep this transcript');
      // The transcript's nodes are settled before anything changes.
      await pause();
      expect(shownTextNode(panel(), 'Keep this transcript')).toBe(text);
      await act(async () => {
        field.value = 'Typed before the update';
        field.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await mount.rerender(config('Renamed bot', 'After update'));
      await waitFor(() =>
        expect(shownText(getByTestId(PageObjectId.HEADER_TITLE))).toBe(
          'After update'
        )
      );
      await act(() =>
        mount.instance.input.updateContent(() => ({
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Draft' }] },
          ],
        }))
      );
      await waitFor(() =>
        expect(mount.instance.state.get().input.rawValue).toBe('Draft')
      );
      expect(byRole('textbox', 'Retained widget field')).toBe(field);
      expect(field.value).toBe('Typed before the update');
      expect(isShownWithin(field, panel())).toBe(true);
      expect(text.isConnected).toBe(true);
      expect(shownTextNode(panel(), 'Keep this transcript')).toBe(text);
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('applies a runtime change to only starters.isOn, then to only starters.disableDirectSend, with the same items', async () => {
    const items: SuggestionItem[] = [
      {
        id: 'runtime-starter',
        label: 'Runtime starter',
        value: 'runtime starter value',
      },
    ];
    const backend = fakeBackend({ autoResolve: true });
    const messaging = {
      skipWelcome: true,
      customSendMessage: backend.customSendMessage,
    };
    type StarterFlags = { isOn?: boolean; disableDirectSend?: boolean };
    const config = (starters: StarterFlags) =>
      props({ messaging, input: { starters: { items, ...starters } } });
    const starterOptions = () => allByRole('option', 'Runtime starter');
    const mount = await contractChat(config({}));
    try {
      await refocusEditor(mount.instance);
      await waitFor(() => expect(starterOptions()).toHaveLength(1));
      await mount.rerender(config({ isOn: false }));
      await refocusEditor(mount.instance);
      // A short wait proves no list opens.
      await pause();
      expect(starterOptions()).toHaveLength(0);
      await mount.rerender(config({ isOn: true }));
      await refocusEditor(mount.instance);
      await waitFor(() => expect(starterOptions()).toHaveLength(1));
      await mount.rerender(config({ isOn: true, disableDirectSend: true }));
      await refocusEditor(mount.instance);
      await waitFor(() => expect(starterOptions()).toHaveLength(1));
      await click(byRole('option', 'Runtime starter'));
      // A short wait proves no send follows.
      await pause();
      expect(backend.requests).toHaveLength(0);
      expect(mount.instance.state.get().input.rawValue).toBe(
        'runtime starter value'
      );
    } finally {
      await act(async () => mount.unmount());
    }
  });

  it('saves the session under the namespace a running chat is given', async () => {
    const before = 'runtime-session-before';
    const after = 'runtime-session-after';
    const config = (namespace: string) =>
      props({
        namespace,
        strings: {
          window_ariaChatRegionNamespace: 'Session region {namespace}',
        },
      });
    const mount = await contractChat(config(before));
    try {
      await act(() =>
        mount.instance.messaging.addMessage(
          textResponse('Saved before the move', 'session-move')
        )
      );
      expect(readCarbonChatSession(before)).toMatchObject({
        hasSentNonWelcomeMessage: true,
        viewState: { mainWindow: true },
      });
      expect(readCarbonChatSession(after)).toBeNull();
      await mount.rerender(config(after));
      await waitFor(() =>
        expect(allByRole('region', `Session region ${after}`)).toHaveLength(1)
      );
      await changeView(mount.instance, ViewType.LAUNCHER);
      await waitFor(() =>
        expect(readCarbonChatSession(after)).toMatchObject({
          hasSentNonWelcomeMessage: true,
          viewState: { mainWindow: false },
        })
      );
      expect(readCarbonChatSession(before).viewState.mainWindow).toBe(true);
    } finally {
      await act(async () => mount.unmount());
    }
  });
});
