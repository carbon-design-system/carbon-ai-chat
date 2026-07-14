/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Translation between the internal {@link PersistedState} slice and the public
 * {@link PersistableState} contract used by {@link PersistedStateConfig}. This is the single place
 * where the two shapes are mapped, so the emit and restore paths cannot drift apart.
 */

import cloneDeep from "lodash-es/cloneDeep.js";

import { PersistableState } from "../../types/config/PersistedStateConfig";
import { PersistedState } from "../../types/state/AppState";
import { VERSION } from "../utils/environmentVariables";
import { DEFAULT_PERSISTED_TO_BROWSER } from "./reducerUtils";

/**
 * Converts a consumer-provided {@link PersistableState} into the internal {@link PersistedState} used
 * to seed the store at boot. Fills the framework-internal bookkeeping the consumer does not manage:
 * stamps the current `version`, marks the session as restored (`wasLoadedFromBrowser`) so
 * `openChatByDefault` does not re-fire, and — mirroring the sessionStorage load path — never restores
 * an expanded launcher.
 */
function fromPersistableState(input: PersistableState): PersistedState {
  return {
    ...cloneDeep(DEFAULT_PERSISTED_TO_BROWSER),
    ...input,
    version: VERSION,
    wasLoadedFromBrowser: true,
    launcherIsExpanded: false,
  };
}

/**
 * Converts the internal {@link PersistedState} slice into the public {@link PersistableState} handed
 * to {@link PersistedStateConfig.onStateChange}, dropping the framework-internal bookkeeping
 * (`version`, `wasLoadedFromBrowser`). Listing every field explicitly makes this a compile-time guard:
 * if {@link PersistedState} gains a field, {@link PersistableState} includes it and this function
 * fails to type-check until the field is handled here.
 */
function toPersistableState(persisted: PersistedState): PersistableState {
  return {
    viewState: persisted.viewState,
    showUnreadIndicator: persisted.showUnreadIndicator,
    launcherIsExpanded: persisted.launcherIsExpanded,
    launcherShouldStartCallToActionCounterIfEnabled:
      persisted.launcherShouldStartCallToActionCounterIfEnabled,
    hasSentNonWelcomeMessage: persisted.hasSentNonWelcomeMessage,
    disclaimersAccepted: persisted.disclaimersAccepted,
    homeScreenState: persisted.homeScreenState,
    humanAgentState: persisted.humanAgentState,
  };
}

export { fromPersistableState, toPersistableState };
