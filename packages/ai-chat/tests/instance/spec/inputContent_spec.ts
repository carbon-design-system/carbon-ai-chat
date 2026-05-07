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

describe("ChatInstance.input.setContent / insertContent (text-only)", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("setContent replaces the input with a plain-text string", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    instance.input.setContent("hello");

    expect(store.getState().assistantInputState.rawValue).toBe("hello");
    expect(instance.getState().input.rawValue).toBe("hello");
  });

  it("setContent updater receives the current JSONContent", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    instance.input.setContent("hi");

    instance.input.setContent((prev) => {
      // prev is a Tiptap JSONContent doc; flatten its text and append.
      const text = (prev.content ?? [])
        .flatMap((para) => para.content ?? [])
        .filter((node) => node.type === "text")
        .map((node) => node.text ?? "")
        .join("");
      return {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: `${text} there` }],
          },
        ],
      };
    });

    expect(instance.getState().input.rawValue).toBe("hi there");
  });

  it("insertContent at default position appends", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    instance.input.setContent("abc");
    instance.input.insertContent("def");

    expect(instance.getState().input.rawValue).toBe("abcdef");
  });

  it("insertContent honors options.at", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    instance.input.setContent("world");
    // PM document offset 1 lands inside the first paragraph at the very start.
    instance.input.insertContent("hello ", { at: 1 });

    expect(instance.getState().input.rawValue).toBe("hello world");
  });

  it("getState().input.content reflects writes (JSONContent shape)", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    instance.input.setContent("abc");

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

    instance.input.setContent("x");
    expect(store.getState().assistantInputState.rawValue).toBe("x");
    expect(store.getState().assistantInputState.content).toEqual(
      expect.objectContaining({ type: "doc" }),
    );

    instance.input.setContent("yz");
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
