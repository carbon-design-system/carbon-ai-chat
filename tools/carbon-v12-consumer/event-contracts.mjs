/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function eventContractSource(root, prefix = 'cds') {
  return `
import type { AudioPlayerErrorEventDetail, TranscriptToggleEventDetail } from '${root}/components/aichat-audio-player/index.js';
import type { VideoPlayerErrorEventDetail } from '${root}/components/aichat-video-player/index.js';
import type { CodeSnippetChangeEventDetail } from '${root}/components/aichat-code-snippet/index.js';
import type { CitationToggleEventDetail } from '${root}/components/aichat-conversational-search/index.js';
import type { WorkspaceHeaderToggleEventDetail, Action as WorkspaceAction } from '${root}/components/aichat-workspace-shell/index.js';
import type { PanelOpenEndEventDetail, PanelBodyScrollEventDetail } from '${root}/components/aichat-shell/index.js';
import type { ReasoningStepToggleEventDetail, ReasoningStepsToggleEventDetail } from '${root}/components/aichat-reasoning-steps/index.js';
import type { HistorySearchInputEventDetail, HistoryRenameChangeEventDetail, HistoryRenameSaveEventDetail, HistoryDeleteConfirmEventDetail, HistoryItemSelectedEventDetail, HistoryMenuActionEventDetail } from '${root}/components/aichat-history/index.js';
import type { MarkdownPluginHostMountDetail, MarkdownPluginHostUpdateDetail, MarkdownPluginHostUnmountDetail } from '${root}/components/aichat-markdown/index.js';
import type { PromptFocusEventDetail, PromptKeydownEventDetail, PromptLineEventDetailMap, CustomListRenderEventDetail, InputChangeEventDetail, TypingEventDetail, TriggerChangeEventDetail, LightDomPortalEventDetail } from '${root}/components/aichat-prompt-line/index.js';
import type { Action as CardAction } from '${root}/components/aichat-card/index.js';
import type { CarouselResponse } from '${root}/components/aichat-carousel/index.js';

export type PublishedEventDetails = [
  AudioPlayerErrorEventDetail, TranscriptToggleEventDetail,
  VideoPlayerErrorEventDetail, CodeSnippetChangeEventDetail, CitationToggleEventDetail,
  WorkspaceHeaderToggleEventDetail, WorkspaceAction,
  PanelOpenEndEventDetail, PanelBodyScrollEventDetail,
  ReasoningStepToggleEventDetail, ReasoningStepsToggleEventDetail,
  HistorySearchInputEventDetail, HistoryRenameChangeEventDetail,
  HistoryRenameSaveEventDetail, HistoryDeleteConfirmEventDetail,
  HistoryItemSelectedEventDetail, HistoryMenuActionEventDetail,
  MarkdownPluginHostMountDetail, MarkdownPluginHostUpdateDetail,
  MarkdownPluginHostUnmountDetail, PromptFocusEventDetail,
  PromptKeydownEventDetail, CustomListRenderEventDetail,
  InputChangeEventDetail, TypingEventDetail, TriggerChangeEventDetail,
  LightDomPortalEventDetail, CardAction, CarouselResponse,
];

export const pluginMount: MarkdownPluginHostMountDetail = {
  kind: 'pluginFallback', slotName: 'plugin', html: '<p>Plugin</p>', isInline: false,
};
export const rendererMount: MarkdownPluginHostMountDetail = {
  kind: 'customRenderer', slotName: 'renderer', element: document.createElement('div'), isInline: false,
};
export const pluginUpdate: MarkdownPluginHostUpdateDetail = { slotName: 'plugin', html: '<p>Updated</p>' };
export const pluginUnmount: MarkdownPluginHostUnmountDetail = { slotName: 'plugin' };
export const promptFocus: PromptLineEventDetailMap['${prefix}-aichat-prompt-focus'] = { keyboard: true };
export const promptBlur: PromptLineEventDetailMap['${prefix}-aichat-prompt-blur'] = null;
export const renameSave: HistoryRenameSaveEventDetail = { itemId: 'row', newName: 'Renamed' };

// @ts-expect-error A custom renderer mount carries a live element.
export const invalidRendererMount: MarkdownPluginHostMountDetail = { kind: 'customRenderer', slotName: 'renderer', html: 'wrong', isInline: false };
// @ts-expect-error HTML updates retain their string payload contract.
export const invalidPluginUpdate: MarkdownPluginHostUpdateDetail = { slotName: 'plugin', html: 1 };
// @ts-expect-error Keyboard focus remains Boolean through the public family barrel.
export const invalidPromptFocus: PromptFocusEventDetail = { keyboard: 'yes' };
// @ts-expect-error Scroll positions use pixels expressed as numbers.
export const invalidPanelScroll: PanelBodyScrollEventDetail['scrollTop'] = '10';
// @ts-expect-error Rename saves carry a newName string.
export const invalidRenameSave: HistoryRenameSaveEventDetail = { itemId: 'row', newName: false };
`;
}
