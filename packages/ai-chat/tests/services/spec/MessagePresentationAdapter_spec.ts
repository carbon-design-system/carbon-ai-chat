/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessagePresentationAdapter } from '../../../src/chat/services/MessagePresentationAdapter';
import type { ServiceManager } from '../../../src/sdk/services/ServiceManager';
import {
  hasCustomPromptLine,
  requestComposerFocus,
} from '../../../src/chat/utils/customPromptLine';
import {
  InputViewPort,
  ViewConnection,
} from '../../../src/sdk/services/viewBindings';
import type { MessagePresentationPort } from '../../../src/sdk/services/messaging/presentationPort';
import { idleInstancePort } from '../helpers/viewBindings';

/** A manager whose attached view reports `input` as its input handle. */
function managerWithInput() {
  const input: { current?: Partial<InputViewPort> } = {};
  const view = new ViewConnection();
  view.attach({
    messaging: {} as MessagePresentationPort,
    humanAgent: { requestFocus: () => undefined },
    instance: {
      ...idleInstancePort(),
      input: () => (input.current ?? null) as InputViewPort,
    },
  });
  return { manager: { view } as unknown as ServiceManager, input };
}

it('resolves absent and replaced composer handles for each call', () => {
  const { manager, input } = managerWithInput();
  const handles: { ariaAnnouncer?: (text: string) => void } = {};
  let homeOpen = true;
  let responseOpen = false;
  const closeResponse = jest.fn();
  const closeHome = jest.fn(() => {
    homeOpen = false;
    responseOpen = true;
  });
  const adapter = new MessagePresentationAdapter({
    hasCustomPromptLine: () => hasCustomPromptLine(manager),
    requestComposerFocus: () => requestComposerFocus(manager),
    announceSending: () => handles.ariaAnnouncer?.('sending'),
    isHomeScreenOpen: () => homeOpen,
    closeHomeScreen: closeHome,
    isResponsePanelOpen: () => responseOpen,
    closeResponsePanel: closeResponse,
  });
  expect(adapter.hasCustomPromptLine()).toBe(false);
  expect(() => adapter.requestComposerFocus()).not.toThrow();
  expect(() => adapter.announceSending()).not.toThrow();
  const first = jest.fn(() => true);
  const second = jest.fn(() => true);
  input.current = { requestFocus: first };
  adapter.requestComposerFocus();
  input.current = { requestFocus: second };
  adapter.requestComposerFocus();
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
  input.current = undefined;
  adapter.requestComposerFocus();
  expect(second).toHaveBeenCalledTimes(1);
  adapter.closeHomeScreenIfOpen();
  adapter.closeResponsePanelIfOpen();
  expect(closeResponse).toHaveBeenCalledTimes(1);
  adapter.closeHomeScreenIfOpen();
  expect(closeHome).toHaveBeenCalledTimes(1);
  adapter.closeHomeScreen();
  expect(closeHome).toHaveBeenCalledTimes(2);
});

it('uses the current announcer on each call and tolerates its removal', () => {
  const handles: { ariaAnnouncer?: (text: string) => void } = {};
  const adapter = new MessagePresentationAdapter({
    hasCustomPromptLine: () => false,
    requestComposerFocus: () => false,
    announceSending: () => handles.ariaAnnouncer?.('sending'),
    isHomeScreenOpen: () => false,
    closeHomeScreen: jest.fn(),
    isResponsePanelOpen: () => false,
    closeResponsePanel: jest.fn(),
  });
  expect(() => adapter.announceSending()).not.toThrow();
  const first = jest.fn();
  const replacement = jest.fn();
  handles.ariaAnnouncer = first;
  adapter.announceSending();
  handles.ariaAnnouncer = replacement;
  adapter.announceSending();
  handles.ariaAnnouncer = undefined;
  expect(() => adapter.announceSending()).not.toThrow();
  expect(first).toHaveBeenCalledTimes(1);
  expect(first).toHaveBeenCalledWith('sending');
  expect(replacement).toHaveBeenCalledTimes(1);
  expect(replacement).toHaveBeenCalledWith('sending');
});
