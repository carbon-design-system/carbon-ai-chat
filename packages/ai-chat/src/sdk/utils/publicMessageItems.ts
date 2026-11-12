/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

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
import {
  getRequestBubbleText,
  isConnectToHumanAgent,
  isHiddenOutputItem,
  isItemStillStreaming,
  isPause,
  isRequest,
  isResponse,
} from './messageUtils';
import {
  type MessageSlices,
  changedMessageIDs,
  localIDsByMessage,
} from './messageChanges';
import { type MessageProjectionObserver, publicItemOf } from './publicMessages';

type Kind = ChatSDKMessageItem['kind'];
type Status = ChatSDKMessageItem['status'];

/**
 * What one entry is built from. Everything but `local` is a value the entry shows, so
 * two plans with the same values give equal entries.
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
 * The plans of one top-level item and the items nested in it, and the values each entry shows.
 * `entries` is the projection's, set when it first projects the group.
 */
interface PlanGroup {
  localID: string;
  plans: readonly ItemPlan[];
  values: readonly (readonly unknown[])[];
  entries?: readonly Readonly<ChatSDKMessageItem>[];
}

/** Plans one top-level local item of a message, with `locals`, the message's top-level local items. */
function planGroup(
  message: Message,
  local: LocalMessageItem,
  locals: readonly LocalMessageItem[],
  allMessageItemsByID: ObjectMap<LocalMessageItem>
): PlanGroup {
  const plans: ItemPlan[] = [];
  addPlans(
    plans,
    allMessageItemsByID,
    { message, kind: kindOf(message), status: statusOf(message, local) },
    topLevelID(message, local, locals),
    local
  );
  return { localID: local.ui_state.id, plans, values: plans.map(planValues) };
}

/**
 * Plans each top-level local item of a message that's in `messageIDs`, in list order. `group`
 * plans one; the planner passes one that keeps a group whose values didn't change.
 */
function planGroups(
  {
    messageIDs,
    allMessagesByID,
    allMessageItemsByID,
    localMessageIDs,
  }: MessageSlices,
  group: typeof planGroup = planGroup
): PlanGroup[] {
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

  return localMessageIDs.flatMap((localID) => {
    const local = allMessageItemsByID[localID];
    const locals = localsByMessage.get(local?.fullMessageID);
    return locals
      ? [
          group(
            allMessagesByID[local.fullMessageID],
            local,
            locals,
            allMessageItemsByID
          ),
        ]
      : [];
  });
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
  return planGroups({
    messageIDs,
    allMessagesByID,
    allMessageItemsByID,
    localMessageIDs,
  }).flatMap(({ plans }) => plans);
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

/** Each plan list's local item IDs by item ID, built once per list. */
const localIDIndexes = new WeakMap<
  readonly ItemPlan[],
  ReadonlyMap<string, string>
>();

/** The ID of the local item each planned item draws, keyed by the item's public ID. */
export function localIDsByItemID(
  plans: readonly ItemPlan[]
): ReadonlyMap<string, string> {
  let index = localIDIndexes.get(plans);
  if (!index) {
    index = new Map(plans.map((plan) => [plan.id, plan.local.ui_state.id]));
    localIDIndexes.set(plans, index);
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

function sameValues(left: readonly unknown[], right: readonly unknown[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]))
  );
}

/**
 * The item as drawn: the local copy's shared public content, which `messages` uses too, or for a
 * request, that content with its bubble's text.
 */
function drawnItem(plan: ItemPlan): GenericItem {
  const item = publicItemOf(plan.local);
  if (plan.kind === 'request' && plan.requestText !== undefined) {
    return Object.freeze({ ...item, text: plan.requestText }) as GenericItem;
  }
  return item;
}

function buildEntry(plan: ItemPlan): Readonly<ChatSDKMessageItem> {
  return Object.freeze({
    id: plan.id,
    messageID: plan.messageID,
    kind: plan.kind,
    ...(plan.parentID !== undefined && { parentID: plan.parentID }),
    item: drawnItem(plan),
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

function sameGroupValues(left: PlanGroup, right: PlanGroup) {
  return (
    left.localID === right.localID &&
    left.values.length === right.values.length &&
    left.values.every((values, index) =>
      sameValues(values, right.values[index])
    )
  );
}

/** Every entry's plan, grouped by top-level item, in list order. */
interface MessageItemsPlan {
  groups: readonly PlanGroup[];
  /** Each group's position by its top-level local ID. */
  positions: ReadonlyMap<string, number>;
  /** Whether a later plan may replace groups in place: each local ID has one group. */
  updatable: boolean;
  /** When the planner replaced only some groups of `base`: their positions. */
  changes?: { base: MessageItemsPlan; positions: readonly number[] };
}

const EMPTY_PLAN: MessageItemsPlan = {
  groups: [],
  positions: new Map(),
  updatable: true,
};

/** Each plan's flat list of item plans, built once per plan. */
const flatLists = new WeakMap<MessageItemsPlan, readonly ItemPlan[]>();

/** Every item plan of a plan, in list order. */
export function flatItemPlans(plan: MessageItemsPlan): readonly ItemPlan[] {
  let plans = flatLists.get(plan);
  if (!plans) {
    plans = plan.groups.flatMap((group) => group.plans);
    flatLists.set(plan, plans);
  }
  return plans;
}

/**
 * Plans `messageItems` from one state after another. When it can tell which messages a write
 * changed, it plans only their top-level items, so a streamed chunk doesn't plan the transcript. A
 * group whose values didn't change keeps its object, and the plan keeps its object when no group
 * changed.
 */
export class MessageItemsPlanner {
  private plan = EMPTY_PLAN;

  /** The slices `plan` was planned from. */
  private slices: MessageSlices | undefined;

  constructor(private observer?: MessageProjectionObserver) {}

  planFor(slices: MessageSlices): MessageItemsPlan {
    const changed = this.slices && changedMessageIDs(this.slices, slices);
    this.plan =
      (changed && this.update(changed, slices)) ?? this.rebuild(slices);
    this.slices = slices;
    return this.plan;
  }

  private group = (
    message: Message,
    local: LocalMessageItem,
    locals: readonly LocalMessageItem[],
    allMessageItemsByID: ObjectMap<LocalMessageItem>
  ): PlanGroup => {
    this.observer?.onCompareMessage?.('messageItems', local.ui_state.id);
    const group = planGroup(message, local, locals, allMessageItemsByID);
    const position = this.plan.positions.get(group.localID);
    const last =
      position === undefined ? undefined : this.plan.groups[position];
    return last && sameGroupValues(last, group) ? last : group;
  };

  /**
   * Plans the changed messages' top-level items only, or returns `undefined` when one of those
   * items wasn't drawn before, so every item is planned.
   */
  private update(
    changed: ReadonlySet<string>,
    slices: MessageSlices
  ): MessageItemsPlan | undefined {
    const { allMessagesByID, allMessageItemsByID } = slices;
    const localIDs = localIDsByMessage(
      slices.localMessageIDs,
      allMessageItemsByID
    );
    if (!localIDs || !this.plan.updatable) {
      return undefined;
    }
    const { groups, positions } = this.plan;
    let next: PlanGroup[] | undefined;
    const replaced: number[] = [];
    for (const messageID of changed) {
      const message = allMessagesByID[messageID];
      const ids = localIDs.get(messageID) ?? [];
      const locals = ids.map((localID) => allMessageItemsByID[localID]);
      for (const local of locals) {
        const position = local && positions.get(local.ui_state.id);
        if (!message || position === undefined) {
          return undefined;
        }
        const group = this.group(message, local, locals, allMessageItemsByID);
        if (group !== groups[position]) {
          next ??= [...groups];
          next[position] = group;
          replaced.push(position);
        }
      }
    }
    return next
      ? {
          groups: next,
          positions,
          updatable: true,
          changes: { base: this.plan, positions: replaced },
        }
      : this.plan;
  }

  /** Plans every top-level item, keeping the plan when no group changed. */
  private rebuild(slices: MessageSlices): MessageItemsPlan {
    const groups = planGroups(slices, this.group);
    const last = this.plan.groups;
    if (
      groups.length === last.length &&
      groups.every((group, index) => group === last[index])
    ) {
      return this.plan;
    }
    const positions = new Map(
      groups.map(({ localID }, index) => [localID, index])
    );
    // A local item listed twice has two groups, so every later write plans every item.
    return { groups, positions, updatable: positions.size === groups.length };
  }
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

  /** The plan `array` was projected from, when it came from a planner. */
  private plan: MessageItemsPlan | undefined;

  project(plans: readonly ItemPlan[]): readonly Readonly<ChatSDKMessageItem>[] {
    this.plan = undefined;
    return this.keepOrReplace(this.projectAll(plans, plans.map(planValues)));
  }

  /**
   * Projects a planner's plan. When it replaced only some groups of the plan projected last, only
   * those groups' entries are checked, and the array is a new list of the same entries otherwise.
   */
  projectPlan(plan: MessageItemsPlan): readonly Readonly<ChatSDKMessageItem>[] {
    if (plan === this.plan) {
      return this.array;
    }
    const { changes } = plan;
    if (changes && this.plan && changes.base === this.plan) {
      const replaced = changes.positions.map((position) => ({
        before: changes.base.groups[position],
        after: plan.groups[position],
      }));
      replaced.forEach(({ after }) => this.entriesOf(after));
      const kept = new Set(
        replaced.flatMap(({ after }) => after.plans.map(({ id }) => id))
      );
      replaced.forEach(({ before }) =>
        before.plans.forEach(({ id }) => {
          if (!kept.has(id)) {
            this.entries.delete(id);
          }
        })
      );
      this.array = Object.freeze(
        plan.groups.flatMap((group) => this.entriesOf(group))
      );
    } else {
      const groups = plan.groups;
      const next = groups.flatMap((group) => this.entriesOf(group));
      const seen = new Set(
        groups.flatMap((group) => group.plans.map(({ id }) => id))
      );
      this.dropUnseen(seen);
      this.keepOrReplace(next);
    }
    this.plan = plan;
    return this.array;
  }

  private entriesOf(group: PlanGroup) {
    group.entries ??= group.plans.map((plan, index) =>
      this.entryOf(plan, group.values[index])
    );
    return group.entries;
  }

  private entryOf(plan: ItemPlan, values: readonly unknown[]) {
    const cached = this.entries.get(plan.id);
    if (cached && sameValues(cached.values, values)) {
      return cached.entry;
    }
    const entry = buildEntry(plan);
    this.entries.set(plan.id, { values, entry });
    return entry;
  }

  private projectAll(
    plans: readonly ItemPlan[],
    values: readonly (readonly unknown[])[]
  ) {
    const next = plans.map((plan, index) => this.entryOf(plan, values[index]));
    this.dropUnseen(new Set(plans.map(({ id }) => id)));
    return next;
  }

  private dropUnseen(seen: ReadonlySet<string>) {
    this.entries.forEach((_entry, id) => {
      if (!seen.has(id)) {
        this.entries.delete(id);
      }
    });
  }

  private keepOrReplace(next: readonly Readonly<ChatSDKMessageItem>[]) {
    if (
      this.array.length !== next.length ||
      next.some((entry, index) => entry !== this.array[index])
    ) {
      this.array = Object.freeze(next);
    }
    return this.array;
  }
}

export type { ItemPlan, MessageItemsPlan };
