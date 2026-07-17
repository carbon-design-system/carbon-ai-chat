/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The internal `ChatSDK` lifecycle facade. This module's shape is what becomes the public
 * `@carbon/ai-chat/sdk` surface in 2.0: `acquireChatSDK` (create-or-adopt), the `ChatSDK` class
 * (`instance`, `slotStates`, `attach`, `release`, `destroy`, `runInitialViewChange`), and
 * `ChatSDKHost`. Internal only until 2.0: never exported from `aiChatEntry.tsx`/`serverEntry.ts`.
 */

import dayjs from "dayjs";
import LocalizedFormat from "dayjs/plugin/localizedFormat.js";
import isEqual from "lodash-es/isEqual.js";

import { createServiceManager } from "../services/loadServices";
import { ServiceManager } from "../services/ServiceManager";
import { createChatInstance } from "../instance/ChatInstanceImpl";
import { createAppConfig } from "../store/doCreateStore";
import { setIntl } from "../utils/intlUtils";
import { consoleError } from "../utils/miscUtils";
import createHumanAgentService from "../services/haa/HumanAgentServiceImpl";
import {
  acquireServiceManager,
  DEFAULT_REUSE_GRACE_MS,
  evictServiceManager,
  registerServiceManager,
  releaseServiceManager,
} from "../services/reuseInstanceRegistry";
import { attachSlotStateTracking } from "./slotStates.js";

import {
  MainWindowOpenReason,
  ViewChangeReason,
} from "../../types/events/eventBusTypes";
import { VIEW_STATE_ALL_CLOSED } from "../store/reducerUtils";
import { PublicConfig } from "../../types/config/PublicConfig";
import { ChatInstance } from "../../types/instance/ChatInstance";
import { loadLocale } from "../utils/languageUtils";
import { ChatSlotStates } from "./slotStates.js";

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
      viewChangeReason: ViewChangeReason.WEB_CHAT_LOADED,
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
 * The host DOM anchors a `ChatSDK` binds/rebinds to: the boot-container element, and (for a WC
 * surface) the custom host element the container fills.
 */
export interface ChatSDKHost {
  container: HTMLElement;
  customHostElement?: HTMLElement;
}

/**
 * Internal lifecycle facade over a {@link ServiceManager}. One `ChatSDK` per `ServiceManager` —
 * cached on `serviceManager.sdk` so a reuse re-attach returns the same facade instance. Construct
 * only via {@link acquireChatSDK}.
 */
export class ChatSDK {
  /**
   * Set when (and only when) `acquireChatSDK` registered this manager in the reuse registry, with
   * the namespace it was registered under. Teardown branches on this boot-time record rather than
   * the live config: `featureFlags`/`namespace` are dynamically updatable, and deriving the path
   * from the store would desynchronize release/destroy from the registration (leaking the manager
   * or stranding a registry entry pointing at a disposed one).
   */
  private reuseRegistration: { namespace: string | undefined } | null = null;

  constructor(readonly serviceManager: ServiceManager) {}

  get instance(): ChatInstance {
    return this.serviceManager.instance;
  }

  get slotStates(): ChatSlotStates {
    return this.serviceManager.slotStates!;
  }

  /** @internal Records the reuse-registry registration made during `acquireChatSDK`. */
  markRegisteredForReuse(namespace: string | undefined): void {
    this.reuseRegistration = { namespace };
  }

  /** Boot-once post-render sequencing. Caller runs only when `!adopted`. */
  runInitialViewChange(): Promise<void> {
    return performInitialViewChange(this.serviceManager);
  }

  /**
   * Rebinds a live sdk to a new host: points it at the new container/host element. Does not
   * re-create services, re-run localization, or touch the live connection — the manager is reused
   * as-is. Host-container styling is the shell's job (`src/chat/boot/appBoot.ts`), run after every
   * acquire.
   */
  attach(host: ChatSDKHost): void {
    this.serviceManager.container = host.container;
    this.serviceManager.customHostElement = host.customHostElement;
  }

  /**
   * Host unmounted: grace-release to the registry when this manager was registered for reuse,
   * else dispose now. Idempotent per mount (guarded by `serviceManager.disposed`).
   */
  release(): void {
    if (this.serviceManager.disposed) {
      return;
    }
    if (this.reuseRegistration) {
      const { featureFlags } =
        this.serviceManager.store.getState().config.public;
      releaseServiceManager(
        this.reuseRegistration.namespace,
        this.serviceManager,
        featureFlags?.reuseInstanceGraceMs ?? DEFAULT_REUSE_GRACE_MS,
        (manager) => manager.actions.unloadServices(),
      );
    } else {
      this.serviceManager.actions.unloadServices();
    }
  }

  /**
   * Hard teardown: evict + `unloadServices` immediately, skipping any grace window.
   * `instance.destroy()` delegates here.
   */
  destroy(): void {
    if (this.serviceManager.disposed) {
      return;
    }
    if (this.reuseRegistration) {
      evictServiceManager(
        this.reuseRegistration.namespace,
        this.serviceManager,
        (manager) => manager.actions.unloadServices(),
      );
    } else {
      this.serviceManager.actions.unloadServices();
    }
  }
}

/**
 * Create-or-adopt: returns the cached `ChatSDK` for the namespace when reuse is on and one is
 * available, else cold-boots services and the instance. `config` is the already-merged
 * `PublicConfig` (see `src/chat/boot/appBoot.ts`'s `mergePublicConfig`).
 */
export async function acquireChatSDK(
  config: PublicConfig,
  host: ChatSDKHost,
): Promise<{ sdk: ChatSDK; adopted: boolean }> {
  const { container, customHostElement } = host;

  // Extend dayjs with LocalizedFormat plugin once before usage
  dayjs.extend(LocalizedFormat);

  // Reuse a cached ServiceManager across a host remount when opted in and one is available.
  if (config.featureFlags?.reuseInstance) {
    const cached = acquireServiceManager(config.namespace);
    if (cached) {
      const sdk = cached.sdk!;
      sdk.attach({ container, customHostElement });
      return { sdk, adopted: true };
    }
  }

  // Create service manager
  const appConfig = createAppConfig(config);
  const serviceManager = createServiceManager(appConfig);

  // From here the manager holds live resources (store subscriptions, the theme watcher), so a
  // failed boot must unload them before propagating — nothing else can reach a manager whose
  // acquire never returned.
  try {
    // Set container + hosting information
    serviceManager.container = container;
    serviceManager.customHostElement = customHostElement;

    // Load language and locale
    const languagePack = serviceManager.store.getState().languagePack;
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

    // Validate UploadConfig at startup so misconfiguration is surfaced early,
    // regardless of whether the main window is open.
    const uploadConfig = serviceManager.store.getState().config.public.upload;
    if (uploadConfig?.is_on && !uploadConfig.onFileUpload) {
      consoleError(
        "[upload] UploadConfig.is_on is true but onFileUpload is not provided. " +
          "File upload will be disabled. Please provide an onFileUpload handler in config.upload.",
      );
    }

    // Create the chat instance
    const instance = createChatInstance({ serviceManager });
    serviceManager.instance = instance;

    // Reduce the portal-slot bus events (user-defined responses, custom footers) into
    // framework-agnostic value stores owned by the manager. Done here, before the view subscribes,
    // so events fired during boot are still captured; the stores survive a host remount.
    attachSlotStateTracking(serviceManager);

    // Cache the facade on the manager so a future reuse re-attach returns this same instance.
    const sdk = new ChatSDK(serviceManager);
    serviceManager.sdk = sdk;

    // Register the fresh manager so a future remount can reuse it when opted in, recording the
    // decision on the facade so release/destroy branch on it rather than on the live config.
    if (config.featureFlags?.reuseInstance) {
      registerServiceManager(config.namespace, serviceManager, (manager) =>
        manager.actions.unloadServices(),
      );
      sdk.markRegisteredForReuse(config.namespace);
    }

    return { sdk, adopted: false };
  } catch (error) {
    try {
      serviceManager.actions.unloadServices();
    } catch {
      // Teardown of a partially-initialized manager must not mask the boot error.
    }
    throw error;
  }
}
