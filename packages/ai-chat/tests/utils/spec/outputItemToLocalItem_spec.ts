/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import * as uuidUtils from '@carbon/ai-chat-components/es/globals/utils/uuid.js';
import {
  createLocalMessageItemsForNestedMessageItems,
  outputItemToLocalItem,
} from '../../../src/chat/schema/outputItemToLocalItem';
import * as miscUtils from '../../../src/chat/utils/miscUtils';
import type { LocalMessageItem } from '../../../src/types/messaging/LocalMessageItem';
import {
  type CardItem,
  type MessageResponse,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';

it('reports an unsupported nested child after earlier local writes and before allocating the next ID', () => {
  const card: CardItem = {
    response_type: MessageResponseTypes.CARD,
    body: [
      { response_type: MessageResponseTypes.TEXT, text: 'first' },
      { response_type: MessageResponseTypes.PAUSE, time: 50 },
      { response_type: MessageResponseTypes.TEXT, text: 'last' },
    ],
  };
  const message: MessageResponse = {
    id: 'message',
    output: { generic: [card] },
  };
  const callerBefore = JSON.stringify(message);
  const nested: LocalMessageItem[] = [];
  const order: string[] = [];
  let nextID = 0;
  const uuid = jest.spyOn(uuidUtils, 'uuid').mockImplementation(() => {
    const id = `local-${++nextID}`;
    order.push(id);
    return id;
  });
  const root = outputItemToLocalItem(card, message);
  let atReport: {
    caller: string;
    ids: string[];
    locals: LocalMessageItem[];
    allocated: number;
  };
  const report = jest
    .spyOn(miscUtils, 'consoleError')
    .mockImplementation(() => {
      order.push('report');
      atReport = {
        caller: JSON.stringify(message),
        ids: [...root.ui_state.bodyLocalMessageItemIDs],
        locals: [...nested],
        allocated: nextID,
      };
    });
  try {
    createLocalMessageItemsForNestedMessageItems(
      root,
      message,
      false,
      nested,
      true
    );
    expect(order).toEqual(['local-1', 'local-2', 'report', 'local-3']);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(
      'The "card" response type does not support "pause" in "body" array.'
    );
    expect(atReport.caller).toBe(callerBefore);
    expect(atReport.allocated).toBe(2);
    expect(atReport.ids).toEqual(['local-2']);
    expect(atReport.locals).toHaveLength(1);
    expect(atReport.locals[0]).toBe(nested[0]);
    expect(atReport.locals[0].item).toBe(card.body[0]);
    expect(root.item).toBe(card);
    expect(root.ui_state.bodyLocalMessageItemIDs).toEqual([
      'local-2',
      'local-3',
    ]);
    expect(nested.map((local) => local.ui_state.id)).toEqual([
      'local-2',
      'local-3',
    ]);
    expect(nested[1].item).toBe(card.body[2]);
    expect(nested.map((local) => local.fullMessageID)).toEqual([
      'message',
      'message',
    ]);
    expect(JSON.stringify(message)).toBe(callerBefore);
  } finally {
    report.mockRestore();
    uuid.mockRestore();
  }
});
