/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from 'lodash-es/cloneDeep.js';

import { AppState } from '../../types/state/AppState';
import { PublicChatState } from '../../types/instance/PublicChatState';
import { deepFreeze } from './lang/objectUtils';
import { selectHasInFlightUpload, selectInputState } from '../store/selectors';
import {
  PublicMessagesProjection,
  publicMessagesSources,
} from './publicMessages';

type PublicStateField = keyof PublicChatState | 'history';

interface PublicStateFieldDefinition {
  name: PublicStateField;
  sources(state: AppState): readonly unknown[];
  project(sources: readonly unknown[], state: AppState): unknown;
  prepare?(sources: readonly unknown[], state: AppState): () => unknown;
}

interface CachedField {
  sources: readonly unknown[];
  get(): unknown;
}

export interface PublicStateProjectionObserver {
  onProject?(field: PublicStateField): void;
}

function freezeClone<T>(value: T): T {
  return deepFreeze(cloneDeep(value));
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

const fieldDefinitions: readonly PublicStateFieldDefinition[] = [
  {
    name: 'wasLoadedFromBrowser',
    sources: (state) => [state.persistedToBrowserStorage.wasLoadedFromBrowser],
    project: ([value]) => value,
  },
  {
    name: 'version',
    sources: (state) => [state.persistedToBrowserStorage.version],
    project: ([value]) => value,
  },
  {
    name: 'viewState',
    sources: (state) => [state.persistedToBrowserStorage.viewState],
    project: ([value]) => freezeClone(value),
  },
  {
    name: 'showUnreadIndicator',
    sources: (state) => [state.persistedToBrowserStorage.showUnreadIndicator],
    project: ([value]) => value,
  },
  {
    name: 'launcherIsExpanded',
    sources: (state) => [state.persistedToBrowserStorage.launcherIsExpanded],
    project: ([value]) => value,
  },
  {
    name: 'launcherShouldStartCallToActionCounterIfEnabled',
    sources: (state) => [
      state.persistedToBrowserStorage
        .launcherShouldStartCallToActionCounterIfEnabled,
    ],
    project: ([value]) => value,
  },
  {
    name: 'hasSentNonWelcomeMessage',
    sources: (state) => [
      state.persistedToBrowserStorage.hasSentNonWelcomeMessage,
    ],
    project: ([value]) => value,
  },
  {
    name: 'disclaimersAccepted',
    sources: (state) => [state.persistedToBrowserStorage.disclaimersAccepted],
    project: ([value]) => freezeClone(value),
  },
  {
    name: 'homeScreenState',
    sources: (state) => [state.persistedToBrowserStorage.homeScreenState],
    project: ([value]) => freezeClone(value),
  },
  {
    name: 'humanAgent',
    sources: (state) => [
      state.persistedToBrowserStorage.humanAgentState,
      state.humanAgentState.isConnecting,
    ],
    project: ([persisted, isConnecting]) =>
      freezeClone({
        ...(persisted as object),
        isConnecting,
      }),
  },
  {
    name: 'status',
    sources: (state) => [state.conversationStatus],
    project: ([value]) => value,
  },
  {
    name: 'error',
    sources: (state) => [state.conversationError],
    project: ([value]) => value,
  },
  {
    name: 'isMessageLoadingCounter',
    sources: (state) => [state.assistantMessageState.isMessageLoadingCounter],
    project: ([value]) => value,
  },
  {
    name: 'isMessageLoadingText',
    sources: (state) => [state.assistantMessageState.isMessageLoadingText],
    project: ([value]) => value,
  },
  {
    name: 'isHydratingCounter',
    sources: (state) => [state.assistantMessageState.isHydratingCounter],
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
  {
    name: 'customPanels',
    sources: (state) => [
      Boolean(state.customPanelState.isOpen),
      Boolean(state.workspacePanelState.isOpen),
      state.workspacePanelState.options.preferredLocation,
      state.workspacePanelState.workspaceID,
      state.workspacePanelState.additionalData,
      Boolean(state.historyPanelState.isOpen),
      Boolean(state.historyPanelState.isMobile),
    ],
    project: ([
      defaultOpen,
      workspaceOpen,
      preferredLocation,
      workspaceID,
      additionalData,
      historyOpen,
      historyMobile,
    ]) =>
      freezeClone({
        default: { isOpen: defaultOpen },
        workspace: {
          isOpen: workspaceOpen,
          options: { preferredLocation },
          workspaceID,
          additionalData,
        },
        history: { isOpen: historyOpen, isMobile: historyMobile },
      }),
  },
  {
    name: 'workspace',
    sources: (state) => [
      Boolean(state.workspacePanelState.isOpen),
      state.workspacePanelState.options.preferredLocation,
      state.workspacePanelState.workspaceID,
      state.workspacePanelState.additionalData,
    ],
    project: ([isOpen, preferredLocation, workspaceID, additionalData]) =>
      freezeClone({
        isOpen,
        options: { preferredLocation },
        workspaceID,
        additionalData,
      }),
  },
  {
    name: 'history',
    sources: (state) => [
      Boolean(state.historyPanelState.isOpen),
      Boolean(state.historyPanelState.isMobile),
    ],
    project: ([isOpen, isMobile]) => freezeClone({ isOpen, isMobile }),
  },
];

export class PublicStateSnapshotCache {
  private fieldCache = new Map<PublicStateField, CachedField>();
  private messages = new PublicMessagesProjection();
  private definitions: readonly PublicStateFieldDefinition[];

  constructor(private observer?: PublicStateProjectionObserver) {
    this.definitions = [
      ...fieldDefinitions,
      {
        name: 'messages',
        sources: (state) =>
          publicMessagesSources(
            state.assistantMessageState.messageIDs,
            state.allMessagesByID,
            state.allMessageItemsByID,
            state.assistantMessageState.localMessageIDs
          ),
        project: (_sources, state) =>
          this.messages.project(
            state.assistantMessageState.messageIDs,
            state.allMessagesByID,
            state.allMessageItemsByID,
            state.assistantMessageState.localMessageIDs
          ),
        prepare: (_sources, state) => {
          const prepared = this.messages.prepare(
            state.assistantMessageState.messageIDs,
            state.allMessagesByID,
            state.allMessageItemsByID,
            state.assistantMessageState.localMessageIDs
          );
          return prepared.get;
        },
      },
    ];
  }

  haveSamePublicSources(previous: AppState, current: AppState): boolean {
    return this.definitions.every((definition) =>
      sameSources(definition.sources(previous), definition.sources(current))
    );
  }

  createSnapshot(state: AppState): PublicChatState {
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

  private createField(
    definition: PublicStateFieldDefinition,
    sources: readonly unknown[],
    state: AppState
  ): CachedField {
    const project =
      definition.prepare?.(sources, state) ??
      (() => definition.project(sources, state));
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
