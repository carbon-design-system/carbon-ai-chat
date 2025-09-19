/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import dayjs from "dayjs";
import type React from "react";
import LocalizedFormat from "dayjs/plugin/localizedFormat.js";
import merge from "lodash-es/merge.js";
import isEqual from "lodash-es/isEqual.js";

import { createServiceManager } from "../services/loadServices";
import { ServiceManager } from "../services/ServiceManager";
import { createChatInstance } from "../instance/ChatInstanceImpl";
import { createAppConfig } from "../store/doCreateStore";
import { loadLocale } from "./languages";
import { setIntl } from "./intlUtils";
import createHumanAgentService from "../services/haa/HumanAgentServiceImpl";

import {
  BusEventChunkUserDefinedResponse,
  BusEventType,
  BusEventUserDefinedResponse,
  MainWindowOpenReason,
  ViewChangeReason,
} from "../../types/events/eventBusTypes";
import { VIEW_STATE_ALL_CLOSED } from "../store/reducerUtils";
import { PublicConfig } from "../../types/config/PublicConfig";
import { ChatInstance } from "../../types/instance/ChatInstance";

/**
 * Default values applied to the provided `PublicConfig` before boot. This keeps
 * the rest of the boot pipeline free from null checks for optional config
 * branches. Callers can override any of these via the incoming partial config.
 */
export const DEFAULT_PUBLIC_CONFIG: Partial<PublicConfig> = {
  openChatByDefault: false,
  shouldTakeFocusIfOpensAutomatically: true,
  serviceDesk: {},
  messaging: {},
  launcher: {
    isOn: true,
  },
};

/**
 * Merges a user-supplied partial config with {@link DEFAULT_PUBLIC_CONFIG} to
 * produce a complete `PublicConfig` used throughout the app.
 */
export function mergePublicConfig(config: Partial<PublicConfig>): PublicConfig {
  return merge({}, DEFAULT_PUBLIC_CONFIG, config) as PublicConfig;
}

/**
 * Creates a {@link ServiceManager}, initializes localization, wires the
 * `humanAgentService`, and constructs the {@link ChatInstance}.
 *
 * This function does not render; the caller should call `instance.render()`
 * after setting up any lifecycle hooks.
 */
export async function initServiceManagerAndInstance(options: {
  publicConfig: PublicConfig;
  container: HTMLElement;
  customHostElement?: HTMLElement;
}): Promise<{ serviceManager: ServiceManager; instance: ChatInstance }> {
  const { publicConfig, container, customHostElement } = options;

  // Extend dayjs with LocalizedFormat plugin once before usage
  dayjs.extend(LocalizedFormat);

  // Create service manager
  const appConfig = createAppConfig(publicConfig);
  const serviceManager = createServiceManager(appConfig);

  // Set container + hosting information
  serviceManager.container = container;
  serviceManager.customHostElement = customHostElement;

  if (serviceManager.customHostElement) {
    container.style.setProperty("width", "100%", "important");
    container.style.setProperty("height", "100%", "important");
  } else {
    container.style.setProperty("width", "0", "important");
    container.style.setProperty("height", "0", "important");
  }

  // Load language and locale
  const languagePack =
    serviceManager.store.getState().config.derived.languagePack;
  const localePack = await loadLocale(
    serviceManager.store.getState().config.public.locale || "en",
  );

  // Set up human agent service (created once here; may be recreated
  // dynamically later by config updates)
  serviceManager.humanAgentService = createHumanAgentService(serviceManager);

  // Update Redux with new values for language, locale, and messages
  setIntl(serviceManager, localePack.name, languagePack);

  // Tell dayjs to globally use the locale
  dayjs.locale(localePack);

  // Create the chat instance
  const instance = createChatInstance({ serviceManager });
  serviceManager.instance = instance;

  return { serviceManager, instance };
}

/**
 * Applies the first view transition after boot, deciding between restoring a
 * session or opening the default view. Keeps this sequencing in one place so
 * tests and callers can reason about what happens immediately after boot.
 */
export async function performInitialViewChange(serviceManager: ServiceManager) {
  const initialState = serviceManager.store.getState();
  const { wasLoadedFromBrowser } = initialState.persistedToBrowserStorage;
  const { targetViewState } = initialState;
  const { openChatByDefault } = initialState.config.public;

  if (targetViewState.mainWindow) {
    let mainWindowOpenReason = MainWindowOpenReason.SESSION_HISTORY;
    if (openChatByDefault && !wasLoadedFromBrowser) {
      mainWindowOpenReason = MainWindowOpenReason.OPEN_BY_DEFAULT;
    }
    await serviceManager.actions.changeView(targetViewState, {
      mainWindowOpenReason,
    });
  } else {
    const viewChangeReason = ViewChangeReason.WEB_CHAT_LOADED;
    const tryHydrating = false;
    const forceViewChange = isEqual(targetViewState, VIEW_STATE_ALL_CLOSED);

    await serviceManager.actions.changeView(
      targetViewState,
      { viewChangeReason },
      tryHydrating,
      forceViewChange,
    );
  }
}

/**
 * A minimal shallow-equivalence checker for plain objects used during initial
 * view-change decision making. Avoids pulling in a deep-equality dependency for
 * this narrow use.
 */
// Note: use lodash `isEqual` for stable, predictable equality checks

/**
 * Attaches event handlers to the `ChatInstance` that track user-defined
 * response items in React state so they can be rendered via portals.
 *
 * On restart events, the tracked state is cleared.
 */
export function attachUserDefinedResponseHandlers(
  webChatInstance: ChatInstance,
  setBySlot: React.Dispatch<
    React.SetStateAction<{
      [key: string]: {
        fullMessage?: any;
        messageItem?: any;
        partialItems?: any[];
      };
    }>
  >,
) {
  function userDefinedResponseHandler(event: BusEventUserDefinedResponse) {
    setBySlot((bySlot) => {
      return {
        ...bySlot,
        [event.data.slot]: {
          fullMessage: event.data.fullMessage,
          messageItem: event.data.message,
        },
      };
    });
  }

  function userDefinedChunkHandler(event: BusEventChunkUserDefinedResponse) {
    if ("complete_item" in event.data.chunk) {
      const messageItem = event.data.chunk.complete_item;
      setBySlot((bySlot) => {
        return {
          ...bySlot,
          [event.data.slot]: {
            messageItem,
          },
        };
      });
    } else if ("partial_item" in event.data.chunk) {
      const itemChunk = event.data.chunk.partial_item;
      setBySlot((bySlot) => {
        return {
          ...bySlot,
          [event.data.slot]: {
            partialItems: [
              ...(bySlot[event.data.slot]?.partialItems || []),
              itemChunk,
            ],
          },
        };
      });
    }
  }

  function restartHandler() {
    setBySlot({});
  }

  webChatInstance.on({
    type: BusEventType.CHUNK_USER_DEFINED_RESPONSE,
    handler: userDefinedChunkHandler,
  });
  webChatInstance.on({
    type: BusEventType.USER_DEFINED_RESPONSE,
    handler: userDefinedResponseHandler,
  });
  webChatInstance.on({
    type: BusEventType.RESTART_CONVERSATION,
    handler: restartHandler,
  });
}
