/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  fromPersistableState,
  toPersistableState,
} from "../../../src/chat/store/persistenceUtils";
import { DEFAULT_PERSISTED_TO_BROWSER } from "../../../src/chat/store/reducerUtils";
import { VERSION } from "../../../src/chat/utils/environmentVariables";
import { PersistableState } from "../../../src/types/config/PersistedStateConfig";
import { PersistedState } from "../../../src/types/state/AppState";

describe("persistenceUtils", () => {
  describe("toPersistableState", () => {
    it("drops framework-internal bookkeeping (version, wasLoadedFromBrowser)", () => {
      const persisted: PersistedState = {
        ...DEFAULT_PERSISTED_TO_BROWSER,
        version: "9.9.9",
        wasLoadedFromBrowser: true,
        hasSentNonWelcomeMessage: true,
      };

      const result = toPersistableState(persisted);

      expect(result).not.toHaveProperty("version");
      expect(result).not.toHaveProperty("wasLoadedFromBrowser");
      expect(result.hasSentNonWelcomeMessage).toBe(true);
    });

    it("carries the reconnect-critical human agent subset", () => {
      const persisted: PersistedState = {
        ...DEFAULT_PERSISTED_TO_BROWSER,
        humanAgentState: {
          ...DEFAULT_PERSISTED_TO_BROWSER.humanAgentState,
          isConnected: true,
          isSuspended: true,
        },
      };

      const result = toPersistableState(persisted);

      expect(result.humanAgentState.isConnected).toBe(true);
      expect(result.humanAgentState.isSuspended).toBe(true);
    });
  });

  describe("fromPersistableState", () => {
    it("stamps the current version and marks the session as restored", () => {
      const result = fromPersistableState({} as PersistableState);

      expect(result.version).toBe(VERSION);
      expect(result.wasLoadedFromBrowser).toBe(true);
    });

    it("never restores an expanded launcher", () => {
      const result = fromPersistableState({
        ...toPersistableState(DEFAULT_PERSISTED_TO_BROWSER),
        launcherIsExpanded: true,
      });

      expect(result.launcherIsExpanded).toBe(false);
    });

    it("fills defaults for omitted fields", () => {
      const result = fromPersistableState({} as PersistableState);

      expect(result.disclaimersAccepted).toEqual({});
      expect(result.homeScreenState).toEqual(
        DEFAULT_PERSISTED_TO_BROWSER.homeScreenState,
      );
    });
  });

  describe("round-trip", () => {
    it("preserves the restorable, session-critical fields", () => {
      const original: PersistedState = {
        ...DEFAULT_PERSISTED_TO_BROWSER,
        hasSentNonWelcomeMessage: true,
        disclaimersAccepted: { "example.com": true },
        homeScreenState: { isHomeScreenOpen: true, showBackToAssistant: true },
        humanAgentState: {
          ...DEFAULT_PERSISTED_TO_BROWSER.humanAgentState,
          isConnected: true,
        },
      };

      const restored = fromPersistableState(toPersistableState(original));

      expect(restored.hasSentNonWelcomeMessage).toBe(true);
      expect(restored.disclaimersAccepted).toEqual({ "example.com": true });
      expect(restored.homeScreenState.isHomeScreenOpen).toBe(true);
      expect(restored.humanAgentState.isConnected).toBe(true);
    });
  });
});
