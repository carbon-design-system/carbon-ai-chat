/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { waitFor } from "@testing-library/react";
import { deepQuerySelector } from "@carbon/ai-chat-components/es/globals/utils/dom-utils.js";
import type { PromptLineElement } from "@carbon/ai-chat-components/es/components/prompt-line/index.js";
import { Node } from "@tiptap/core";
import type { Extension } from "@tiptap/core";

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

// A doc carrying a mark that no schema in these tests supports — enough to fail
// the plain-text gate and drive the on-demand rich upgrade.
const markedDoc = () => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "x", marks: [{ type: "bold" }] }],
    },
  ],
});

// A minimal inline atom node so a host can stage a custom node via
// `input.tiptap.extensions` and exercise the lazy lite -> rich upgrade.
const TestChip = Node.create({
  name: "testChip",
  group: "inline",
  inline: true,
  atom: true,
  parseHTML() {
    return [{ tag: "span[data-test-chip]" }];
  },
  renderHTML() {
    return ["span", { "data-test-chip": "" }];
  },
});

const chipDoc = () => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "testChip" }] }],
});

function configWithChip() {
  const config = createBaseConfig();
  config.input = {
    ...config.input,
    tiptap: { extensions: [TestChip as unknown as Extension] },
  };
  return config;
}

// The chat host renders behind nested shadow roots, so reach the prompt-line
// element with the deep query helper. Its own `getEditor()` is a probe that
// returns null in textarea mode and never triggers a Tiptap load.
async function getPromptLine(): Promise<PromptLineElement> {
  return waitFor(
    () => {
      const el = deepQuerySelector(document, "cds-aichat-prompt-line");
      if (!el) {
        throw new Error("prompt-line not mounted");
      }
      return el as unknown as PromptLineElement;
    },
    { timeout: 5000 },
  );
}

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

  it("returns a promise", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const result = instance.input.updateContent(() => docFromText("x"));
    expect(typeof (result as Promise<void>).then).toBe("function");
    await result;
  });

  it("plain-text writes stay in the textarea — no Tiptap load", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const promptLine = await getPromptLine();

    await instance.input.updateContent(() => docFromText("hello"));

    expect(promptLine.getEditor()).toBeNull();
  });
});

describe("ChatInstance.input.updateContent (lazy rich upgrade)", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("upgrades the textarea on demand when given non-text content", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());
    const promptLine = await getPromptLine();
    expect(promptLine.getEditor()).toBeNull();

    await instance.input.updateContent(markedDoc);

    await waitFor(() => {
      expect(promptLine.getEditor()).not.toBeNull();
    });
  });
});

describe("ChatInstance.input.updateContent (configured tiptap extension)", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("mounts the rich editor for a configured extension, with it installed", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(configWithChip());
    const promptLine = await getPromptLine();

    // A configured tiptap extension forces rich (it may contribute input rules
    // / shortcuts that only run in a live editor), so the editor mounts without
    // a prior updateContent / getEditor call.
    await waitFor(() => {
      expect(promptLine.getEditor()).not.toBeNull();
    });

    await instance.input.updateContent(chipDoc);

    // The custom node survives because the editor mounted with the staged
    // extension installed in its schema.
    expect(JSON.stringify(promptLine.getEditor()!.getJSON())).toContain(
      "testChip",
    );
  });
});

describe("ChatInstance.input.updateContent (input hidden / not rendered)", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  const hiddenConfig = () => {
    const config = createBaseConfig();
    config.input = { ...config.input, isVisible: false };
    return config;
  };

  it("seeds the pending rawValue with plain text when there is no surface", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(hiddenConfig());

    await instance.input.updateContent(() => docFromText("seeded"));

    expect(store.getState().assistantInputState.rawValue).toBe("seeded");
  });

  it("throws on non-text content when there is no surface to upgrade", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(hiddenConfig());

    await expect(instance.input.updateContent(markedDoc)).rejects.toThrow(
      /rendered/,
    );
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
