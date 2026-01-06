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

describe("ChatInstance.updateWorkspaceAnimationBehaviour", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should disable workspace animations in Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.updateWorkspaceAnimationBehaviour(true);

    const state = store.getState();
    expect(state.workspacePanelState.options.disableAnimation).toBe(true);
  });

  it("should enable workspace animations in Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.updateWorkspaceAnimationBehaviour(false);

    const state = store.getState();
    expect(state.workspacePanelState.options.disableAnimation).toBe(false);
  });

  it("should toggle animation behavior and maintain correct Redux state", async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    instance.updateWorkspaceAnimationBehaviour(true);
    let state = store.getState();
    expect(state.workspacePanelState.options.disableAnimation).toBe(true);

    instance.updateWorkspaceAnimationBehaviour(false);
    state = store.getState();
    expect(state.workspacePanelState.options.disableAnimation).toBe(false);

    instance.updateWorkspaceAnimationBehaviour(true);
    state = store.getState();
    expect(state.workspacePanelState.options.disableAnimation).toBe(true);
  });
});
