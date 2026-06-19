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

  it("returns a promise (loads Tiptap on demand)", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const result = instance.input.getEditor();
    expect(typeof (result as Promise<unknown>).then).toBe("function");
    // Don't leave a rejection unhandled if the rich runtime can't mount under
    // jsdom — the live-upgrade behavior is covered by the prompt-line
    // web-component test, which runs in a real browser.
    result.catch((): void => undefined);
  });

  it("resolves with a live Tiptap Editor, upgrading the surface", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const editor = await instance.input.getEditor();
    expect(typeof editor.commands).toBe("object");
    expect(editor.view).toBeDefined();

    // The upgrade is one-way: a second call resolves the same instance.
    const again = await instance.input.getEditor();
    expect(again).toBe(editor);
  });

  it("does NOT expose the removed instance.input.commands namespace", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    expect(
      (instance.input as unknown as { commands?: unknown }).commands,
    ).toBeUndefined();
  });
});
