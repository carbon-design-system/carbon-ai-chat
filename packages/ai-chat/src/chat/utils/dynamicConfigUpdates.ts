/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from 'lodash-es/isEqual.js';
import { PublicConfig } from '../../types/config/PublicConfig';
import { ServiceManager } from '../../shared/services/ServiceManager';
import { createAppConfig } from './appConfig';
import { applyConversationConfig } from '../../shared/services/applyConfig';
import { isBrowser } from '../../shared/utils/browserUtils';
import { viewActions } from '../../view/state';
import { chatStore } from '../services/attachChatView';
import type { AppStore } from '../../shared/store/appStore';
import type { AppState } from '../../types/state/AppState';

/**
 * Applies a runtime `PublicConfig` change to an already-booted `ServiceManager`
 * in place — without tearing down and rebuilding the chat.
 *
 * The model has two layers:
 *
 * 1. The wholesale config replace is the backbone. The shared update path,
 *    `applyConversationConfig`, writes the freshly recomputed `AppConfig`
 *    (public + derived) into the store, and everything a
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
 *         service's internal timeout, the human-agent service). These are the
 *         conversation's, so they live in `applyConversationConfig` too.
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
  serviceManager: ServiceManager
): Promise<void> {
  const store = chatStore(serviceManager);

  const currentState = store.getState();
  const newAppConfig = createAppConfig(newConfig);

  // Theme "inherit" mode (originalCarbonTheme === null) resolves the actual
  // Carbon theme from the host page at boot via ThemeWatcherService. Recomputing
  // the config would reset the resolved value, so carry the previously derived
  // theme forward — but ONLY when staying in inherit mode. On an explicit →
  // inherit transition the previous derivedCarbonTheme is the *explicit* value,
  // which would now be stale; leaving it at the freshly-built null lets the
  // ThemeWatcherService (re-)resolve the host theme. The mounted watcher starts
  // when it sees originalCarbonTheme change to null.
  const prevInheritMode =
    currentState.config.derived.themeWithDefaults.originalCarbonTheme === null;
  const nextInheritMode =
    newAppConfig.derived.themeWithDefaults.originalCarbonTheme === null;
  if (nextInheritMode && prevInheritMode) {
    newAppConfig.derived.themeWithDefaults.derivedCarbonTheme =
      currentState.config.derived.themeWithDefaults.derivedCarbonTheme;
  }

  // BACKBONE: the shared update path replaces the config, keeping the
  // references of unchanged sub-objects, and pushes the conversation's
  // service mirrors (language pack, namespace, timeout, service desk). The
  // home screen step runs inside it, right after the config replace and before
  // the service steps, as before. Steps read `currentState`, from before the
  // replace.
  const conversationUpdate = applyConversationConfig(
    serviceManager,
    newAppConfig,
    () => applyHomeScreenToggle(prevConfig, newConfig, currentState, store)
  );

  // (Custom panel state is driven imperatively by ChatInstance, so there is
  // nothing to apply from config here.)

  await conversationUpdate;

  // STATE INVALIDATION: when the disclaimer *content* changes, the user's prior
  // acceptance is no longer meaningful, so clear the recorded acceptance for this
  // hostname to force them to accept the new disclaimer again.
  if (!isEqual(prevConfig?.disclaimer, newConfig.disclaimer)) {
    clearDisclaimerAcceptance(store);
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
    typeof newConfig.launcher?.showUnreadIndicator === 'boolean'
  ) {
    const currentValue =
      store.getState().view.persistedToBrowserStorage.showUnreadIndicator;
    if (currentValue !== newConfig.launcher.showUnreadIndicator) {
      store.dispatch(
        viewActions.setLauncherProperty(
          'showUnreadIndicator',
          newConfig.launcher.showUnreadIndicator
        )
      );
    }
  }
}

/**
 * STATE TRANSITION: whether the home screen is open is session state, not a
 * config value, so toggling `homescreen.isOn` has to decide what the open flag
 * becomes; a reactive read can't. `currentState` is from before the replace.
 */
function applyHomeScreenToggle(
  prevConfig: PublicConfig | null,
  newConfig: PublicConfig,
  currentState: AppState,
  store: AppStore<AppState>
) {
  if (prevConfig?.homescreen?.isOn === newConfig.homescreen?.isOn) {
    return;
  }
  if (shouldOpenHomeScreen(newConfig, currentState)) {
    store.dispatch(viewActions.setHomeScreenIsOpen(true));
  }
  if (shouldCloseHomeScreen(newConfig, currentState)) {
    store.dispatch(viewActions.setHomeScreenIsOpen(false));
  }
}

/**
 * Going off to on opens the home screen, but only when the conversation is
 * empty, so the user isn't pulled out of one in progress.
 */
function shouldOpenHomeScreen(newConfig: PublicConfig, current: AppState) {
  return (
    newConfig.homescreen?.isOn &&
    !current.config.public.homescreen?.isOn &&
    current.assistantMessageState.messageIDs.length === 0
  );
}

/**
 * Going on to off, or to "splash" with messages, makes sure the home screen
 * isn't left open.
 */
function shouldCloseHomeScreen(newConfig: PublicConfig, current: AppState) {
  return (
    (!newConfig.homescreen?.isOn && current.config.public.homescreen?.isOn) ||
    (newConfig.homescreen?.disableReturn &&
      current.assistantMessageState.messageIDs.length > 0)
  );
}

/**
 * Clears this hostname's disclaimer acceptance. It marks the hostname as not
 * accepted rather than deleting the key, as before. Acceptance is read as a
 * truthy check, so `false` shows the disclaimer again. An unchanged value saves
 * nothing, as the old merge didn't.
 */
function clearDisclaimerAcceptance(store: AppStore<AppState>) {
  const hostname = isBrowser() ? window.location.hostname : '';
  const accepted =
    store.getState().view.persistedToBrowserStorage.disclaimersAccepted;
  if (accepted[hostname] !== false) {
    store.dispatch(
      viewActions.setLauncherProperty('disclaimersAccepted', {
        ...accepted,
        [hostname]: false,
      })
    );
  }
}
