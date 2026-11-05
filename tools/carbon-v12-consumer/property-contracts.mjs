/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function propertyContractSource(root) {
  return `
import ChainOfThought from '${root}/components/aichat-chain-of-thought/aichat-chain-of-thought.js';
import type ChainOfThoughtStep from '${root}/components/aichat-chain-of-thought/aichat-chain-of-thought-step.js';
import AutocompleteControllerElement from '${root}/components/aichat-prompt-line/aichat-autocomplete-controller.js';
import StopStreamingButton from '${root}/components/aichat-prompt-line/aichat-stop-streaming-button.js';
import ToolbarElement from '${root}/components/aichat-toolbar/aichat-toolbar.js';
import TableElement from '${root}/components/aichat-table/aichat-table.js';
import HistoryDeletePanelElement from '${root}/components/aichat-history/aichat-history-delete-panel.js';
import HistoryPanelItemInputElement from '${root}/components/aichat-history/aichat-history-panel-item-input.js';
import FeedbackElement from '${root}/components/aichat-feedback/aichat-feedback.js';
import CodeSnippetElement from '${root}/components/aichat-code-snippet/aichat-code-snippet.js';

export const thoughtSteps: NodeListOf<ChainOfThoughtStep> = new ChainOfThought().steps;
export const listNavigated: boolean = new AutocompleteControllerElement().listNavigated;
export const publicToolbar = new ToolbarElement();
publicToolbar.titleText = 'Actions';
publicToolbar.nameText = 'Assistant';
export const publicTable = new TableElement();
publicTable.defaultPageSize = 20;

// @ts-expect-error The public steps getter retains its collection type.
export const invalidThoughtSteps: number = new ChainOfThought().steps;
// @ts-expect-error The public controller getter retains its Boolean type.
export const invalidListNavigated: string = new AutocompleteControllerElement().listNavigated;
// @ts-expect-error Toolbar labels retain their string property type.
publicToolbar.titleText = false;
// @ts-expect-error The accessor retains its numeric setter contract.
publicTable.defaultPageSize = '20';
// @ts-expect-error Query fields remain private implementation details.
new HistoryDeletePanelElement()._deleteButton;
// @ts-expect-error History input queries remain private implementation details.
new HistoryPanelItemInputElement().input;
// @ts-expect-error Feedback state remains private implementation detail.
new FeedbackElement()._isSubmitDisabled;
// @ts-expect-error Internal handlers remain private implementation details.
new StopStreamingButton()._handleOnClick;
// @ts-expect-error Internal reactive state remains private implementation detail.
new CodeSnippetElement()._slottedContent;
`;
}
