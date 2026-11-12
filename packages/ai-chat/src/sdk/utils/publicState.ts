/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';

import { ConversationState } from '../../types/state/ConversationState';
import { PublicChatState } from '../../types/instance/PublicChatState';
import { deepFreeze } from './lang/objectUtils';
import { selectHasInFlightUpload, selectInputState } from '../store/selectors';
import type { PendingUpload } from '../../types/state/InputState';
import type { FileUpload } from '../../types/config/ServiceDeskConfig';
import type { ChatSDKPendingUpload } from '../../types/instance/ChatSDKState';
import {
  type MessageProjectionObserver,
  type PreparedPublicMessages,
  PublicMessagesProjection,
} from './publicMessages';
import {
  type MessageItemsPlan,
  MessageItemsPlanner,
  PublicMessageItemsProjection,
  flatItemPlans,
  itemIDsByLocalID,
  localIDsByItemID,
} from './publicMessageItems';
import type { MessageSlices } from './messageChanges';

type PublicStateField = keyof PublicChatState | 'history';

/**
 * One public field: the state values it's built from, and how to build it.
 * `S` is the state the field reads; the view's fields read the whole store.
 */
interface PublicStateFieldDefinition<S = ConversationState> {
  name: PublicStateField;
  sources(state: S): readonly unknown[];
  project(sources: readonly unknown[], state: S): unknown;
}

interface CachedField {
  sources: readonly unknown[];
  get(): unknown;
}

export interface PublicStateProjectionObserver extends MessageProjectionObserver {
  onProject?(field: PublicStateField): void;
}

function freezeClone<T>(value: T): T {
  return deepFreeze(cloneDeep(value));
}

/**
 * A pending upload as hosts see it. The `File` passes through by reference and isn't frozen, since
 * it's the host's own object.
 */
function publicPendingUpload(upload: PendingUpload): ChatSDKPendingUpload {
  return cachedEntry(upload, () =>
    Object.freeze({
      id: upload.id,
      file: upload.file,
      status: upload.status,
      ...(upload.contributedData && {
        contributedData: freezeClone(upload.contributedData),
      }),
      ...(upload.errorMessage !== undefined && {
        errorMessage: upload.errorMessage,
      }),
    })
  );
}

/**
 * Each store entry's public copy. Store entries are replaced when they change, so an entry that
 * didn't change keeps its public object while another upload settles.
 */
const publicEntries = new WeakMap<object, ChatSDKPendingUpload>();

function cachedEntry(
  entry: object,
  build: () => ChatSDKPendingUpload
): ChatSDKPendingUpload {
  let cached = publicEntries.get(entry);
  if (!cached) {
    cached = build();
    publicEntries.set(entry, cached);
  }
  return cached;
}

/** A file staged for the service desk, which transfers it when the message is sent. */
function publicDeskFile(upload: FileUpload): ChatSDKPendingUpload {
  return cachedEntry(upload, () =>
    Object.freeze({
      id: upload.id,
      file: upload.file,
      status: upload.isError ? 'error' : 'complete',
      ...(upload.errorMessage !== undefined && {
        errorMessage: upload.errorMessage,
      }),
    })
  );
}

function sameSources(
  left: readonly unknown[],
  right: readonly unknown[]
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => Object.is(value, right[index]))
  );
}

function messageSlices(state: ConversationState): MessageSlices {
  return {
    messageIDs: state.assistantMessageState.messageIDs,
    allMessagesByID: state.allMessagesByID,
    allMessageItemsByID: state.allMessageItemsByID,
    localMessageIDs: state.assistantMessageState.localMessageIDs,
  };
}

function sameMessageReferences(
  left: ConversationState,
  right: ConversationState
): boolean {
  return (
    left.assistantMessageState.messageIDs ===
      right.assistantMessageState.messageIDs &&
    left.allMessagesByID === right.allMessagesByID &&
    left.allMessageItemsByID === right.allMessageItemsByID &&
    left.assistantMessageState.localMessageIDs ===
      right.assistantMessageState.localMessageIDs
  );
}

/**
 * Every public field in the order `getState()` has always listed them. Field
 * definitions another layer adds, such as the view's, take their place here.
 */
const PUBLIC_FIELD_ORDER: readonly PublicStateField[] = [
  'wasLoadedFromBrowser',
  'version',
  'viewState',
  'showUnreadIndicator',
  'launcherIsExpanded',
  'launcherShouldStartCallToActionCounterIfEnabled',
  'hasSentNonWelcomeMessage',
  'disclaimersAccepted',
  'homeScreenState',
  'humanAgent',
  'status',
  'error',
  'pendingUploads',
  'hasInFlightUploads',
  'isRestarting',
  'isMessageLoadingCounter',
  'isMessageLoadingText',
  'isHydratingCounter',
  'activeResponseId',
  'input',
  'customPanels',
  'workspace',
  'history',
  'messages',
  'messageItems',
];

const fieldDefinitions: readonly PublicStateFieldDefinition[] = [
  {
    name: 'hasSentNonWelcomeMessage',
    sources: (state) => [
      state.persistedToBrowserStorage.hasSentNonWelcomeMessage,
    ],
    project: ([value]) => value,
  },
  {
    name: 'humanAgent',
    // The one place internal agent fields take their public names.
    sources: (state) => [
      state.persistedToBrowserStorage.humanAgentState,
      state.humanAgentState.isConnecting,
      state.humanAgentState.isScreenSharing,
      state.humanAgentState.isReconnecting,
      state.humanAgentState.isHumanAgentTyping,
      state.humanAgentState.availability,
      state.humanAgentState.fileUploadInProgress,
    ],
    project: ([
      persisted,
      isConnecting,
      isScreenSharing,
      isReconnecting,
      isTyping,
      availability,
      isUploadingFile,
    ]) =>
      freezeClone({
        ...(persisted as object),
        isConnecting,
        isScreenSharing,
        isReconnecting,
        isTyping,
        // Only a wait for a connecting agent is current; the desk may leave one behind.
        availability: isConnecting ? (availability ?? null) : null,
        isUploadingFile,
      }),
  },
  {
    name: 'status',
    sources: (state) => [state.conversationStatus],
    project: ([value]) => value,
  },
  {
    name: 'error',
    // Already frozen when the conversation failed; otherData keeps its reference.
    sources: (state) => [state.conversationError],
    project: ([value]) => value,
  },
  {
    name: 'pendingUploads',
    sources: (state) => {
      const input = selectInputState(state);
      return [input.pendingUploads, input.files];
    },
    project: ([uploads, deskFiles]) =>
      Object.freeze([
        ...(uploads as PendingUpload[]).map(publicPendingUpload),
        ...(deskFiles as FileUpload[]).map(publicDeskFile),
      ]),
  },
  {
    name: 'hasInFlightUploads',
    sources: (state) => [selectHasInFlightUpload(state)],
    project: ([value]) => value,
  },
  {
    name: 'isRestarting',
    sources: (state) => [state.isRestarting],
    project: ([value]) => value,
  },
  {
    name: 'activeResponseId',
    sources: (state) => [state.assistantMessageState.activeResponseId ?? null],
    project: ([value]) => value,
  },
  {
    name: 'input',
    sources: (state) => {
      const input = selectInputState(state);
      return [
        input.rawValue ?? '',
        input.content,
        Boolean(input.focused),
        input.pendingStructuredData,
        selectHasInFlightUpload(state),
      ];
    },
    project: ([rawValue, content, focused, structuredData, uploads]) =>
      freezeClone({
        rawValue,
        content: content ?? {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        },
        focused,
        structuredData,
        hasInFlightUploads: uploads,
      }),
  },
];

export type { PublicStateFieldDefinition };

/** The fields built only from the message slices, which share a quick same-reference check. */
const MESSAGE_FIELDS = new Set<PublicStateField>(['messages', 'messageItems']);

export class PublicStateSnapshotCache {
  private fieldCache = new Map<PublicStateField, CachedField>();
  private messages: PublicMessagesProjection;
  private preparedMessages = new WeakMap<
    ConversationState,
    PreparedPublicMessages
  >();
  private lastMessageState: ConversationState;
  private planner: MessageItemsPlanner;
  private messageItems = new PublicMessageItemsProjection();
  private itemPlans = new WeakMap<ConversationState, MessageItemsPlan>();
  private lastItemState: ConversationState;
  private definitions: readonly PublicStateFieldDefinition[];

  constructor(private observer?: PublicStateProjectionObserver) {
    this.messages = new PublicMessagesProjection(observer);
    this.planner = new MessageItemsPlanner(observer);
    // Each message field's one source is its prepared value, which keeps its object until a
    // message changes, so comparing sources compares no messages.
    this.definitions = [
      ...fieldDefinitions,
      {
        name: 'messages',
        sources: (state) => [this.getPreparedMessages(state)],
        project: ([prepared]) => (prepared as PreparedPublicMessages).get(),
      },
      {
        name: 'messageItems',
        sources: (state) => [this.getItemPlan(state)],
        project: ([plan]) =>
          this.messageItems.projectPlan(plan as MessageItemsPlan),
      },
    ];
  }

  /**
   * Adds fields that another layer builds, such as the view's. Each takes its
   * place in {@link PUBLIC_FIELD_ORDER}, so `getState()` keeps its key order.
   * Fields already added are kept.
   */
  addDefinitions(definitions: readonly PublicStateFieldDefinition<never>[]) {
    const names = new Set(this.definitions.map(({ name }) => name));
    this.definitions = [
      ...this.definitions,
      ...(definitions as readonly PublicStateFieldDefinition[]).filter(
        ({ name }) => !names.has(name)
      ),
    ].sort(
      (left, right) =>
        PUBLIC_FIELD_ORDER.indexOf(left.name) -
        PUBLIC_FIELD_ORDER.indexOf(right.name)
    );
  }

  haveSamePublicSources(
    previous: ConversationState,
    current: ConversationState
  ): boolean {
    return this.definitions.every(
      (definition) =>
        (MESSAGE_FIELDS.has(definition.name) &&
          sameMessageReferences(previous, current)) ||
        sameSources(definition.sources(previous), definition.sources(current))
    );
  }

  createSnapshot(state: ConversationState): PublicChatState {
    const snapshot = {} as PublicChatState;

    this.definitions.forEach((definition) => {
      const sources = definition.sources(state);
      const cached = this.fieldCache.get(definition.name);
      const field =
        cached && sameSources(cached.sources, sources)
          ? cached
          : this.createField(definition, sources, state);
      this.fieldCache.set(definition.name, field);

      Object.defineProperty(snapshot, definition.name, {
        enumerable: true,
        get: field.get,
      });
    });

    return Object.freeze(snapshot);
  }

  /**
   * The public item ID of a local item in a state, or `undefined` when the list doesn't draw it.
   * It reads the plan `messageItems` is built from, so it costs nothing more once that's built.
   */
  messageItemIDOf(
    state: ConversationState,
    localItemID: string
  ): string | undefined {
    return itemIDsByLocalID(flatItemPlans(this.getItemPlan(state))).get(
      localItemID
    );
  }

  /**
   * The ID of the local item a public item draws in a state, or `undefined` when the state has no
   * such item. It reads the same plan as {@link messageItemIDOf}.
   */
  localItemIDOf(state: ConversationState, itemID: string): string | undefined {
    return localIDsByItemID(flatItemPlans(this.getItemPlan(state))).get(itemID);
  }

  /** The plan of `messageItems` for a state, shared with the next state whose messages didn't change. */
  private getItemPlan(state: ConversationState): MessageItemsPlan {
    let plan = this.itemPlans.get(state);
    if (!plan) {
      plan =
        this.lastItemState && sameMessageReferences(this.lastItemState, state)
          ? this.itemPlans.get(this.lastItemState)
          : this.planner.planFor(messageSlices(state));
      this.itemPlans.set(state, plan);
      this.lastItemState = state;
    }
    return plan;
  }

  /** The prepared `messages` for a state, shared with the next state whose messages didn't change. */
  private getPreparedMessages(
    state: ConversationState
  ): PreparedPublicMessages {
    let prepared = this.preparedMessages.get(state);
    if (!prepared) {
      const slices = messageSlices(state);
      prepared =
        this.lastMessageState &&
        sameMessageReferences(this.lastMessageState, state)
          ? this.preparedMessages.get(this.lastMessageState)
          : this.messages.prepare(
              slices.messageIDs,
              slices.allMessagesByID,
              slices.allMessageItemsByID,
              slices.localMessageIDs
            );
      this.preparedMessages.set(state, prepared);
      this.lastMessageState = state;
    }
    return prepared;
  }

  private createField(
    definition: PublicStateFieldDefinition,
    sources: readonly unknown[],
    state: ConversationState
  ): CachedField {
    const project = () => definition.project(sources, state);
    let projected = false;
    let value: unknown;

    return {
      sources,
      get: () => {
        if (!projected) {
          this.observer?.onProject?.(definition.name);
          value = project();
          projected = true;
        }
        return value;
      },
    };
  }
}
