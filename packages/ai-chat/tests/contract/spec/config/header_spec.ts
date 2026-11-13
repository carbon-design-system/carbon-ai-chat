/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Add16 from '@carbon/icons/es/add/16.js';
import { act, waitFor } from '@testing-library/react';

import {
  BusEventType,
  HeaderConfig,
  PageObjectId,
  PublicConfig,
  ViewType,
} from '../../../../src/aiChatEntry';
import {
  allByRole,
  byRole,
  byTestId,
  changeView,
  click,
  contractChat,
  contractSetup,
  getByTestId,
  recordEvents,
  shownText,
  textResponse,
} from '../../helpers';

// Copy the tests set through `strings`, so they find controls by an accessible
// name they own rather than by the chat's default text.
const STRINGS = {
  buttons_restart: 'Contract restart',
  launcher_isOpen: 'Contract close',
  ai_slug_label: 'Contract AI label',
  ai_slug_title: 'Contract AI title',
};

/** Mounts a chat with the test strings and this header, and opens it. */
async function openWithHeader(
  header: HeaderConfig,
  config: Partial<PublicConfig> = {}
) {
  const mount = await contractChat({
    ...config,
    strings: STRINGS,
    header,
    messaging: { skipWelcome: true },
  });
  await changeView(mount.instance, ViewType.MAIN_WINDOW);
  return mount;
}

/** Children of a node in the flat tree: its shadow tree, or what a slot shows. */
function flatChildren(node: Node): Node[] {
  if (node instanceof Element && node.shadowRoot) {
    return Array.from(node.shadowRoot.childNodes);
  }
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedNodes();
    return assigned.length ? assigned : Array.from(node.childNodes);
  }
  return Array.from(node.childNodes);
}

/** The labels of `elements`, in the order a user meets them in the flat tree. */
function flatOrder(elements: Map<Element, string>): string[] {
  const seen: string[] = [];
  const visit = (node: Node) => {
    const label = elements.get(node as Element);
    if (label) {
      seen.push(label);
    }
    flatChildren(node).forEach(visit);
  };
  visit(document.body);
  return seen;
}

// @covers config.header config.header.title config.header.name
describe('header title and name', () => {
  contractSetup();

  it('shows header.title and header.name under their test IDs', async () => {
    await openWithHeader({ title: 'Contract title', name: 'Contract name' });
    expect(shownText(getByTestId(PageObjectId.HEADER_TITLE)).trim()).toBe(
      'Contract title'
    );
    expect(shownText(getByTestId(PageObjectId.HEADER_NAME)).trim()).toBe(
      'Contract name'
    );
  });

  it('shows no title or name text when neither is set', async () => {
    await openWithHeader({});
    for (const id of [PageObjectId.HEADER_TITLE, PageObjectId.HEADER_NAME]) {
      const element = byTestId(id);
      expect(element === null ? '' : shownText(element).trim()).toBe('');
    }
  });
});

// @covers config.header config.header.hideMinimizeButton
describe('header.hideMinimizeButton', () => {
  contractSetup();

  it('shows the close button by default', async () => {
    await openWithHeader({});
    expect(byTestId(PageObjectId.CLOSE_CHAT)).not.toBeNull();
    expect(allByRole('button', STRINGS.launcher_isOpen)).toHaveLength(1);
  });

  it('removes the close button when true', async () => {
    await openWithHeader({ hideMinimizeButton: true });
    expect(byTestId(PageObjectId.CLOSE_CHAT)).toBeNull();
    expect(allByRole('button', STRINGS.launcher_isOpen)).toHaveLength(0);
  });
});

// @covers config.header config.header.showRestartButton
// @covers event.pre:restartConversation event.restartConversation
describe('header.showRestartButton', () => {
  contractSetup();

  it('shows no restart button by default', async () => {
    await openWithHeader({});
    expect(allByRole('button', STRINGS.buttons_restart)).toHaveLength(0);
  });

  it('shows a restart button when true', async () => {
    await openWithHeader({ showRestartButton: true });
    expect(allByRole('button', STRINGS.buttons_restart)).toHaveLength(1);
  });

  it('restarts the conversation when the user clicks it', async () => {
    const { instance } = await openWithHeader({ showRestartButton: true });
    await act(() => instance.messaging.addMessage(textResponse('Hi', 'r1')));
    const events = recordEvents(instance, [
      BusEventType.PRE_RESTART_CONVERSATION,
      BusEventType.RESTART_CONVERSATION,
    ]);
    await click(byRole('button', STRINGS.buttons_restart));
    await waitFor(() =>
      expect(events.types()).toEqual([
        BusEventType.PRE_RESTART_CONVERSATION,
        BusEventType.RESTART_CONVERSATION,
      ])
    );
    expect(instance.getState().messages).toEqual([]);
  });
});

// @covers config.header config.header.actions
describe('header.actions', () => {
  contractSetup();

  it('shows each action as a button named by its text', async () => {
    await openWithHeader({
      actions: [
        { text: 'Contract action A', icon: Add16, onClick: () => {} },
        { text: 'Contract action B', icon: Add16, onClick: () => {} },
      ],
    });
    expect(allByRole('button', 'Contract action A')).toHaveLength(1);
    expect(allByRole('button', 'Contract action B')).toHaveLength(1);
  });

  it('calls only the clicked action’s onClick', async () => {
    const onA = jest.fn();
    const onB = jest.fn();
    await openWithHeader({
      actions: [
        { text: 'Contract action A', icon: Add16, onClick: onA },
        { text: 'Contract action B', icon: Add16, onClick: onB },
      ],
    });
    await click(byRole('button', 'Contract action B'));
    expect(onA).not.toHaveBeenCalled();
    expect(onB).toHaveBeenCalledTimes(1);
  });

  it('puts the custom actions before the restart and close buttons', async () => {
    await openWithHeader({
      showRestartButton: true,
      actions: [{ text: 'Contract action A', icon: Add16, onClick: () => {} }],
    });
    const order = flatOrder(
      new Map([
        [byRole('button', STRINGS.buttons_restart), 'restart'],
        [byRole('button', 'Contract action A'), 'action'],
        [byRole('button', STRINGS.launcher_isOpen), 'close'],
      ])
    );
    expect(order).toEqual(['action', 'restart', 'close']);
  });
});

// @covers config.header config.header.hideDefaultAiLabelContent
describe('header.hideDefaultAiLabelContent', () => {
  contractSetup();

  it('keeps the default AI label content by default', async () => {
    await openWithHeader({});
    expect(shownText(document.body)).toContain(STRINGS.ai_slug_title);
  });

  it('removes the default AI label content when true, keeping the AI label', async () => {
    await openWithHeader({ hideDefaultAiLabelContent: true });
    expect(shownText(document.body)).not.toContain(STRINGS.ai_slug_title);
    expect(allByRole('button', STRINGS.ai_slug_label)).toHaveLength(1);
  });
});
