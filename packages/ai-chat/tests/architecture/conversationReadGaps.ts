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
 * as its path, or a use of a reader that reads one, written as `name()`. Each
 * entry counts every occurrence in its file, so a second read, or one through
 * an alias, fails the spec until the entry changes.
 *
 * Owners:
 * - #2693: messages and message items, which the message model replaces, and
 *   restart in progress.
 * - #2352: the agent state the interface shows beyond the connection.
 * - #2351: pending uploads. #1816: whether the turn can be stopped.
 * - #2747: read-only state, the history load trigger, and attaching the view.
 * - #2748: the shell's home screen and loading decisions.
 * - #2751: the input slice, its routing to the agent, and its flags.
 * - #1741: slot bookkeeping. #1732: saving the session.
 * - #1833: config updates.
 */

interface ConversationReadGap {
  /** The package-relative file that reads. */
  file: string;
  /** The field path, or the reader it calls. */
  read: string;
  /** How many times the file reads it. */
  count: number;
  /** The issue whose work moves the read. */
  owner: `#${number}`;
}

const conversationReadGaps: ConversationReadGap[] = [
  {
    file: 'src/chat/AppShell.tsx',
    read: 'allMessageItemsByID',
    count: 1,
    owner: '#2693',
  },
  {
    file: 'src/chat/AppShell.tsx',
    read: 'assistantMessageState',
    count: 1,
    owner: '#2693',
  },
  {
    file: 'src/chat/AppShellPanels.tsx',
    read: 'allMessagesByID',
    count: 1,
    owner: '#2693',
  },
  {
    file: 'src/chat/components-legacy/humanAgent/HumanAgentBanner.tsx',
    read: 'humanAgentState',
    count: 1,
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/humanAgent/HumanAgentBanner.tsx',
    read: 'selectHumanAgentDisplayState()',
    count: 1,
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/humanAgent/HumanAgentBannerContainer.tsx',
    read: 'humanAgentState',
    count: 1,
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/humanAgent/HumanAgentBannerContainer.tsx',
    read: 'selectHumanAgentDisplayState()',
    count: 1,
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/MessagesComponent.tsx',
    read: 'allMessagesByID',
    count: 1,
    owner: '#2693',
  },
  {
    file: 'src/chat/components-legacy/MessagesComponent.tsx',
    read: 'humanAgentState',
    count: 1,
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/MessagesComponent.tsx',
    read: 'persistedToBrowserStorage',
    count: 1,
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/MessagesComponent.tsx',
    read: 'selectHumanAgentDisplayState()',
    count: 4,
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/MessagesComponent.tsx',
    read: 'selectInputIsReadonly()',
    count: 1,
    owner: '#2747',
  },
  {
    file: 'src/chat/components-legacy/MessagesComponent.tsx',
    read: 'selectMessagesState()',
    count: 1,
    owner: '#2693',
  },
  {
    file: 'src/chat/components-legacy/responseTypes/grid/GridItemCell.tsx',
    read: 'allMessageItemsByID',
    count: 1,
    owner: '#2693',
  },
  {
    file: 'src/chat/components-legacy/responseTypes/grid/GridItemCell.tsx',
    read: 'selectInputIsReadonly()',
    count: 1,
    owner: '#2747',
  },
  {
    file: 'src/chat/components-legacy/responseTypes/humanAgent/ConnectToHumanAgent.tsx',
    read: 'humanAgentState',
    count: 1,
    owner: '#2352',
  },
  {
    file: 'src/chat/components-legacy/responseTypes/humanAgent/ConnectToHumanAgent.tsx',
    read: 'selectHumanAgentDisplayState()',
    count: 1,
    owner: '#2352',
  },
  {
    file: 'src/chat/components/header/chat-header.ts',
    read: 'isRestarting',
    count: 1,
    owner: '#2693',
  },
  {
    file: 'src/chat/components/header/chat-header.ts',
    read: 'selectHumanAgentDisplayState()',
    count: 1,
    owner: '#2352',
  },
  {
    file: 'src/chat/components/input/ChatInput.ts',
    read: 'restoreInputDraft()',
    count: 1,
    owner: '#2751',
  },
  {
    file: 'src/chat/components/input/ChatInput.ts',
    read: 'selectInputState()',
    count: 2,
    owner: '#2751',
  },
  {
    file: 'src/chat/components/input/ChatInput.ts',
    read: 'selectIsInputToHumanAgent()',
    count: 8,
    owner: '#2751',
  },
  {
    file: 'src/chat/components/responseTypes/button/ButtonItemCustomEventComponent.tsx',
    read: 'selectInputIsReadonly()',
    count: 1,
    owner: '#2747',
  },
  {
    file: 'src/chat/components/responseTypes/button/ButtonItemPostBackComponent.tsx',
    read: 'selectInputIsReadonly()',
    count: 1,
    owner: '#2747',
  },
  {
    file: 'src/chat/components/responseTypes/button/ButtonItemShowPanelComponent.tsx',
    read: 'selectInputIsReadonly()',
    count: 1,
    owner: '#2747',
  },
  {
    file: 'src/chat/components/responseTypes/button/FooterButtonComponents.tsx',
    read: 'allMessageItemsByID',
    count: 1,
    owner: '#2693',
  },
  {
    file: 'src/chat/components/responseTypes/card/CardItemComponent.tsx',
    read: 'selectInputIsReadonly()',
    count: 1,
    owner: '#2747',
  },
  {
    file: 'src/chat/components/responseTypes/card/CarouselItemComponent.tsx',
    read: 'allMessageItemsByID',
    count: 1,
    owner: '#2693',
  },
  {
    file: 'src/chat/components/responseTypes/datePicker/DatePickerComponent.tsx',
    read: 'allMessagesByID',
    count: 1,
    owner: '#2693',
  },
  {
    file: 'src/chat/components/responseTypes/message/BodyMessageComponents.tsx',
    read: 'allMessageItemsByID',
    count: 1,
    owner: '#2693',
  },
  {
    file: 'src/chat/components/shell/ChatShell.ts',
    read: 'selectShellState()',
    count: 2,
    owner: '#2748',
  },
  {
    file: 'src/chat/hooks/useInputCallbacks.tsx',
    read: 'requestComposerFocus()',
    count: 1,
    owner: '#2751',
  },
  {
    file: 'src/chat/hooks/useInputCallbacks.tsx',
    read: 'selectInputIsDisabled()',
    count: 1,
    owner: '#2751',
  },
  {
    file: 'src/chat/hooks/useInputCallbacks.tsx',
    read: 'selectInputIsReadonly()',
    count: 1,
    owner: '#2747',
  },
  {
    file: 'src/chat/hooks/useInputCallbacks.tsx',
    read: 'selectInputUploads()',
    count: 1,
    owner: '#2351',
  },
  {
    file: 'src/chat/services/attachChatView.ts',
    read: 'attachViewState()',
    count: 1,
    owner: '#2747',
  },
  {
    file: 'src/chat/services/attachChatView.ts',
    read: 'persistedToBrowserStorage',
    count: 2,
    owner: '#1732',
  },
  {
    file: 'src/chat/services/attachChatView.ts',
    read: 'saveSessionOnChange()',
    count: 1,
    owner: '#1732',
  },
  {
    file: 'src/chat/services/createViewBindings.ts',
    read: 'requestComposerFocus()',
    count: 1,
    owner: '#2751',
  },
  {
    file: 'src/chat/services/CustomPanelInstance.ts',
    read: 'allMessageItemsByID',
    count: 2,
    owner: '#2693',
  },
  {
    file: 'src/chat/services/CustomPanelInstance.ts',
    read: 'allMessagesByID',
    count: 3,
    owner: '#2693',
  },
  {
    file: 'src/chat/services/CustomPanelInstance.ts',
    read: 'captureMessageEvent()',
    count: 2,
    owner: '#2693',
  },
  {
    file: 'src/chat/services/CustomPanelManager.ts',
    read: 'createCustomPanelInstance()',
    count: 3,
    owner: '#2693',
  },
  {
    file: 'src/chat/services/extensionHosts.ts',
    read: 'allMessagesByID',
    count: 1,
    owner: '#1741',
  },
  {
    file: 'src/chat/services/inputCallbacks.ts',
    read: 'selectInputState()',
    count: 2,
    owner: '#2751',
  },
  {
    file: 'src/chat/services/inputCallbacks.ts',
    read: 'selectIsInputToHumanAgent()',
    count: 1,
    owner: '#2751',
  },
  {
    file: 'src/chat/services/ViewService.ts',
    read: 'isHydrated',
    count: 1,
    owner: '#2747',
  },
  {
    file: 'src/chat/utils/appConfigUpdates.ts',
    read: 'applyConfigChangesDynamically()',
    count: 1,
    owner: '#1833',
  },
  {
    file: 'src/chat/utils/chatBoot.ts',
    read: 'attachChatView()',
    count: 1,
    owner: '#2747',
  },
  {
    file: 'src/chat/utils/chatBoot.ts',
    read: 'createCustomPanelManager()',
    count: 1,
    owner: '#2693',
  },
  {
    // Hands the instance builder, which wraps the two reads around it, to
    // createChatSDK; it goes when they do.
    file: 'src/chat/utils/chatBoot.ts',
    read: 'createPrebuiltInstance()',
    count: 1,
    owner: '#2747',
  },
  {
    file: 'src/chat/utils/chatBoot.ts',
    read: 'selectInputIsReadonly()',
    count: 1,
    owner: '#2747',
  },
  {
    file: 'src/chat/utils/customPromptLine.ts',
    read: 'selectCustomPromptLineVisible()',
    count: 1,
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/customPromptLine.ts',
    read: 'selectInputState()',
    count: 1,
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/dynamicConfigUpdates.ts',
    read: 'assistantMessageState.messageIDs',
    count: 2,
    owner: '#2693',
  },
  {
    file: 'src/chat/utils/restoreInputDraft.ts',
    read: 'selectInputState()',
    count: 2,
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/restoreInputDraft.ts',
    read: 'selectIsInputToHumanAgent()',
    count: 1,
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'allMessagesByID',
    count: 3,
    owner: '#2693',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'humanAgentState.fileUploadInProgress',
    count: 2,
    owner: '#2352',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'humanAgentState.showScreenShareRequest',
    count: 2,
    owner: '#2352',
  },
  // Also #2751: the shell disables send until history loads.
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'isHydrated',
    count: 5,
    owner: '#2748',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'persistedToBrowserStorage',
    count: 1,
    owner: '#2748',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'persistedToBrowserStorage.hasSentNonWelcomeMessage',
    count: 3,
    owner: '#2748',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'requestComposerFocus()',
    count: 6,
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'selectCustomPromptLineVisible()',
    count: 2,
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'selectHumanAgentDisplayState()',
    count: 4,
    owner: '#2352',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'selectInputFieldVisible()',
    count: 2,
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'selectInputIsDisabled()',
    count: 2,
    owner: '#2751',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'selectInputIsReadonly()',
    count: 2,
    owner: '#2747',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'selectInputUploadAndStreamingFields()',
    count: 3,
    owner: '#2351',
  },
  {
    file: 'src/chat/utils/shellLifecycle.ts',
    read: 'selectStopStreamingButtonVisible()',
    count: 2,
    owner: '#1816',
  },
];

export { conversationReadGaps };
export type { ConversationReadGap };
