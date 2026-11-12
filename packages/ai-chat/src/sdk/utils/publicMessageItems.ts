/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';
import isEqual from 'lodash-es/isEqual.js';

import type { ChatSDKMessageItem } from '../../types/instance/ChatSDKState';
import {
  type LocalMessageItem,
  MessageErrorState,
} from '../../types/messaging/LocalMessageItem';
import {
  type GenericItem,
  HumanAgentMessageType,
  type Message,
  type MessageRequest,
  type MessageResponse,
  MessageResponseTypes,
} from '../../types/messaging/Messages';
import type { HumanAgentsOnlineStatus } from '../../types/config/ServiceDeskConfig';
import type ObjectMap from '../../types/utilities/ObjectMap';
import type { AppStateMessages } from '../../types/state/ChatMessagesState';
import { deepFreeze } from './lang/objectUtils';
import {
  getRequestBubbleText,
  isConnectToHumanAgent,
  isHiddenOutputItem,
  isItemStillStreaming,
  isPause,
  isRequest,
  isResponse,
} from './messageUtils';
import { assembleStreamingItem } from './publicMessages';

type Kind = ChatSDKMessageItem['kind'];
type Status = ChatSDKMessageItem['status'];

/**
 * What one entry is built from. Everything but `local` is a value the entry shows, so
 * two plans with the same {@link planSources} give equal entries.
 */
interface ItemPlan {
  id: string;
  messageID: string;
  kind: Kind;
  parentID: string | undefined;
  local: LocalMessageItem;
  status: Status;
  origin: ChatSDKMessageItem['origin'];
  isConnectToAgent: boolean;
  onlineStatus: HumanAgentsOnlineStatus | null | undefined;
  noServiceDesk: boolean | undefined;
  /** For a request, the text its bubble shows. */
  requestText: string | undefined;
}

const AGENT_TURN_TYPES = new Set<unknown>([
  HumanAgentMessageType.FROM_HUMAN_AGENT,
  HumanAgentMessageType.FROM_USER,
]);

/**
 * Whether an item is a note rather than part of a turn: a system or inline error item, or a human
 * agent status message, such as the chat's own "agent joined" or "assistant returned" text.
 */
function isNoteItem(item: GenericItem): boolean {
  return Boolean(
    item &&
    (item.response_type === MessageResponseTypes.SYSTEM ||
      item.response_type === MessageResponseTypes.INLINE_ERROR ||
      (item.agent_message_type !== undefined &&
        !AGENT_TURN_TYPES.has(item.agent_message_type)))
  );
}

function kindOf(message: Message): Kind {
  if (!isResponse(message)) {
    return 'request';
  }
  const generic = message.output.generic ?? [];
  return generic.length && generic.every(isNoteItem) ? 'system' : 'response';
}

function statusOf(message: Message, local: LocalMessageItem): Status {
  const errorState = message.history?.error_state;
  if (
    errorState === MessageErrorState.FAILED ||
    errorState === MessageErrorState.FAILED_WHILE_STREAMING
  ) {
    return 'error';
  }
  return isItemStillStreaming(local) ? 'streaming' : 'complete';
}

function streamID(item: GenericItem): string | undefined {
  return item?.streaming_metadata?.id || undefined;
}

/**
 * Gives each unnamed top-level local item of one response its position in `output.generic`. A local
 * item whose stream ID an earlier one of the response already has counts as unnamed, so no two
 * items share an ID. Items keep their order, so each local item takes the next position whose item is the same or equal to
 * its own. A streamed item can differ from the response's copy, so failing that it takes the next
 * drawn position, skipping pauses and hidden items, which the live paths draw no item for. One left
 * over, such as a streamed item the response doesn't list yet, counts on past the end, so no two
 * share an index.
 */
function responseIndexes(
  message: MessageResponse,
  locals: readonly LocalMessageItem[]
): Map<LocalMessageItem, number> {
  const cached = indexCache.get(message);
  if (
    cached &&
    cached.locals.length === locals.length &&
    cached.locals.every((local, index) => local === locals[index])
  ) {
    return cached.indexes;
  }
  const indexes = matchIndexes(message, locals);
  indexCache.set(message, { locals, indexes });
  return indexes;
}

/**
 * Each response's indexes, for as long as the response and its local items keep their objects, so
 * a streamed chunk matches only the response it changed.
 */
const indexCache = new WeakMap<
  MessageResponse,
  {
    locals: readonly LocalMessageItem[];
    indexes: Map<LocalMessageItem, number>;
  }
>();

function matchIndexes(
  message: MessageResponse,
  locals: readonly LocalMessageItem[]
): Map<LocalMessageItem, number> {
  const generic = message.output?.generic ?? [];
  const named = new Set<string>();
  const repeated = new Set<string>();
  locals.forEach(({ item }) => {
    const id = streamID(item);
    if (id) {
      (named.has(id) ? repeated : named).add(id);
    }
  });
  const candidate = (index: number) => {
    const item = generic[index];
    const id = item && streamID(item);
    return item && !isPause(item) && (!id || repeated.has(id));
  };
  const firsts = new Set<string>();
  const indexes = new Map<LocalMessageItem, number>();
  let next = 0;
  let overflow = 0;
  locals.forEach((local) => {
    const id = streamID(local.item);
    if (id && !firsts.has(id)) {
      firsts.add(id);
      return;
    }
    let index = -1;
    for (let at = next; at < generic.length && index === -1; at++) {
      if (
        candidate(at) &&
        (generic[at] === local.item || isEqual(generic[at], local.item))
      ) {
        index = at;
      }
    }
    for (let at = next; at < generic.length && index === -1; at++) {
      if (candidate(at) && !isHiddenOutputItem(message, generic[at])) {
        index = at;
      }
    }
    if (index === -1) {
      indexes.set(local, generic.length + overflow++);
    } else {
      indexes.set(local, index);
      next = index + 1;
    }
  });
  return indexes;
}

/**
 * Each nested list of a local item, with how its children's IDs extend the parent's: carousel and
 * body items by position, footer items by `f` and position, grid cell items by row, column, and
 * position.
 */
function nestedLists(
  local: LocalMessageItem
): { ids: readonly string[]; part: (index: number) => string }[] {
  const { ui_state } = local;
  const lists: { ids: readonly string[]; part: (index: number) => string }[] =
    [];
  if (ui_state.itemsLocalMessageItemIDs) {
    lists.push({
      ids: ui_state.itemsLocalMessageItemIDs,
      part: (index) => `i:${index}`,
    });
  }
  if (ui_state.bodyLocalMessageItemIDs) {
    lists.push({
      ids: ui_state.bodyLocalMessageItemIDs,
      part: (index) => `i:${index}`,
    });
  }
  if (ui_state.footerLocalMessageItemIDs) {
    lists.push({
      ids: ui_state.footerLocalMessageItemIDs,
      part: (index) => `f:${index}`,
    });
  }
  ui_state.gridLocalMessageItemIDs?.forEach((row, rowIndex) =>
    row.forEach((cell, columnIndex) =>
      lists.push({
        ids: cell,
        part: (index) => `i:${rowIndex}.${columnIndex}.${index}`,
      })
    )
  );
  return lists;
}

/** The message an entry belongs to, and what every entry of one top-level item shares. */
interface PlanOwner {
  message: Message;
  kind: Kind;
  status: Status;
}

/** Plans one entry and, depth first, the items nested in it. */
function addPlans(
  plans: ItemPlan[],
  allMessageItemsByID: ObjectMap<LocalMessageItem>,
  owner: PlanOwner,
  id: string,
  local: LocalMessageItem,
  parentID?: string
) {
  const { message } = owner;
  const internal = message.ui_state_internal;
  const isConnectToAgent = isConnectToHumanAgent(local.item);
  plans.push({
    id,
    messageID: message.id,
    kind: owner.kind,
    parentID,
    local,
    status: owner.status,
    origin: internal?.from_history ? 'history' : 'live',
    isConnectToAgent,
    onlineStatus: isConnectToAgent ? internal?.agent_availability : undefined,
    noServiceDesk: isConnectToAgent
      ? internal?.agent_no_service_desk
      : undefined,
    requestText: isRequest(message)
      ? getRequestBubbleText(local, message as MessageRequest)
      : undefined,
  });
  nestedLists(local).forEach(({ ids, part }) =>
    ids.forEach((nestedID, index) => {
      const nested = allMessageItemsByID[nestedID];
      if (nested) {
        addPlans(
          plans,
          allMessageItemsByID,
          owner,
          `${id}:${part(index)}`,
          nested,
          id
        );
      }
    })
  );
}

/** A top-level item's ID: by its stream ID, else by its position in the response. */
function topLevelID(
  message: Message,
  local: LocalMessageItem,
  locals: readonly LocalMessageItem[]
): string {
  const index = isResponse(message)
    ? responseIndexes(message, locals).get(local)
    : undefined;
  const named = streamID(local.item);
  if (index === undefined && named) {
    return `${message.id}:s:${named}`;
  }
  return `${message.id}:i:${index ?? 0}`;
}

/**
 * Plans every entry the list draws, in its order: each top-level local item of a message that's in
 * `messageIDs`, then the items nested in it, depth first.
 */
export function planMessageItems(
  messageIDs: readonly string[],
  allMessagesByID: ObjectMap<Message>,
  allMessageItemsByID: ObjectMap<LocalMessageItem>,
  localMessageIDs: readonly string[]
): ItemPlan[] {
  const currentIDs = new Set(messageIDs);
  const localsByMessage = new Map<string, LocalMessageItem[]>();
  localMessageIDs.forEach((localID) => {
    const local = allMessageItemsByID[localID];
    const messageID = local?.fullMessageID;
    if (local && currentIDs.has(messageID) && allMessagesByID[messageID]) {
      const locals = localsByMessage.get(messageID) ?? [];
      locals.push(local);
      localsByMessage.set(messageID, locals);
    }
  });

  const plans: ItemPlan[] = [];
  localMessageIDs.forEach((localID) => {
    const local = allMessageItemsByID[localID];
    const locals = localsByMessage.get(local?.fullMessageID);
    if (!locals) {
      return;
    }
    const message = allMessagesByID[local.fullMessageID];
    addPlans(
      plans,
      allMessageItemsByID,
      { message, kind: kindOf(message), status: statusOf(message, local) },
      topLevelID(message, local, locals),
      local
    );
  });
  return plans;
}

/**
 * Plans the drawn items of the given messages in a state, all of its messages by default. A view
 * that keys its own state by item ID uses it to find the ID of a local item.
 */
export function planStateMessageItems(
  state: AppStateMessages,
  messageIDs: readonly string[] = state.assistantMessageState.messageIDs
): ItemPlan[] {
  return planMessageItems(
    messageIDs,
    state.allMessagesByID,
    state.allMessageItemsByID,
    state.assistantMessageState.localMessageIDs
  );
}

/** Each plan list's item IDs by local item ID, built once per list. */
const itemIDIndexes = new WeakMap<
  readonly ItemPlan[],
  ReadonlyMap<string, string>
>();

/** Each planned item's public ID, keyed by the ID of the local item it draws. */
export function itemIDsByLocalID(
  plans: readonly ItemPlan[]
): ReadonlyMap<string, string> {
  let index = itemIDIndexes.get(plans);
  if (!index) {
    index = new Map(plans.map((plan) => [plan.local.ui_state.id, plan.id]));
    itemIDIndexes.set(plans, index);
  }
  return index;
}

function planValues(plan: ItemPlan): unknown[] {
  const { streamingState } = plan.local.ui_state;
  return [
    plan.id,
    plan.messageID,
    plan.kind,
    plan.parentID,
    plan.local.item,
    streamingState?.chunks,
    streamingState?.isDone,
    plan.status,
    plan.origin,
    plan.isConnectToAgent,
    plan.onlineStatus,
    plan.noServiceDesk,
    plan.requestText,
  ];
}

/** Every value the entries are built from, in order, for comparing two states by reference. */
export function planSources(plans: readonly ItemPlan[]): readonly unknown[] {
  return plans.flatMap(planValues);
}

function sameValues(left: readonly unknown[], right: readonly unknown[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]))
  );
}

function drawnItem(plan: ItemPlan): GenericItem {
  const item = assembleStreamingItem(plan.local);
  if (plan.kind === 'request' && plan.requestText !== undefined) {
    return { ...item, text: plan.requestText } as GenericItem;
  }
  return item;
}

function buildEntry(plan: ItemPlan): Readonly<ChatSDKMessageItem> {
  return Object.freeze({
    id: plan.id,
    messageID: plan.messageID,
    kind: plan.kind,
    ...(plan.parentID !== undefined && { parentID: plan.parentID }),
    item: deepFreeze(cloneDeep(drawnItem(plan))),
    status: plan.status,
    origin: plan.origin,
    ...(plan.isConnectToAgent && {
      humanAgent: Object.freeze({
        ...(plan.onlineStatus !== undefined && {
          onlineStatus: plan.onlineStatus,
        }),
        ...(plan.noServiceDesk !== undefined && {
          noServiceDesk: plan.noServiceDesk,
        }),
      }),
    }),
  });
}

/**
 * Builds `state.messageItems`, keeping each entry whose values didn't change, and the array when
 * none did.
 */
export class PublicMessageItemsProjection {
  private entries = new Map<
    string,
    { values: readonly unknown[]; entry: Readonly<ChatSDKMessageItem> }
  >();

  private array: readonly Readonly<ChatSDKMessageItem>[] = Object.freeze([]);

  project(plans: readonly ItemPlan[]): readonly Readonly<ChatSDKMessageItem>[] {
    const seen = new Set<string>();
    const next = plans.map((plan) => {
      seen.add(plan.id);
      const values = planValues(plan);
      const cached = this.entries.get(plan.id);
      if (cached && sameValues(cached.values, values)) {
        return cached.entry;
      }
      const entry = buildEntry(plan);
      this.entries.set(plan.id, { values, entry });
      return entry;
    });
    this.entries.forEach((_entry, id) => {
      if (!seen.has(id)) {
        this.entries.delete(id);
      }
    });
    if (
      this.array.length !== next.length ||
      next.some((entry, index) => entry !== this.array[index])
    ) {
      this.array = Object.freeze(next);
    }
    return this.array;
  }
}

export type { ItemPlan };
