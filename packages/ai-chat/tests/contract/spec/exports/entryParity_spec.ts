/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Which runtime values each entry exports, and that a name both export is the
 * same value. Types are erased at runtime, so only values show here. The
 * shared functions' behavior is pinned per entry in `inputUtils_spec`.
 *
 * This file mounts no chat, so it doesn't call `contractSetup()`.
 */

import * as aiChatEntry from '../../../../src/aiChatEntry';
import * as serverEntry from '../../../../src/serverEntry';

/** Runtime values both entries export. */
const SHARED = [
  'BusEventType',
  'ButtonItemKind',
  'ButtonItemType',
  'CHAT_BUTTON_KIND',
  'CHAT_BUTTON_SIZE',
  'CancellationReason',
  'CarbonTheme',
  'ChainOfThoughtStepStatus',
  'CornersType',
  'ErrorType',
  'FeedbackInteractionType',
  'FileStatusValue',
  'HeaderMenuClickType',
  'HumanAgentMessageType',
  'HumanAgentsOnlineStatus',
  'IFrameItemDisplayOption',
  'LayoutCustomProperties',
  'MessageErrorState',
  'MessageInputType',
  'MessageResponseTypes',
  'MessageSendSource',
  'MessageState',
  'MinimizeButtonIconType',
  'OnErrorType',
  'OptionItemPreference',
  'PageObjectId',
  'PanelType',
  'ReasoningStepOpenState',
  'ScreenShareState',
  'SelectionDisplay',
  'UserType',
  'ViewChangeReason',
  'ViewType',
  'WidthOptions',
  'WriteableElementName',
  'buildCarbonExtensions',
  'carbonAutocomplete',
  'carbonCommand',
  'carbonMention',
  'carbonStarterTrigger',
  'enLanguagePack',
  'findNodesByType',
  'getRawText',
  'mapNodes',
  'removeNodesByType',
  'setHostOriginMeta',
  'textToDoc',
];

/** Runtime values only the browser entry exports. */
const AI_CHAT_ENTRY_ONLY = [
  'ChatContainer',
  'ChatCustomElement',
  'readCarbonChatSession',
  'renderInLightDom',
  'renderTokenChip',
];

/**
 * Runtime values only the server entry exports. The browser entry exports
 * `loadAllLazyDeps` as a type only.
 */
const SERVER_ENTRY_ONLY = ['loadAllLazyDeps'];

function namesOf(entry: object): string[] {
  return Object.keys(entry).sort();
}

describe('entry exports', () => {
  it('aiChatEntry exports exactly these runtime values', () => {
    expect(namesOf(aiChatEntry)).toEqual(
      [...SHARED, ...AI_CHAT_ENTRY_ONLY].sort()
    );
  });

  it('serverEntry exports exactly these runtime values', () => {
    expect(namesOf(serverEntry)).toEqual(
      [...SHARED, ...SERVER_ENTRY_ONLY].sort()
    );
  });

  it.each(SHARED)('%s is the same value in both entries', (name) => {
    const fromAiChat = (aiChatEntry as Record<string, unknown>)[name];
    const fromServer = (serverEntry as Record<string, unknown>)[name];
    expect(typeof fromServer).toBe(typeof fromAiChat);
    if (typeof fromAiChat !== 'function') {
      expect(fromServer).toEqual(fromAiChat);
    }
  });
});
