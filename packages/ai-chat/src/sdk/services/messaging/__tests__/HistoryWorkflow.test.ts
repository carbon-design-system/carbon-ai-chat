/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { HistoryWorkflow } from '../HistoryWorkflow';

import type { ServiceManager } from '../../ServiceManager';

import type { LoadedHistory } from '../../../schema/historyToMessages';
import type { AppStateMessages } from '../../../../types/state/AppState';
import { MessageResponseTypes } from '../../../../types/messaging/Messages';
import { resolvablePromise } from '../../../utils/resolvablePromise';

function messages(): AppStateMessages {
  return {
    allMessagesByID: {
      historical: {
        id: 'historical',
        output: {
          generic: [
            { response_type: MessageResponseTypes.TEXT, text: 'history' },
          ],
        },
      },
    },
    allMessageItemsByID: {},
    assistantMessageState: {
      messageIDs: ['historical'],
      localMessageIDs: [],
      activeResponseId: null,
    },
  };
}

it('keeps insertion response and footer replays separate and restores scroll last', async () => {
  const trace: string[] = [];
  const responses = resolvablePromise<void>();
  const footers = resolvablePromise<void>();
  const history = { messageHistory: messages() } as LoadedHistory;
  const empty: AppStateMessages = {
    allMessagesByID: {},
    allMessageItemsByID: {},
    assistantMessageState: {
      messageIDs: [],
      localMessageIDs: [],
      activeResponseId: null,
    },
  };
  const manager = {
    store: {
      getState: () => empty,
      dispatch: () => {
        trace.push('write');
      },
    },
    historyService: {
      loadHistory: async () => {
        trace.push('load');
        return history;
      },
    },
    messageCoordinator: {
      getMessagesScrollBottom: () => {
        trace.push('capture');
        return 12;
      },
      restoreMessagesScroll: (value: number) => {
        trace.push(`restore:${value}`);
      },
      markIncomingComplete: (id: string) => {
        trace.push(`complete:${id}`);
      },
      createElementsForUserDefinedResponses: () => {
        trace.push('responses');
        return responses;
      },
      replayFooterSlots: () => {
        trace.push('footers');
        return footers;
      },
    },
  } as unknown as ServiceManager;
  const work = new HistoryWorkflow(manager).insertHistory([]);
  await Promise.resolve();
  expect(trace).toEqual([
    'capture',
    'load',
    'write',
    'complete:historical',
    'write',
    'responses',
  ]);
  responses.doResolve();
  await Promise.resolve();
  expect(trace[trace.length - 1]).toBe('footers');
  expect(trace).not.toContain('restore:12');
  footers.doResolve();
  await work;
  expect(trace[trace.length - 1]).toBe('restore:12');
});
