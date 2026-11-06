/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Every read of conversation data by the prebuilt interface that doesn't go
 * through `instance.state` yet, with the issue whose work moves it (#2693 O3).
 * `conversationReadGaps_spec.ts` fails on a read that isn't listed, and on an
 * entry that no longer matches a read, so the list only shrinks.
 *
 * A read is a conversation-partition field read from the store state, written
 * as its path, or a use of a selector that reads one, written as `name()`. Each
 * file lists each read once.
 *
 * Owners:
 * - #2693: messages and message items, which the message model replaces, and
 *   restart in progress.
 * - #2352: the agent state the interface shows beyond the connection.
 * - #2351: pending uploads. #1816: whether the turn can be stopped.
 * - #2747: read-only state and the history load trigger.
 * - #2748: the shell's home screen and loading decisions.
 * - #2751: the input slice, its routing to the agent, and its flags.
 * - #1741: slot bookkeeping. #1732: saving the session.
 */

interface ConversationReadGap {
  /** The package-relative file that reads. */
  file: string;
  /** The field path or selector it reads. */
  read: string;
  /** The issue whose work moves the read. */
  owner: `#${number}`;
}

const conversationReadGaps: ConversationReadGap[] = [
  {
    file: 'src/chat/AppShell.tsx',
    read: 'allMessageItemsByID',
    owner: '#2693',
  },
  {
    file: 'src/chat/AppShell.tsx',
    read: 'assistantMessageState',
    owner: '#2693',
  },
  {
    file: 'src/chat/AppShellPanels.tsx',
    read: 'allMessagesByID',
    owner: '#2693',
  },
  {
    file: 'src/chat/components-legacy/MessagesComponent.tsx',
    read: 'allMessagesByID',
    owner: '#2693',
  },
  {
    file: 'src/chat/components-legacy/MessagesComponent.tsx',
    read: 'humanAgentState',
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/MessagesComponent.tsx',
    read: 'persistedToBrowserStorage',
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/MessagesComponent.tsx',
    read: 'selectHumanAgentDisplayState()',
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/MessagesComponent.tsx',
    read: 'selectInputIsReadonly()',
    owner: '#2747',
  },
  {
    file: 'src/chat/components-legacy/MessagesComponent.tsx',
    read: 'selectMessagesState()',
    owner: '#2693',
  },
  {
    file: 'src/chat/components-legacy/humanAgent/HumanAgentBanner.tsx',
    read: 'humanAgentState',
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/humanAgent/HumanAgentBanner.tsx',
    read: 'selectHumanAgentDisplayState()',
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/humanAgent/HumanAgentBannerContainer.tsx',
    read: 'humanAgentState',
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/humanAgent/HumanAgentBannerContainer.tsx',
    read: 'selectHumanAgentDisplayState()',
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/responseTypes/grid/GridItemCell.tsx',
    read: 'allMessageItemsByID',
    owner: '#2693',
  },
  {
    file: 'src/chat/components-legacy/responseTypes/grid/GridItemCell.tsx',
    read: 'selectInputIsReadonly()',
    owner: '#2747',
  },
  {
    file: 'src/chat/components-legacy/responseTypes/humanAgent/ConnectToHumanAgent.tsx',
    read: 'humanAgentState',
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/responseTypes/humanAgent/ConnectToHumanAgent.tsx',
    read: 'selectHumanAgentDisplayState()',
    owner: '#2352',
  },
  {
    file: 'src/chat/components/header/chat-header.ts',
    read: 'isRestarting',
    owner: '#2693',
  },
  {
    file: 'src/chat/components/header/chat-header.ts',
    read: 'selectHumanAgentDisplayState()',
    owner: '#2352',
  },
  {
    file: 'src/chat/components/input/ChatInput.ts',
    read: 'selectInputState()',
    owner: '#2751',
  },
  {
    file: 'src/chat/components/input/ChatInput.ts',
    read: 'selectIsInputToHumanAgent()',
    owner: '#2751',
  },
  {
    file: 'src/chat/components/responseTypes/button/ButtonItemCustomEventComponent.tsx',
    read: 'selectInputIsReadonly()',
    owner: '#2747',
  },
  {
    file: 'src/chat/components/responseTypes/button/ButtonItemPostBackComponent.tsx',
    read: 'selectInputIsReadonly()',
    owner: '#2747',
  },
  {
    file: 'src/chat/components/responseTypes/button/ButtonItemShowPanelComponent.tsx',
    read: 'selectInputIsReadonly()',
    owner: '#2747',
  },
  {
    file: 'src/chat/components/responseTypes/button/FooterButtonComponents.tsx',
    read: 'allMessageItemsByID',
    owner: '#2693',
  },
  {
    file: 'src/chat/components/responseTypes/card/CardItemComponent.tsx',
    read: 'selectInputIsReadonly()',
    owner: '#2747',
  },
  {
    file: 'src/chat/components/responseTypes/card/CarouselItemComponent.tsx',
    read: 'allMessageItemsByID',
    owner: '#2693',
  },
  {
    file: 'src/chat/components/responseTypes/datePicker/DatePickerComponent.tsx',
    read: 'allMessagesByID',
    owner: '#2693',
  },
  {
    file: 'src/chat/components/responseTypes/message/BodyMessageComponents.tsx',
    read: 'allMessageItemsByID',
    owner: '#2693',
  },
  {
    file: 'src/chat/components/shell/ChatShell.ts',
    read: 'selectShellState()',
    owner: '#2748',
  },
  {
    file: 'src/chat/hooks/useInputCallbacks.tsx',
    read: 'selectInputIsDisabled()',
    owner: '#2751',
  },
  {
    file: 'src/chat/hooks/useInputCallbacks.tsx',
    read: 'selectInputIsReadonly()',
    owner: '#2747',
  },
  {
    file: 'src/chat/hooks/useInputCallbacks.tsx',
    read: 'selectInputUploads()',
    owner: '#2351',
  },
  {
    file: 'src/chat/services/CustomPanelInstance.ts',
    read: 'allMessageItemsByID',
    owner: '#2693',
  },
  {
    file: 'src/chat/services/CustomPanelInstance.ts',
    read: 'allMessagesByID',
    owner: '#2693',
  },
  {
    file: 'src/chat/services/ViewService.ts',
    read: 'isHydrated',
    owner: '#2747',
  },
  {
    file: 'src/chat/services/attachChatView.ts',
    read: 'persistedToBrowserStorage',
    owner: '#1732',
  },
  {
    file: 'src/chat/services/extensionHosts.ts',
    read: 'allMessagesByID',
    owner: '#1741',
  },
  {
    file: 'src/chat/services/inputCallbacks.ts',
    read: 'selectInputState()',
    owner: '#2751',
  },
  {
    file: 'src/chat/services/inputCallbacks.ts',
    read: 'selectInputUploads()',
    owner: '#2351',
  },
  {
    file: 'src/chat/services/inputCallbacks.ts',
    read: 'selectIsInputToHumanAgent()',
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/chatBoot.ts',
    read: 'selectInputIsReadonly()',
    owner: '#2747',
  },
  {
    file: 'src/chat/utils/customPromptLine.ts',
    read: 'selectCustomPromptLineVisible()',
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/customPromptLine.ts',
    read: 'selectInputState()',
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/dynamicConfigUpdates.ts',
    read: 'assistantMessageState.messageIDs',
    owner: '#2693',
  },
  {
    file: 'src/chat/utils/restoreInputDraft.ts',
    read: 'selectInputState()',
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/restoreInputDraft.ts',
    read: 'selectIsInputToHumanAgent()',
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'allMessagesByID',
    owner: '#2693',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'humanAgentState.fileUploadInProgress',
    owner: '#2352',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'humanAgentState.showScreenShareRequest',
    owner: '#2352',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'isHydrated',
    owner: '#2748',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'persistedToBrowserStorage',
    owner: '#2748',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'persistedToBrowserStorage.hasSentNonWelcomeMessage',
    owner: '#2748',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'selectCustomPromptLineVisible()',
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'selectHumanAgentDisplayState()',
    owner: '#2352',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'selectInputFieldVisible()',
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'selectInputIsDisabled()',
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'selectInputIsReadonly()',
    owner: '#2747',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'selectInputUploadAndStreamingFields()',
    owner: '#2351',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'selectShellState()',
    owner: '#2748',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'selectStopStreamingButtonVisible()',
    owner: '#1816',
  },
];

export { conversationReadGaps };
export type { ConversationReadGap };
