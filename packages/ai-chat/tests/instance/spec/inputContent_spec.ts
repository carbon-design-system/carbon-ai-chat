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

const docFromText = (text: string) => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text }],
    },
  ],
});

describe("ChatInstance.input.updateContent (text-only)", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("updateContent replaces the input with a plain-text doc", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    instance.input.updateContent(() => docFromText("hello"));

    expect(store.getState().assistantInputState.rawValue).toBe("hello");
    expect(instance.getState().input.rawValue).toBe("hello");
  });

  it("updateContent updater receives the current JSONContent", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    instance.input.updateContent(() => docFromText("hi"));

    instance.input.updateContent((prev) => {
      const text = (prev.content ?? [])
        .flatMap((para) => para.content ?? [])
        .filter((node) => node.type === "text")
        .map((node) => node.text ?? "")
        .join("");
      return docFromText(`${text} there`);
    });

    expect(instance.getState().input.rawValue).toBe("hi there");
  });

  it("getState().input.content reflects writes (JSONContent shape)", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    instance.input.updateContent(() => docFromText("abc"));

    const content = instance.getState().input.content;
    expect(content.type).toBe("doc");
    expect(content.content?.[0]?.type).toBe("paragraph");
    const text = content.content?.[0]?.content?.[0];
    expect(text?.type).toBe("text");
    expect(text?.text).toBe("abc");
  });

  it("rawValue and JSONContent stay consistent in Redux on every doc change", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    instance.input.updateContent(() => docFromText("x"));
    expect(store.getState().assistantInputState.rawValue).toBe("x");
    expect(store.getState().assistantInputState.content).toEqual(
      expect.objectContaining({ type: "doc" }),
    );

    instance.input.updateContent(() => docFromText("yz"));
    expect(store.getState().assistantInputState.rawValue).toBe("yz");
  });
});

describe("ChatInstance.input.updateRawValue (deprecation policy)", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("updateRawValue continues to work for plain-text-only docs", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    instance.input.updateRawValue(() => "hello");
    expect(store.getState().assistantInputState.rawValue).toBe("hello");
  });
});
