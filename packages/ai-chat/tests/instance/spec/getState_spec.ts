/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from "../helpers/chatInstanceTestHelpers";

describe("ChatInstance.getState", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("exposes flattened persisted state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const state = instance.getState();
    const reduxPersisted = store.getState().persistedToBrowserStorage;

    expect(state.version).toBe(reduxPersisted.version);
    expect(state.viewState).toEqual(reduxPersisted.viewState);
    expect(state.showUnreadIndicator).toBe(reduxPersisted.showUnreadIndicator);
    expect(state.humanAgent.isConnected).toBe(
      reduxPersisted.humanAgentState.isConnected,
    );
    expect(state.humanAgent.isSuspended).toBe(
      reduxPersisted.humanAgentState.isSuspended,
    );
    expect(state.humanAgent.isConnecting).toBe(
      store.getState().humanAgentState.isConnecting,
    );
    expect(state).not.toHaveProperty("persistedToBrowserStorage");
  });

  it("freezes the persisted snapshot", async () => {
    const config = createBaseConfig();
    const { instance } = await renderChatAndGetInstanceWithStore(config);

    const state = instance.getState();

    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.humanAgent)).toBe(true);
    expect(() => {
      (state as { showUnreadIndicator: boolean }).showUnreadIndicator = false;
    }).toThrow();
    expect(() => {
      (state.humanAgent as { isConnecting: boolean }).isConnecting = true;
    }).toThrow();
  });
});
