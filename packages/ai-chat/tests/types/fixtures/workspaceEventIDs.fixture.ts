/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Compiled under `strict: true` by sdkTypes_spec.ts and never run. The message and item IDs on
 * the four workspace events are optional in 1.x, so a payload written against the older types,
 * without them, still compiles.
 */

import {
  BusEventType,
  MessageResponseTypes,
  type BusEventWorkspaceClose,
  type BusEventWorkspaceOpen,
  type BusEventWorkspacePreClose,
  type BusEventWorkspacePreOpen,
  type MessageResponse,
  type PreviewCardItem,
} from '../../../src/aiChatEntry';

type IsOptional<T, K extends keyof T> =
  object extends Pick<T, K> ? true : false;

type WorkspaceData =
  | BusEventWorkspacePreOpen['data']
  | BusEventWorkspaceOpen['data']
  | BusEventWorkspacePreClose['data']
  | BusEventWorkspaceClose['data'];

export const messageIDOptional: IsOptional<WorkspaceData, 'messageID'> = true;
export const itemIDOptional: IsOptional<WorkspaceData, 'itemID'> = true;

const card: PreviewCardItem = {
  response_type: MessageResponseTypes.PREVIEW_CARD,
  title: 'Plan',
  workspace_id: 'plan',
};
const fullMessage: MessageResponse = {
  id: 'plan',
  output: { generic: [card] },
};

export const olderPreOpen: BusEventWorkspacePreOpen = {
  type: BusEventType.WORKSPACE_PRE_OPEN,
  data: { workspaceId: 'plan', message: card, fullMessage },
};

export const olderClose: BusEventWorkspaceClose = {
  type: BusEventType.WORKSPACE_CLOSE,
  data: { message: card, fullMessage },
};

export function readIDs({ data }: BusEventWorkspaceOpen) {
  const messageID: string | undefined = data.messageID;
  const itemID: string | undefined = data.itemID;
  return [messageID, itemID];
}
