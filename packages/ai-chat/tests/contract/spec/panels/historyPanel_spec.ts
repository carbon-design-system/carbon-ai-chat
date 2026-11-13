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
  BusEventType,
  ChatInstance,
  PanelType,
  PublicConfig,
} from '../../../../src/aiChatEntry';
import {
  allByRole,
  byRole,
  click,
  contractChat,
  contractSetup,
  flatChildren,
  isHidden,
  pause,
  recordEvents,
  textResponse,
} from '../../helpers';

// Copy the tests set through `strings`, so they find controls by an accessible
// name they own rather than by the chat's default text.
const STRINGS = {
  history_new_chat: 'Contract new chat',
  history_view_chats: 'Contract view chats',
};

const HISTORY_EVENTS = [
  BusEventType.HISTORY_PANEL_NEW_CHAT,
  BusEventType.HISTORY_PANEL_PRE_OPEN,
];

/** Mounts an open chat with history on and the test strings. */
async function mountWithHistory(history: PublicConfig['history'] = {}) {
  return contractChat({
    openChatByDefault: true,
    messaging: { skipWelcome: true },
    history: { isOn: true, ...history },
    strings: STRINGS,
  });
}

function historyPanel(instance: ChatInstance) {
  return instance.customPanels.getPanel(PanelType.HISTORY);
}

/** Writes a span into the history panel's writeable element. */
function writeHistoryContent(instance: ChatInstance): HTMLElement {
  const span = document.createElement('span');
  span.textContent = 'Contract history content';
  instance.writeableElements.historyPanelElement.append(span);
  return span;
}

/** Whether a node shows anywhere in the flat tree a user sees. */
function isInFlatTree(target: Node): boolean {
  const visit = (node: Node): boolean =>
    node === target || flatChildren(node).some(visit);
  return visit(document.body);
}

// @covers state.customPanels.history.isMobile config.history
describe('history panel layout state', () => {
  contractSetup();

  // `ChatContainer` floats, and a floating chat always takes the history
  // panel's mobile layout.
  it('reports isMobile in a ChatContainer chat with history on', async () => {
    const { instance } = await mountWithHistory();
    expect(instance.state.get().customPanels.history).toEqual({
      isOpen: false,
      isMobile: true,
    });
  });

  it('reports isMobile in a ChatContainer chat with history off too', async () => {
    const { instance } = await contractChat({ openChatByDefault: true });
    expect(instance.state.get().customPanels.history.isMobile).toBe(true);
  });
});

// @covers config.history config.history.showMobileMenu event.history:newChat
// @covers event.historyPanel:pre:open state.customPanels.history.isMobile
describe('mobile history menu', () => {
  contractSetup();

  it('offers new chat and view chats in the header menu by default', async () => {
    await mountWithHistory();
    expect(allByRole('menuitem', STRINGS.history_new_chat)).toHaveLength(1);
    expect(allByRole('menuitem', STRINGS.history_view_chats)).toHaveLength(1);
  });

  it('offers neither with showMobileMenu false', async () => {
    await mountWithHistory({ showMobileMenu: false });
    expect(allByRole('menuitem', STRINGS.history_new_chat)).toHaveLength(0);
    expect(allByRole('menuitem', STRINGS.history_view_chats)).toHaveLength(0);
  });

  it('offers neither with history off', async () => {
    await contractChat({ openChatByDefault: true, strings: STRINGS });
    expect(allByRole('menuitem', STRINGS.history_new_chat)).toHaveLength(0);
    expect(allByRole('menuitem', STRINGS.history_view_chats)).toHaveLength(0);
  });

  it('fires history:newChat from new chat, and opens nothing', async () => {
    const { instance } = await mountWithHistory();
    const events = recordEvents(instance, HISTORY_EVENTS);
    await click(byRole('menuitem', STRINGS.history_new_chat));
    expect(events.events).toEqual([
      { type: BusEventType.HISTORY_PANEL_NEW_CHAT },
    ]);
    // A short wait to show the panel doesn't open.
    await pause();
    expect(instance.state.get().customPanels.history.isOpen).toBe(false);
  });

  it('leaves the conversation alone on new chat', async () => {
    const { instance } = await mountWithHistory();
    const events = recordEvents(instance, [
      BusEventType.PRE_RESTART_CONVERSATION,
      BusEventType.RESTART_CONVERSATION,
    ]);
    await act(() =>
      instance.messaging.addMessage(textResponse('Hello', 'r-history'))
    );
    await click(byRole('menuitem', STRINGS.history_new_chat));
    // A short wait to show no restart follows.
    await pause();
    expect(instance.state.get().messages.map((message) => message.id)).toEqual([
      'r-history',
    ]);
    expect(events.types()).toEqual([]);
  });

  it('fires historyPanel:pre:open from view chats, then opens the history panel', async () => {
    const { instance } = await mountWithHistory();
    const events = recordEvents(instance, HISTORY_EVENTS);
    await click(byRole('menuitem', STRINGS.history_view_chats));
    expect(events.events).toEqual([
      { type: BusEventType.HISTORY_PANEL_PRE_OPEN },
    ]);
    await waitFor(() =>
      expect(instance.state.get().customPanels.history).toEqual({
        isOpen: true,
        isMobile: true,
      })
    );
  });
});

// @covers event.historyPanel:pre:open instance.customPanels.getPanel().open
// @covers instance.customPanels.getPanel().close state.customPanels.history.isOpen
describe('history panel through customPanels', () => {
  contractSetup();

  it('fires no history event when getPanel(HISTORY) opens and closes it', async () => {
    const { instance } = await mountWithHistory();
    const events = recordEvents(instance, HISTORY_EVENTS);
    await act(() => historyPanel(instance).open());
    expect(instance.state.get().customPanels.history.isOpen).toBe(true);
    await act(() => historyPanel(instance).close());
    // A short wait to show nothing fires.
    await pause();
    expect(events.types()).toEqual([]);
  });

  it('turns isOpen true with history off, though nothing shows', async () => {
    const { instance } = await contractChat({ openChatByDefault: true });
    const content = writeHistoryContent(instance);
    await act(() => historyPanel(instance).open());
    expect(instance.state.get().customPanels.history.isOpen).toBe(true);
    // A short wait to show the content stays out of view.
    await pause(300);
    expect(isInFlatTree(content)).toBe(false);
  });
});

// @covers writeable-element.historyPanelElement instance.customPanels.getPanel().open
// @covers instance.customPanels.getPanel().close config.history
describe('historyPanelElement', () => {
  contractSetup();

  it('is hidden while the mobile history panel is closed', async () => {
    const { instance } = await mountWithHistory();
    const content = writeHistoryContent(instance);
    // A short wait to show it stays hidden.
    await pause();
    expect(isHidden(content)).toBe(true);
  });

  it('shows while the history panel is open, and hides again once it closes', async () => {
    const { instance } = await mountWithHistory();
    const content = writeHistoryContent(instance);
    await act(() => historyPanel(instance).open());
    await waitFor(() => expect(isHidden(content)).toBe(false));

    await act(() => historyPanel(instance).close());
    await waitFor(() => expect(isHidden(content)).toBe(true));
  });

  it('shows once view chats opens the history panel', async () => {
    const { instance } = await mountWithHistory();
    const content = writeHistoryContent(instance);
    await click(byRole('menuitem', STRINGS.history_view_chats));
    await waitFor(() => expect(isHidden(content)).toBe(false));
  });
});
