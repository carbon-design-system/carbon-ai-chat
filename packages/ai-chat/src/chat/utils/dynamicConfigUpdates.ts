/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from "lodash-es/isEqual.js";
import { PublicConfig } from "../../types/config/PublicConfig";
import { ServiceManager } from "../services/ServiceManager";
import { NamespaceService } from "../services/NamespaceService";
import actions from "../store/actions";
import createHumanAgentService from "../services/haa/HumanAgentServiceImpl";
import { consoleDebug, consoleError } from "./miscUtils";
import {
  buildLanguagePack,
  createAppConfig,
  reconcileAppConfigReferences,
} from "../store/doCreateStore";
import { isBrowser } from "./browserUtils";

/**
 * Applies a runtime `PublicConfig` change to an already-booted `ServiceManager`
 * in place — without tearing down and rebuilding the chat.
 *
 * The model has two layers:
 *
 * 1. The wholesale config replace (below) is the backbone. It writes the freshly
 *    recomputed `AppConfig` (public + derived) into the store, and everything a
 *    component reads reactively from config then updates on the next render with
 *    no extra work here — header, layout, theme, `assistantName`,
 *    `input.maxInputCharacters`, the input flags (`input.isVisible` /
 *    `input.isDisabled` / `isReadonly`, read through the `selectInput*`
 *    selectors), and so on.
 *
 * 2. The per-field `if` blocks below gate the ONLY work the config replace
 *    cannot do on its own: side effects that live OUTSIDE the store/React
 *    render. Two kinds —
 *      a. Service-internal mirrors — pushing a value into a long-lived service
 *         object the store can't reach (the namespace service, the message
 *         service's internal timeout, the human-agent service).
 *      b. State transitions / invalidations — logic that decides "what should
 *         happen" on a change rather than copying a value (opening/closing the
 *         homescreen, forcing re-acceptance of a changed disclaimer, seeding
 *         the persisted launcher unread indicator).
 *
 * Rule of thumb: if a new config field can be read reactively from the store,
 * it needs NO block here — the replace already propagates it. Only add a block
 * when the change requires an out-of-store side effect, and put its field-level
 * `prev vs next` comparison inline at the block.
 */
export async function applyConfigChangesDynamically(
  prevConfig: PublicConfig | null,
  newConfig: PublicConfig,
  serviceManager: ServiceManager,
): Promise<void> {
  const { store } = serviceManager;

  const currentState = store.getState();
  const newAppConfig = createAppConfig(newConfig);

  // Theme "inherit" mode (originalCarbonTheme === null) resolves the actual
  // Carbon theme from the host page at boot via ThemeWatcherService. Recomputing
  // the config would reset the resolved value, so carry the previously derived
  // theme forward — but ONLY when staying in inherit mode. On an explicit →
  // inherit transition the previous derivedCarbonTheme is the *explicit* value,
  // which would now be stale; leaving it at the freshly-built null lets the
  // ThemeWatcherService (re-)resolve the host theme. The watcher is kicked off
  // by the originalCarbonTheme change via the store subscription in
  // loadServices.ts.
  const prevInheritMode =
    currentState.config.derived.themeWithDefaults.originalCarbonTheme === null;
  const nextInheritMode =
    newAppConfig.derived.themeWithDefaults.originalCarbonTheme === null;
  if (nextInheritMode && prevInheritMode) {
    newAppConfig.derived.themeWithDefaults.derivedCarbonTheme =
      currentState.config.derived.themeWithDefaults.derivedCarbonTheme;
  }

  // BACKBONE: replace the whole config (public + derived) in the store. This is
  // what propagates every reactively-read config value to the UI. The blocks
  // below only add out-of-store side effects on top of this.
  //
  // `createAppConfig` always rebuilds the entire tree, so reconcile against the
  // currently stored config first: sub-objects (and the `public` / `derived`
  // parents) whose value is unchanged keep their previous reference, so a
  // single-field change does not force every config-reading selector to
  // re-render. Run this AFTER the theme carry-forward above so the reconciliation
  // sees the final derived theme.
  const reconciledConfig = reconcileAppConfigReferences(
    currentState.config,
    newAppConfig,
  );
  // When nothing actually changed, reconcile returns the previous config
  // reference; skip the dispatch entirely so we don't allocate a new top-level
  // state and re-run every subscriber's selector for a no-op replace.
  if (reconciledConfig !== currentState.config) {
    store.dispatch(actions.changeState({ config: reconciledConfig }));
  }

  // The language pack lives in its own `AppState.languagePack` slice (off the
  // config tree), so the config replace above does not update it. Recompute it
  // ONLY when config-provided `strings` actually changed — rebuilding from the
  // `enLanguagePack` defaults so a removed key reverts. Gating on a real
  // `strings` change is important: an unrelated config update (e.g. a theme
  // switch) must not clobber strings supplied through the separate `strings`
  // prop, which leaves `config.public.strings` undefined.
  if (!isEqual(currentState.config.public.strings, newConfig.strings)) {
    const nextLanguagePack = buildLanguagePack(newConfig.strings);
    if (!isEqual(currentState.languagePack, nextLanguagePack)) {
      // Dispatch the slice only; the `refreshLocalizationOnChange` store
      // subscription rebuilds `serviceManager.intl` from it. A runtime locale
      // change is likewise picked up by that subscription off the config replace
      // above, so neither sink can go stale here.
      store.dispatch(
        actions.setAppStateValue("languagePack", nextLanguagePack),
      );
    }
  }

  // STATE TRANSITION: whether the homescreen is currently open is session/runtime
  // state, not a config value, so toggling `homescreen.isOn` has to decide what
  // the open/closed flag should become — it can't be derived by a reactive read.
  if (prevConfig?.homescreen?.isOn !== newConfig.homescreen?.isOn) {
    // Going off -> on: open the homescreen, but only when the conversation is
    // empty (don't yank the user away from an in-progress conversation).
    if (
      newConfig.homescreen?.isOn &&
      !currentState.config.public.homescreen?.isOn &&
      currentState.assistantMessageState.messageIDs.length === 0
    ) {
      store.dispatch(actions.setHomeScreenIsOpen(true));
    }
    // Going on -> off (or switching to "splash" with active messages): make sure
    // the homescreen is not left open.
    if (
      (!newConfig.homescreen?.isOn &&
        currentState.config.public.homescreen?.isOn) ||
      (newConfig.homescreen?.disableReturn &&
        currentState.assistantMessageState.messageIDs.length > 0)
    ) {
      store.dispatch(actions.setHomeScreenIsOpen(false));
    }
  }

  // (Custom panel state is driven imperatively by ChatInstance, so there is
  // nothing to apply from config here.)

  // SERVICE-INTERNAL MIRROR: the namespace lives on the ServiceManager (and is
  // baked into the session-storage key), not in the store, so swap the service
  // instance. UserSessionStorageService derives its key from
  // `serviceManager.namespace` on each access, so the session bucket follows the
  // new namespace automatically.
  if (prevConfig?.namespace !== newConfig.namespace) {
    serviceManager.namespace = new NamespaceService(newConfig.namespace);
  }

  // SERVICE-INTERNAL MIRROR: the request timeout is held as a field inside the
  // message service, which the store/React render cannot reach, so push it.
  const prevTimeoutSecs = prevConfig?.messaging?.messageTimeoutSecs;
  const nextTimeoutSecs = newConfig.messaging?.messageTimeoutSecs;
  if (
    prevTimeoutSecs !== nextTimeoutSecs &&
    nextTimeoutSecs &&
    serviceManager.messageService
  ) {
    serviceManager.messageService.timeoutMS = nextTimeoutSecs * 1000;
  }

  // SERVICE-INTERNAL MIRROR: the human-agent service coordinates a service desk
  // built from `serviceDeskFactory`. The factory is read live from config at
  // chat start (see HumanAgentServiceImpl), so a *future* chat always picks up
  // the latest factory with no work here. The only thing bound to the old
  // factory is a live or already-initialized connection — so we only rebuild
  // when one exists.
  //
  // This matters because the comparison is by factory *reference* identity: a
  // non-memoized `serviceDeskFactory` would flip this block on every unrelated
  // re-render. When the service is idle (never initialized and no active chat),
  // rebuilding would be pure churn that a future chat undoes anyway, so we skip
  // it entirely. Callers should still memoize the factory if they connect.
  if (prevConfig?.serviceDeskFactory !== newConfig.serviceDeskFactory) {
    const isActive =
      Boolean(serviceManager.humanAgentService) &&
      isHumanAgentChatActive(serviceManager);
    const wasInitialized = Boolean(
      serviceManager.humanAgentService?.hasInitialized,
    );

    if (isActive || wasInitialized) {
      try {
        // If a chat is in progress/connecting, end it quietly first (mirrors a
        // user-initiated end) so we don't strand a live connection on the old
        // service instance.
        if (isActive) {
          consoleDebug("Tearing down existing service desk");
          await serviceManager.humanAgentService.endChat(true, true, false);
        }

        consoleDebug("Recreating human agent service");
        serviceManager.humanAgentService =
          createHumanAgentService(serviceManager);

        // Re-initialize only if the previous service had already initialized, so
        // a factory swap preserves the prior started state.
        if (wasInitialized) {
          consoleDebug("Human agent service restarting");
          await serviceManager.humanAgentService.initialize();
        }
      } catch (error) {
        // Surface failure to the caller, which decides on any fallback.
        consoleError(
          "Failed to update human agent service dynamically:",
          error,
        );
        throw error;
      }
    }
  }

  // STATE INVALIDATION: when the disclaimer *content* changes, the user's prior
  // acceptance is no longer meaningful, so clear the recorded acceptance for this
  // hostname to force them to accept the new disclaimer again.
  if (!isEqual(prevConfig?.disclaimer, newConfig.disclaimer)) {
    const hostname = isBrowser() ? window.location.hostname : "";
    const updatedDisclaimersAccepted = {
      ...store.getState().persistedToBrowserStorage.disclaimersAccepted,
    };
    // Mark this hostname as not-accepted rather than deleting the key: the
    // changeState reducer deep-merges `persistedToBrowserStorage` via lodash
    // `merge`, which never removes keys, so a `delete` here would be silently
    // undone. Acceptance is read as a truthy check, so `false` re-shows it.
    updatedDisclaimersAccepted[hostname] = false;

    store.dispatch(
      actions.changeState({
        persistedToBrowserStorage: {
          ...store.getState().persistedToBrowserStorage,
          disclaimersAccepted: updatedDisclaimersAccepted,
        },
      }),
    );
  }

  // CONFIG-SEEDED PERSISTED RUNTIME STATE: `showUnreadIndicator` is not pure
  // config — it's persisted runtime state. The reducer clears it when the user
  // opens the window, and the deprecated
  // `instance.updateAssistantUnreadIndicatorVisibility` sets it. Config can
  // only seed/override it, and the "dismissed" state is not derivable from
  // config, so it can NOT be replaced by a config-derived selector the way the
  // input flags were. Push the new config value only on an actual change.
  if (
    prevConfig?.launcher?.showUnreadIndicator !==
      newConfig.launcher?.showUnreadIndicator &&
    typeof newConfig.launcher?.showUnreadIndicator === "boolean"
  ) {
    const currentValue =
      store.getState().persistedToBrowserStorage.showUnreadIndicator;
    if (currentValue !== newConfig.launcher.showUnreadIndicator) {
      store.dispatch(
        actions.setLauncherProperty(
          "showUnreadIndicator",
          newConfig.launcher.showUnreadIndicator,
        ),
      );
    }
  }
}

/**
 * True if a human agent chat is currently active (connected or connecting).
 * Used to decide whether a `serviceDeskFactory` change should tear down an
 * existing connection before rebuilding the service.
 */
function isHumanAgentChatActive(serviceManager: ServiceManager): boolean {
  const state = serviceManager.store.getState();
  return (
    state.persistedToBrowserStorage.humanAgentState.isConnected ||
    state.humanAgentState.isConnecting
  );
}
