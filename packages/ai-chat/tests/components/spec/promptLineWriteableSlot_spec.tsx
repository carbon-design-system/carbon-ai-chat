/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Contract test for `PromptLineWriteableSlot`. The slot lives inside the input
 * composer's flex rows and doubles as a `data-floating-menu-container`, so when
 * it has no content it must collapse out of the flex flow (rendered `hidden`)
 * rather than occupy a track and shift the prompt line / send button. With no
 * slotted content it stays hidden while still emitting the marked wrapper and
 * the named catch `<slot>` so content can later be projected into it.
 */

import React from "react";
import { render } from "@testing-library/react";

import PromptLineWriteableSlot from "../../../src/chat/components/input/PromptLineWriteableSlot";
import { WriteableElementName } from "../../../src/types/instance/WriteableElements";

describe("PromptLineWriteableSlot", () => {
  it("renders a marked, hidden floating-menu container around the named catch slot when empty", () => {
    const { container } = render(
      <PromptLineWriteableSlot
        slotName={WriteableElementName.PROMPT_LINE_ACTIONS_END}
        wrapperSlot="message-actions"
      />,
    );

    const wrapper = container.querySelector("[data-prompt-line-slot]");
    expect(wrapper).not.toBeNull();
    // Projects into the input-shell `message-actions` slot.
    expect(wrapper?.getAttribute("slot")).toBe("message-actions");
    // Stays a real (positioning) box for Carbon tooltip/popover anchoring.
    expect(wrapper?.hasAttribute("data-floating-menu-container")).toBe(true);
    // No content yet -> collapsed so it adds no flex gap before the prompt line.
    expect(wrapper?.hasAttribute("hidden")).toBe(true);

    const slot = wrapper?.querySelector("slot");
    expect(slot?.getAttribute("name")).toBe("promptLineActionsEnd");
  });
});
