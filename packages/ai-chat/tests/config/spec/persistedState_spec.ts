/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import actions from "../../../src/chat/store/actions";
import { PersistableState } from "../../../src/types/config/PersistedStateConfig";
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from "../../test_helpers";

const HOSTNAME =
  typeof window !== "undefined" ? window.location.hostname : "localhost";

describe("PublicConfig.persistedState", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  describe("initialState", () => {
    it("hydrates the store from initialState instead of sessionStorage", async () => {
      const config = {
        ...createBaseConfig(),
        persistedState: {
          initialState: {
            hasSentNonWelcomeMessage: true,
            disclaimersAccepted: { [HOSTNAME]: true },
            homeScreenState: {
              isHomeScreenOpen: true,
              showBackToAssistant: false,
            },
          } as PersistableState,
        },
      };

      const { store } = await renderChatAndGetInstanceWithStore(config);
      const persisted = store.getState().persistedToBrowserStorage;

      expect(persisted.hasSentNonWelcomeMessage).toBe(true);
      expect(persisted.disclaimersAccepted[HOSTNAME]).toBe(true);
      expect(persisted.homeScreenState.isHomeScreenOpen).toBe(true);
      // A restored session must not re-fire openChatByDefault.
      expect(persisted.wasLoadedFromBrowser).toBe(true);
    });
  });

  describe("onStateChange", () => {
    it("reports persisted-state changes with a version-free PersistableState", async () => {
      const onStateChange = jest.fn();
      const config = {
        ...createBaseConfig(),
        persistedState: { onStateChange },
      };

      const { store } = await renderChatAndGetInstanceWithStore(config);

      onStateChange.mockClear();
      store.dispatch(actions.acceptDisclaimer());

      expect(onStateChange).toHaveBeenCalled();
      const emitted: PersistableState =
        onStateChange.mock.calls[onStateChange.mock.calls.length - 1][0];
      expect(emitted.disclaimersAccepted[HOSTNAME]).toBe(true);
      expect(emitted).not.toHaveProperty("version");
      expect(emitted).not.toHaveProperty("wasLoadedFromBrowser");
    });

    it("does not fire for non-persisted state changes", async () => {
      const onStateChange = jest.fn();
      const config = {
        ...createBaseConfig(),
        persistedState: { onStateChange },
      };

      const { store } = await renderChatAndGetInstanceWithStore(config);

      // No await between the clear and the assert, so no async boot task can
      // interleave: this isolates the single synchronous dispatch below.
      onStateChange.mockClear();
      store.dispatch(actions.setAppStateValue("isBrowserPageVisible", false));

      expect(onStateChange).not.toHaveBeenCalled();
    });
  });
});
