/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Integration test for the expanded-layout gating of the
 * `promptLineActionsEnd` writeable slot. The slot lives in the input's actions
 * row, which is only a usable track in the expanded layout, so it is rendered
 * only when `input.expanded` is set and omitted in the default compact layout.
 */

import { waitFor } from "@testing-library/react";
import { deepQuerySelector } from "@carbon/ai-chat-components/es/globals/utils/dom-utils.js";

import {
  createBaseConfig,
  renderChatAndGetInstance,
  setupAfterEach,
  setupBeforeEach,
} from "../../test_helpers";

const INPUT_SHELL = "cds-aichat-input-shell";
const SLOT_SELECTOR = 'slot[name="promptLineActionsEnd"]';

// The chat renders inside the `cds-aichat-react` shadow root, so DOM queries
// must start there and pierce nested shadow roots.
function chatRoot(): ShadowRoot | null {
  return document.querySelector("cds-aichat-react")?.shadowRoot ?? null;
}

function find(selector: string): Element | null {
  const root = chatRoot();
  return root ? deepQuerySelector(root, selector) : null;
}

describe("promptLineActionsEnd expanded gating", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("renders the promptLineActionsEnd slot in the expanded layout", async () => {
    const config = createBaseConfig();
    config.input = { ...config.input, expanded: true };

    await renderChatAndGetInstance(config);

    await waitFor(() => {
      expect(find(SLOT_SELECTOR)).not.toBeNull();
    });
  });

  it("omits the promptLineActionsEnd slot in the default (compact) layout", async () => {
    const config = createBaseConfig();

    await renderChatAndGetInstance(config);

    // Wait for the input to render, then confirm the slot was never projected.
    await waitFor(() => {
      expect(find(INPUT_SHELL)).not.toBeNull();
    });
    expect(find(SLOT_SELECTOR)).toBeNull();
  });
});
