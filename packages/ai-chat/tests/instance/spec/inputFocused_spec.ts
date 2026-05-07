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
import {
  createBaseConfig,
  renderChatAndGetInstanceWithStore,
  setupAfterEach,
  setupBeforeEach,
} from "../../test_helpers";
import { BusEventType } from "../../../src/types/events/eventBusTypes";

/**
 * Walks the nested shadow roots looking for the rendered input-shell,
 * waiting for it to mount if necessary. The chat host uses Lit shadow
 * boundaries so a top-level `document.querySelector` cannot reach inside.
 */
async function findShell(): Promise<Element> {
  return waitFor(
    () => {
      const shell = deepQuerySelector(document, "cds-aichat-input-shell");
      if (!shell) {
        throw new Error("input shell not mounted");
      }
      return shell;
    },
    { timeout: 5000 },
  );
}

/**
 * Dispatches a `cds-aichat-input-focus` / `cds-aichat-input-blur` event on
 * the input-shell element exactly the way the prompt-line → shell pipeline
 * does in production. The React wrapper attaches an event listener that
 * routes these to the `onFocus` / `onBlur` props the Input container
 * subscribes to.
 */
async function dispatchShellFocusEvent(
  type: "cds-aichat-input-focus" | "cds-aichat-input-blur",
): Promise<void> {
  const shell = await findShell();
  shell.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true }));
}

describe("ChatInstance.input.focused (PublicInputState)", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("starts as false before any focus/blur event", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    expect(instance.getState().input.focused).toBe(false);
    expect(store.getState().assistantInputState.focused).toBe(false);
  });

  it("flips to true on cds-aichat-input-focus and back to false on blur", async () => {
    const { instance, store } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    await dispatchShellFocusEvent("cds-aichat-input-focus");

    await waitFor(() => {
      expect(store.getState().assistantInputState.focused).toBe(true);
    });
    expect(instance.getState().input.focused).toBe(true);

    await dispatchShellFocusEvent("cds-aichat-input-blur");

    await waitFor(() => {
      expect(store.getState().assistantInputState.focused).toBe(false);
    });
    expect(instance.getState().input.focused).toBe(false);
  });

  it("fires STATE_CHANGE with focused transitions in previousState/newState", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const transitions: Array<{ prev: boolean; next: boolean }> = [];
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: any) => {
        if (
          event.previousState.input.focused !== event.newState.input.focused
        ) {
          transitions.push({
            prev: event.previousState.input.focused,
            next: event.newState.input.focused,
          });
        }
      },
    });

    await dispatchShellFocusEvent("cds-aichat-input-focus");
    await waitFor(() => {
      expect(transitions).toContainEqual({ prev: false, next: true });
    });

    await dispatchShellFocusEvent("cds-aichat-input-blur");
    await waitFor(() => {
      expect(transitions).toContainEqual({ prev: true, next: false });
    });
  });

  it("does NOT fire STATE_CHANGE when the same focus state dispatches twice", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const focusFlips: boolean[] = [];
    instance.on({
      type: BusEventType.STATE_CHANGE,
      handler: (event: any) => {
        if (
          event.previousState.input.focused !== event.newState.input.focused
        ) {
          focusFlips.push(event.newState.input.focused);
        }
      },
    });

    await dispatchShellFocusEvent("cds-aichat-input-focus");
    await dispatchShellFocusEvent("cds-aichat-input-focus");

    await waitFor(() => {
      expect(focusFlips).toEqual([true]);
    });
  });

  it("public input.focused is included in the frozen public snapshot", async () => {
    const { instance } =
      await renderChatAndGetInstanceWithStore(createBaseConfig());

    const snapshot = instance.getState().input;
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(snapshot).toHaveProperty("focused");
    expect(typeof snapshot.focused).toBe("boolean");
  });
});
