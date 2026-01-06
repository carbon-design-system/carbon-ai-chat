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
  setupBeforeEach,
  setupAfterEach,
} from "../../test_helpers";

describe("ChatInstance.updateWorkspacePosition", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should set workspace position to 'start' in Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.updateWorkspacePosition("start");

    const state = store.getState();
    expect(state.workspacePanelState.options.preferredLocation).toBe("start");
  });

  it("should set workspace position to 'end' in Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.updateWorkspacePosition("end");

    const state = store.getState();
    expect(state.workspacePanelState.options.preferredLocation).toBe("end");
  });

  it("should toggle workspace position and maintain correct Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Set to start
    instance.updateWorkspacePosition("start");
    let state = store.getState();
    expect(state.workspacePanelState.options.preferredLocation).toBe("start");

    // Toggle to end
    instance.updateWorkspacePosition("end");
    state = store.getState();
    expect(state.workspacePanelState.options.preferredLocation).toBe("end");

    // Toggle back to start
    instance.updateWorkspacePosition("start");
    state = store.getState();
    expect(state.workspacePanelState.options.preferredLocation).toBe("start");
  });

  it("should preserve other workspace options when updating position", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Set animation behavior first
    instance.updateWorkspaceAnimationBehaviour(true);

    // Then update position
    instance.updateWorkspacePosition("end");

    const state = store.getState();
    expect(state.workspacePanelState.options.preferredLocation).toBe("end");
    expect(state.workspacePanelState.options.disableAnimation).toBe(true);
  });
});
