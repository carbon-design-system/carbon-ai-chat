/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  hasReasoningContent,
  resolveReasoningContainerOpen,
  synthesizeReasoningLocalMessageItem,
} from "../../../src/chat/utils/reasoningContent";
import {
  GenericItem,
  MessageResponseTypes,
  ReasoningStepOpenState,
  TextItem,
} from "../../../src/types/messaging/Messages";

describe("reasoningContent", () => {
  describe("hasReasoningContent", () => {
    it("returns false for undefined", () => {
      expect(hasReasoningContent(undefined)).toBe(false);
    });

    it("returns false for an empty string", () => {
      expect(hasReasoningContent("")).toBe(false);
    });

    it("returns true for a non-empty string", () => {
      expect(hasReasoningContent("hello")).toBe(true);
    });

    it("returns false for an empty array", () => {
      expect(hasReasoningContent([])).toBe(false);
    });

    it("returns true for an array with at least one item", () => {
      const item: TextItem = {
        response_type: MessageResponseTypes.TEXT,
        text: "hi",
      };
      expect(hasReasoningContent([item])).toBe(true);
    });
  });

  describe("resolveReasoningContainerOpen", () => {
    it("defaults to open in auto mode when nothing is set", () => {
      expect(resolveReasoningContainerOpen({})).toBe(true);
    });

    it("uses the auto state in auto mode", () => {
      expect(
        resolveReasoningContainerOpen({ autoReasoningContainerOpen: false }),
      ).toBe(false);
      expect(
        resolveReasoningContainerOpen({ autoReasoningContainerOpen: true }),
      ).toBe(true);
    });

    it("reflects the host's explicit open_state when the user has not overridden it", () => {
      expect(
        resolveReasoningContainerOpen({
          containerOpenState: ReasoningStepOpenState.CLOSE,
        }),
      ).toBe(false);
      expect(
        resolveReasoningContainerOpen({
          containerOpenState: ReasoningStepOpenState.OPEN,
        }),
      ).toBe(true);
    });

    it("lets the manual override win while the panel is host-controlled", () => {
      // User opened a panel the host is holding closed (open_state CLOSE).
      expect(
        resolveReasoningContainerOpen({
          manualReasoningOpen: true,
          containerOpenState: ReasoningStepOpenState.CLOSE,
        }),
      ).toBe(true);
      // ...and can close one the host is holding open.
      expect(
        resolveReasoningContainerOpen({
          manualReasoningOpen: false,
          containerOpenState: ReasoningStepOpenState.OPEN,
        }),
      ).toBe(false);
    });

    it("ignores a stale manual override once the message flips to auto mode", () => {
      // Repro for the controlled upsert example bug: the host drives the panel
      // with open_state CLOSE while streaming, the user opens it (recording
      // manualReasoningOpen=true), then the final snapshot drops open_state so
      // the message is now auto mode. The stale manual value must not pin the
      // panel open — otherwise the user can never collapse it again.
      expect(
        resolveReasoningContainerOpen({
          manualReasoningOpen: true,
          autoReasoningContainerOpen: false,
          containerOpenState: undefined,
        }),
      ).toBe(false);
    });

    it("treats DEFAULT open_state as auto mode (no host control)", () => {
      expect(
        resolveReasoningContainerOpen({
          manualReasoningOpen: true,
          autoReasoningContainerOpen: false,
          containerOpenState: ReasoningStepOpenState.DEFAULT,
        }),
      ).toBe(false);
    });
  });

  describe("synthesizeReasoningLocalMessageItem", () => {
    const textItem: TextItem = {
      response_type: MessageResponseTypes.TEXT,
      text: "step body",
    };

    it("returns the minimum-viable LocalMessageItem shape", () => {
      const wrapper = synthesizeReasoningLocalMessageItem(
        textItem,
        "msg-1",
        "msg-1-reasoning-step-0-item-0",
      );

      expect(wrapper).toEqual({
        item: textItem,
        ui_state: {
          id: "msg-1-reasoning-step-0-item-0",
          needsAnnouncement: false,
        },
        fullMessageID: "msg-1",
      });
    });

    it("passes the id and fullMessageID through verbatim", () => {
      const wrapper = synthesizeReasoningLocalMessageItem(
        textItem,
        "parent-xyz",
        "stable-key-42",
      );

      expect(wrapper.ui_state.id).toBe("stable-key-42");
      expect(wrapper.fullMessageID).toBe("parent-xyz");
    });

    it("preserves the original item reference so streaming mutations propagate", () => {
      const streamingItem: GenericItem = {
        response_type: MessageResponseTypes.TEXT,
        text: "",
      } as TextItem;
      const wrapper = synthesizeReasoningLocalMessageItem(
        streamingItem,
        "msg-1",
        "stable-id",
      );

      (streamingItem as TextItem).text = "now streamed";

      expect(wrapper.item).toBe(streamingItem);
      expect((wrapper.item as TextItem).text).toBe("now streamed");
    });

    it("returns stable output across calls with the same arguments", () => {
      const a = synthesizeReasoningLocalMessageItem(
        textItem,
        "msg-1",
        "stable-id",
      );
      const b = synthesizeReasoningLocalMessageItem(
        textItem,
        "msg-1",
        "stable-id",
      );

      expect(a.ui_state.id).toBe(b.ui_state.id);
      expect(a.fullMessageID).toBe(b.fullMessageID);
      expect(a.item).toBe(b.item);
    });
  });
});
