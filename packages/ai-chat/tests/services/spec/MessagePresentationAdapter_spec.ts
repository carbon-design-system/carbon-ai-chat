/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessagePresentationAdapter } from '../../../src/chat/services/MessagePresentationAdapter';
import type { ServiceManager } from '../../../src/shared/services/ServiceManager';
import {
  hasCustomPromptLine,
  requestComposerFocus,
} from '../../../src/chat/utils/customPromptLine';

it('resolves absent and replaced composer handles for each call', () => {
  const manager = {} as ServiceManager;
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
    announceSending: () => manager.ariaAnnouncer?.('sending'),
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
  manager.inputComponent = {
    requestFocus: first,
  } as unknown as ServiceManager['inputComponent'];
  adapter.requestComposerFocus();
  manager.inputComponent = {
    requestFocus: second,
  } as unknown as ServiceManager['inputComponent'];
  adapter.requestComposerFocus();
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
  manager.inputComponent = undefined;
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
  const manager = {} as ServiceManager;
  const adapter = new MessagePresentationAdapter({
    hasCustomPromptLine: () => false,
    requestComposerFocus: () => false,
    announceSending: () => manager.ariaAnnouncer?.('sending'),
    isHomeScreenOpen: () => false,
    closeHomeScreen: jest.fn(),
    isResponsePanelOpen: () => false,
    closeResponsePanel: jest.fn(),
  });
  expect(() => adapter.announceSending()).not.toThrow();
  const first = jest.fn();
  const replacement = jest.fn();
  manager.ariaAnnouncer = first;
  adapter.announceSending();
  manager.ariaAnnouncer = replacement;
  adapter.announceSending();
  manager.ariaAnnouncer = undefined;
  expect(() => adapter.announceSending()).not.toThrow();
  expect(first).toHaveBeenCalledTimes(1);
  expect(first).toHaveBeenCalledWith('sending');
  expect(replacement).toHaveBeenCalledTimes(1);
  expect(replacement).toHaveBeenCalledWith('sending');
});
