/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Unit tests for the framework-agnostic `AutocompleteController`. Both the
 * React hook (`useChatAutocomplete`) and the `<cds-aichat-autocomplete-
 * controller>` Lit element wrap this class, so behavioral coverage lives
 * here.
 */

import { expect } from "@open-wc/testing";

import { AutocompleteController } from "../autocomplete-controller.js";
import type {
  AutocompleteConfig,
  CustomListProps,
  SuggestionItem,
  TriggerSuggestionConfig,
} from "../tiptap/types.js";

const USERS: SuggestionItem[] = [
  { id: "1", label: "Alice", value: "@alice" },
  { id: "2", label: "Bob", value: "@bob" },
  { id: "3", label: "Carol", value: "@carol" },
];

const COMMANDS: SuggestionItem[] = [
  { id: "summarize", label: "summarize" },
  { id: "translate", label: "translate" },
];

const STARTERS: SuggestionItem[] = [
  { id: "hello", label: "Say hello" },
  { id: "intro", label: "Introduce yourself" },
];

interface ChainStub {
  focus: () => ChainStub;
  insertContentAt: (
    range: { from: number; to: number },
    nodes: unknown[],
  ) => ChainStub;
  run: () => void;
}

interface EditorStub {
  insertContent: (text: string) => void;
  insertContentAt: ChainStub["insertContentAt"];
  selectionFrom: number;
  rawValue: string;
}

function makeEditorStub(): { editor: EditorStub; promptLine: any } {
  const editor: EditorStub = {
    selectionFrom: 0,
    rawValue: "",
    insertContent(text: string) {
      this.rawValue += text;
    },
    insertContentAt(range, nodes) {
      // Approximate: append text contributions so we can assert routing.
      for (const node of nodes as any[]) {
        if (node.type === "text") {
          this.rawValue += node.text ?? "";
        } else {
          this.rawValue += node.attrs?.value ?? node.attrs?.label ?? "";
        }
      }
      return chain;
    },
  };
  const chain: ChainStub = {
    focus: () => chain,
    insertContentAt: (range, nodes) => editor.insertContentAt(range, nodes),
    run: () => {},
  };
  const editorWrapper = {
    commands: {
      insertContent: (t: string) => editor.insertContent(t),
    },
    chain: () => chain,
    state: {
      get selection() {
        return { from: editor.selectionFrom };
      },
    },
    getJSON: () => ({ type: "doc", content: [] }),
  };
  const promptLine = {
    getEditor: () => editorWrapper,
  };
  return { editor, promptLine };
}

function flush(): Promise<void> {
  // Two microtask ticks: one for the async resolver, one for state to settle.
  return Promise.resolve().then(() => Promise.resolve());
}

describe("AutocompleteController", () => {
  it("resolves mention items synchronously from an array config", async () => {
    let last: { trigger: any; items: SuggestionItem[] } | null = null;
    const controller = new AutocompleteController({
      mention: { trigger: "@", items: USERS } as TriggerSuggestionConfig,
      onChange: (state) => {
        last = { trigger: state.trigger, items: state.items };
      },
    });
    controller.handleTriggerChange({
      type: "mention",
      query: "",
      triggerOffset: 0,
    });
    await flush();
    expect(last).to.not.equal(null);
    expect(last!.items.length).to.equal(USERS.length);
  });

  it("filters items by case-insensitive substring on the query", async () => {
    let last: SuggestionItem[] = [];
    const controller = new AutocompleteController({
      mention: { trigger: "@", items: USERS },
      onChange: (state) => {
        last = state.items;
      },
    });
    controller.handleTriggerChange({
      type: "mention",
      query: "ar",
      triggerOffset: 0,
    });
    await flush();
    expect(last.map((i) => i.label)).to.deep.equal(["Carol"]);
  });

  it("returns starters items for type=starter regardless of query", async () => {
    let last: SuggestionItem[] = [];
    const controller = new AutocompleteController({
      starters: STARTERS,
      onChange: (state) => {
        last = state.items;
      },
    });
    controller.handleTriggerChange({
      type: "starter",
      query: "anything",
      triggerOffset: 0,
    });
    await flush();
    expect(last.length).to.equal(STARTERS.length);
  });

  it("clears items when handleTriggerChange(null) is called", async () => {
    let last: { trigger: any; items: SuggestionItem[] } = {
      trigger: null,
      items: [],
    };
    const controller = new AutocompleteController({
      mention: { trigger: "@", items: USERS },
      onChange: (state) => {
        last = { trigger: state.trigger, items: state.items };
      },
    });
    controller.handleTriggerChange({
      type: "mention",
      query: "",
      triggerOffset: 0,
    });
    await flush();
    expect(last.items.length).to.equal(USERS.length);
    controller.handleTriggerChange(null);
    expect(last.trigger).to.equal(null);
    expect(last.items.length).to.equal(0);
  });

  it("dismiss() clears trigger and items", async () => {
    let last: any = null;
    const controller = new AutocompleteController({
      mention: { trigger: "@", items: USERS },
      onChange: (state) => {
        last = state;
      },
    });
    controller.handleTriggerChange({
      type: "mention",
      query: "",
      triggerOffset: 0,
    });
    await flush();
    controller.dismiss();
    expect(last.trigger).to.equal(null);
    expect(last.items.length).to.equal(0);
  });

  it("protects against stale async resolves clobbering a newer trigger", async () => {
    // Slow async config + fast follow-up: the older resolve must not win.
    const slowConfig: AutocompleteConfig = {
      items: async (q) => {
        await new Promise((r) => setTimeout(r, 30));
        return [{ id: q, label: `slow-${q}` }];
      },
    };
    const fastConfig: AutocompleteConfig = {
      items: async (q) => {
        await new Promise((r) => setTimeout(r, 1));
        return [{ id: q, label: `fast-${q}` }];
      },
    };
    let last: SuggestionItem[] = [];
    const controller = new AutocompleteController({
      autocomplete: slowConfig,
      onChange: (state) => {
        last = state.items;
      },
    });
    controller.handleTriggerChange({
      type: "autocomplete",
      query: "first",
      triggerOffset: 0,
    });
    controller.setConfigs({ autocomplete: fastConfig });
    controller.handleTriggerChange({
      type: "autocomplete",
      query: "second",
      triggerOffset: 0,
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(last.length).to.equal(1);
    expect(last[0].label).to.equal("fast-second");
  });

  it("select() routes a mention through editor.chain().insertContentAt(...)", async () => {
    const { editor, promptLine } = makeEditorStub();
    const controller = new AutocompleteController({
      mention: { trigger: "@", items: USERS },
      onChange: () => {},
    });
    controller.setPromptLine(promptLine);
    controller.handleTriggerChange({
      type: "mention",
      query: "",
      triggerOffset: 0,
    });
    await flush();
    controller.select(USERS[0]);
    expect(editor.rawValue).to.contain("@alice");
  });

  it("select() routes a starter through editor.commands.insertContent and fires onStarterSelected", async () => {
    const { editor, promptLine } = makeEditorStub();
    let starterText: string | null = null;
    const controller = new AutocompleteController({
      starters: STARTERS,
      isSendDisabled: false,
      onStarterSelected: (text) => {
        starterText = text;
      },
      onChange: () => {},
    });
    controller.setPromptLine(promptLine);
    controller.handleTriggerChange({
      type: "starter",
      query: "",
      triggerOffset: 0,
    });
    await flush();
    controller.select(STARTERS[0]);
    expect(editor.rawValue).to.equal("Say hello");
    // onStarterSelected receives the editor's rawValue projection — our
    // stub's `projectRawValue` will read an empty doc, so we only verify
    // the callback fired.
    expect(starterText).to.not.equal(null);
  });

  it("isSendDisabled=true suppresses onStarterSelected", async () => {
    const { promptLine } = makeEditorStub();
    let starterFired = false;
    const controller = new AutocompleteController({
      starters: STARTERS,
      isSendDisabled: true,
      onStarterSelected: () => {
        starterFired = true;
      },
      onChange: () => {},
    });
    controller.setPromptLine(promptLine);
    controller.handleTriggerChange({
      type: "starter",
      query: "",
      triggerOffset: 0,
    });
    await flush();
    controller.select(STARTERS[0]);
    expect(starterFired).to.equal(false);
  });

  it("setConfigs() updates configs and re-resolves the active trigger", async () => {
    let last: SuggestionItem[] = [];
    const controller = new AutocompleteController({
      command: { trigger: "/", items: COMMANDS },
      onChange: (state) => {
        last = state.items;
      },
    });
    controller.handleTriggerChange({
      type: "command",
      query: "",
      triggerOffset: 0,
    });
    await flush();
    expect(last.length).to.equal(COMMANDS.length);

    // Swap to a different list — the active trigger should resolve against
    // the new config without the consumer re-firing it.
    const NEXT = [{ id: "x", label: "x-only" }];
    controller.setConfigs({ command: { trigger: "/", items: NEXT } });
    await flush();
    expect(last.length).to.equal(1);
    expect(last[0].label).to.equal("x-only");
  });

  it("emits the active trigger's renderCustomList through state", async () => {
    let last: any = null;
    const renderCustomList = (_props: CustomListProps) => null;
    const controller = new AutocompleteController({
      autocomplete: { items: USERS, renderCustomList },
      onChange: (state) => {
        last = state;
      },
    });
    controller.handleTriggerChange({
      type: "autocomplete",
      query: "",
      triggerOffset: 0,
    });
    await flush();
    expect(last.renderCustomList).to.equal(renderCustomList);
  });

  describe("editor-DOM key forwarding", () => {
    function makeEditorStubWithDom(): {
      editorDom: HTMLElement;
      promptLine: any;
    } {
      const editorDom = document.createElement("div");
      const editorWrapper = {
        view: { dom: editorDom },
        commands: { insertContent: () => {} },
        chain: () => ({
          focus: () => ({
            insertContentAt: () => ({ run: () => {} }),
          }),
        }),
        state: { selection: { from: 0 } },
      };
      const promptLine = { getEditor: () => editorWrapper };
      return { editorDom, promptLine };
    }

    function captureSyntheticKeys(el: HTMLElement): string[] {
      const received: string[] = [];
      el.addEventListener("keydown", (event) => {
        received.push((event as KeyboardEvent).key);
      });
      return received;
    }

    it("forwards ArrowDown/ArrowUp/Enter/Escape on the editor to the list", async () => {
      const { editorDom, promptLine } = makeEditorStubWithDom();
      const listEl = document.createElement("div");
      const received = captureSyntheticKeys(listEl);

      const controller = new AutocompleteController({
        mention: { trigger: "@", items: USERS },
        onChange: () => {},
      });
      controller.setPromptLine(promptLine);
      controller.setListElement(listEl);
      controller.handleTriggerChange({
        type: "mention",
        query: "",
        triggerOffset: 0,
      });
      await flush();

      for (const key of ["ArrowDown", "ArrowUp", "Enter", "Escape"]) {
        editorDom.dispatchEvent(
          new KeyboardEvent("keydown", {
            key,
            bubbles: true,
            cancelable: true,
          }),
        );
      }
      expect(received).to.deep.equal([
        "ArrowDown",
        "ArrowUp",
        "Enter",
        "Escape",
      ]);
    });

    it("calls preventDefault on the original editor event", async () => {
      const { editorDom, promptLine } = makeEditorStubWithDom();
      const listEl = document.createElement("div");

      const controller = new AutocompleteController({
        mention: { trigger: "@", items: USERS },
        onChange: () => {},
      });
      controller.setPromptLine(promptLine);
      controller.setListElement(listEl);
      controller.handleTriggerChange({
        type: "mention",
        query: "",
        triggerOffset: 0,
      });
      await flush();

      const event = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      });
      editorDom.dispatchEvent(event);
      expect(event.defaultPrevented).to.equal(true);
    });

    it("does not forward non-navigation keys", async () => {
      const { editorDom, promptLine } = makeEditorStubWithDom();
      const listEl = document.createElement("div");
      const received = captureSyntheticKeys(listEl);

      const controller = new AutocompleteController({
        mention: { trigger: "@", items: USERS },
        onChange: () => {},
      });
      controller.setPromptLine(promptLine);
      controller.setListElement(listEl);
      controller.handleTriggerChange({
        type: "mention",
        query: "",
        triggerOffset: 0,
      });
      await flush();

      editorDom.dispatchEvent(
        new KeyboardEvent("keydown", { key: "a", bubbles: true }),
      );
      editorDom.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
      );
      expect(received).to.deep.equal([]);
    });

    it("does not forward keys when no trigger is active", async () => {
      const { editorDom, promptLine } = makeEditorStubWithDom();
      const listEl = document.createElement("div");
      const received = captureSyntheticKeys(listEl);

      const controller = new AutocompleteController({
        mention: { trigger: "@", items: USERS },
        onChange: () => {},
      });
      controller.setPromptLine(promptLine);
      controller.setListElement(listEl);
      // No handleTriggerChange — listener should not be attached.

      editorDom.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
      expect(received).to.deep.equal([]);
    });

    it("does not forward keys when no list element is registered", async () => {
      const { editorDom, promptLine } = makeEditorStubWithDom();

      const controller = new AutocompleteController({
        mention: { trigger: "@", items: USERS },
        onChange: () => {},
      });
      controller.setPromptLine(promptLine);
      controller.handleTriggerChange({
        type: "mention",
        query: "",
        triggerOffset: 0,
      });
      await flush();

      const event = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      });
      // No listener registered — dispatching should not throw, and the
      // event should pass through (no preventDefault).
      editorDom.dispatchEvent(event);
      expect(event.defaultPrevented).to.equal(false);
    });

    it("detaches the editor listener on dismiss", async () => {
      const { editorDom, promptLine } = makeEditorStubWithDom();
      const listEl = document.createElement("div");
      const received = captureSyntheticKeys(listEl);

      const controller = new AutocompleteController({
        mention: { trigger: "@", items: USERS },
        onChange: () => {},
      });
      controller.setPromptLine(promptLine);
      controller.setListElement(listEl);
      controller.handleTriggerChange({
        type: "mention",
        query: "",
        triggerOffset: 0,
      });
      await flush();
      controller.dismiss();

      editorDom.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
      );
      expect(received).to.deep.equal([]);
    });
  });

  it("destroy() stops further updates", async () => {
    let lastEmittedAfterDestroy = false;
    const controller = new AutocompleteController({
      mention: {
        trigger: "@",
        items: async () => {
          await new Promise((r) => setTimeout(r, 5));
          return USERS;
        },
      },
      onChange: () => {
        if ((controller as any)._destroyed) {
          lastEmittedAfterDestroy = true;
        }
      },
    });
    controller.handleTriggerChange({
      type: "mention",
      query: "",
      triggerOffset: 0,
    });
    controller.destroy();
    await new Promise((r) => setTimeout(r, 20));
    expect(lastEmittedAfterDestroy).to.equal(false);
  });
});
