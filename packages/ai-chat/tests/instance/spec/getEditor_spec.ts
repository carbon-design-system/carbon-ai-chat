/*
 *  Copyright IBM Corp. 2026
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
} from "../../test_helpers";

describe("ChatInstance.input.getEditor", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("exposes a getEditor() method on instance.input", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    expect(typeof instance.input.getEditor).toBe("function");
  });

  it("never throws when called", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    expect(() => instance.input.getEditor()).not.toThrow();
  });

  it("returns either an Editor instance or null (probe semantics)", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const editor = instance.input.getEditor();
    expect(editor === null || typeof editor === "object").toBe(true);
    if (editor) {
      // When mounted, the Tiptap Editor exposes commands and a view.
      expect(typeof editor.commands).toBe("object");
      expect(editor.view).toBeDefined();
    }
  });

  it("does NOT expose the removed instance.input.commands namespace", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    expect(
      (instance.input as unknown as { commands?: unknown }).commands,
    ).toBeUndefined();
  });
});
