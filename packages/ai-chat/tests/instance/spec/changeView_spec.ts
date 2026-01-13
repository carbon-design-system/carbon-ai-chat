/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ViewState, ViewType } from "../../../src/aiChatEntry";
import {
  createBaseConfig,
  renderChatAndGetInstance,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from "../../test_helpers";

describe("ChatInstance.changeView", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have changeView method available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.changeView).toBe("function");
  });

  it("should return a Promise", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const result = instance.changeView("launcher" as ViewType);
    expect(result).toBeInstanceOf(Promise);
  });

  it("should accept ViewType string values and update Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Test launcher view
    await instance.changeView("launcher" as ViewType);
    let state = store.getState();
    expect(state.persistedToBrowserStorage.viewState.launcher).toBe(true);
    expect(state.persistedToBrowserStorage.viewState.mainWindow).toBe(false);

    // Test mainWindow view
    await instance.changeView("mainWindow" as ViewType);
    state = store.getState();
    expect(state.persistedToBrowserStorage.viewState.launcher).toBe(false);
    expect(state.persistedToBrowserStorage.viewState.mainWindow).toBe(true);
  });

  it("should accept ViewState object and update Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    const viewState = {
      launcher: true,
      mainWindow: false,
    };

    await instance.changeView(viewState);

    const state = store.getState();
    expect(state.persistedToBrowserStorage.viewState.launcher).toBe(true);
    expect(state.persistedToBrowserStorage.viewState.mainWindow).toBe(false);
  });

  it("should accept partial ViewState object and update Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // First set both views to a known state
    await instance.changeView({ launcher: true, mainWindow: true });
    let state = store.getState();
    expect(state.persistedToBrowserStorage.viewState.launcher).toBe(true);
    expect(state.persistedToBrowserStorage.viewState.mainWindow).toBe(true);

    // Now update only launcher with partial ViewState
    const partialViewState = {
      launcher: false,
    };

    await instance.changeView(partialViewState as ViewState);

    state = store.getState();
    expect(state.persistedToBrowserStorage.viewState.launcher).toBe(false);
    // mainWindow should remain unchanged
    expect(state.persistedToBrowserStorage.viewState.mainWindow).toBe(true);
  });

  it("should update view state accessible through getState", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    await instance.changeView("launcher" as ViewType);

    // Get updated state from both instance and store
    const newInstanceState = instance.getState();
    const newStoreState = store.getState();

    // Verify both instance and store have updated viewState
    expect(newInstanceState.viewState).toBeDefined();
    expect(typeof newInstanceState.viewState).toBe("object");
    expect(newInstanceState.viewState.launcher).toBe(true);
    expect(newInstanceState.viewState.mainWindow).toBe(false);

    expect(newStoreState.persistedToBrowserStorage.viewState).toBeDefined();
    expect(newStoreState.persistedToBrowserStorage.viewState.launcher).toBe(
      true,
    );
    expect(newStoreState.persistedToBrowserStorage.viewState.mainWindow).toBe(
      false,
    );

    // Verify instance and store states are in sync
    expect(newInstanceState.viewState).toEqual(
      newStoreState.persistedToBrowserStorage.viewState,
    );
  });

  it("triggers hydration when mainWindow is opened and chat is not hydrated", async () => {
    const config = createBaseConfig();
    const { instance, serviceManager } =
      await renderChatAndGetInstanceWithStore(config);
    const hydrateSpy = jest
      .spyOn(serviceManager.actions, "hydrateChat")
      .mockResolvedValue(undefined);

    await instance.changeView(ViewType.MAIN_WINDOW);

    expect(hydrateSpy).toHaveBeenCalled();
  });

  describe("comprehensive ViewType tests", () => {
    it("should handle switching between all ViewType values", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // Test switching to launcher
      await instance.changeView("launcher" as ViewType);
      let state = store.getState();
      expect(state.persistedToBrowserStorage.viewState.launcher).toBe(true);
      expect(state.persistedToBrowserStorage.viewState.mainWindow).toBe(false);

      // Test switching to mainWindow
      await instance.changeView("mainWindow" as ViewType);
      state = store.getState();
      expect(state.persistedToBrowserStorage.viewState.launcher).toBe(false);
      expect(state.persistedToBrowserStorage.viewState.mainWindow).toBe(true);

      // Test switching back to launcher
      await instance.changeView("launcher" as ViewType);
      state = store.getState();
      expect(state.persistedToBrowserStorage.viewState.launcher).toBe(true);
      expect(state.persistedToBrowserStorage.viewState.mainWindow).toBe(false);
    });

    it("should handle ViewState with both views true", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      const viewState = {
        launcher: true,
        mainWindow: true,
      };

      await instance.changeView(viewState);

      const state = store.getState();
      expect(state.persistedToBrowserStorage.viewState.launcher).toBe(true);
      expect(state.persistedToBrowserStorage.viewState.mainWindow).toBe(true);
    });

    it("should handle ViewState with both views false", async () => {
      const config = createBaseConfig();
      const { instance, store } =
        await renderChatAndGetInstanceWithStore(config);

      // First set both to true
      await instance.changeView({ launcher: true, mainWindow: true });

      // Then set both to false
      const viewState = {
        launcher: false,
        mainWindow: false,
      };

      await instance.changeView(viewState);

      const state = store.getState();
      expect(state.persistedToBrowserStorage.viewState.launcher).toBe(false);
      expect(state.persistedToBrowserStorage.viewState.mainWindow).toBe(false);
    });
  });
});
