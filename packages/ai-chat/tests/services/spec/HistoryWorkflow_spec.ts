/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { HistoryWorkflow } from '../../../src/shared/services/messaging/HistoryWorkflow';
import { MessageCoordinator } from '../../../src/shared/services/messaging/MessageCoordinator';
import type { ServiceManager } from '../../../src/shared/services/ServiceManager';
import type { MessagePresentationPort } from '../../../src/shared/services/messaging/presentationPort';
import type { LoadedHistory } from '../../../src/shared/schema/historyToMessages';
import type { AppStateMessages } from '../../../src/types/state/AppState';
import { MessageResponseTypes } from '../../../src/types/messaging/Messages';
import { resolvablePromise } from '../../../src/shared/utils/resolvablePromise';
import { withMessagingView } from '../helpers/viewBindings';

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

it('keeps loaded-history completion policy and opens its panel after both replay passes', async () => {
  const trace: string[] = [];
  const mark = jest.fn();
  const panel = {};
  const history = {
    messageHistory: messages(),
    latestPanelLocalMessageItem: panel,
  } as LoadedHistory;
  const manager = {
    store: {
      dispatch: () => {
        trace.push('write');
      },
    },
    actions: {
      createElementsForUserDefinedResponses: async () => {
        trace.push('responses');
      },
      replayFooterSlots: async () => {
        trace.push('footers');
      },
    },
    messageCoordinator: {
      markIncomingComplete: mark,
      openHistoryResponsePanel: (value: unknown) => {
        expect(value).toBe(panel);
        trace.push('panel');
      },
    },
  } as unknown as ServiceManager;
  await new HistoryWorkflow(manager).applyLoadedHistory(history);
  expect(trace).toEqual(['write', 'write', 'responses', 'footers', 'panel']);
  expect(mark).not.toHaveBeenCalled();
  const failure = new Error('response replay');
  manager.actions.createElementsForUserDefinedResponses = jest
    .fn()
    .mockRejectedValue(failure);
  trace.length = 0;
  await expect(
    new HistoryWorkflow(manager).applyLoadedHistory(history)
  ).rejects.toBe(failure);
  expect(trace).toEqual(['write', 'write']);
});

it('returns the exact history workflow promises through core', () => {
  const result = Promise.resolve();
  const insert = jest
    .spyOn(HistoryWorkflow.prototype, 'insertHistory')
    .mockReturnValue(result);
  const apply = jest
    .spyOn(HistoryWorkflow.prototype, 'applyLoadedHistory')
    .mockReturnValue(result);
  try {
    const core = new MessageCoordinator(
      withMessagingView({} as ServiceManager, {} as MessagePresentationPort)
    );
    expect(core.insertHistory([])).toBe(result);
    expect(
      core.applyLoadedHistory({ messageHistory: messages() } as LoadedHistory)
    ).toBe(result);
  } finally {
    insert.mockRestore();
    apply.mockRestore();
  }
});
