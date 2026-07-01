/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LocalMessageItem } from "../../types/messaging/LocalMessageItem";
import {
  GenericItem,
  ReasoningStepOpenState,
} from "../../types/messaging/Messages";

/**
 * Returns true when reasoning content is something the UI should render.
 *
 * Non-empty strings and non-empty `GenericItem[]` arrays count as content. `undefined`, empty strings, and
 * empty arrays do not — an empty array must not cause the reasoning container or step body to appear.
 */
function hasReasoningContent(
  content: string | GenericItem[] | undefined,
): boolean {
  if (Array.isArray(content)) {
    return content.length > 0;
  }
  return Boolean(content);
}

/**
 * Builds a minimum-viable {@link LocalMessageItem} wrapper around a {@link GenericItem} so it can be rendered
 * by `MessageTypeComponent` without being inserted into the redux store. Used to render inline GenericItems
 * supplied via `ReasoningStep.content` / `ReasoningSteps.content`.
 *
 * The `id` must be stable across re-renders for the same logical slot (e.g. derived from the parent message
 * id + step index + item index), otherwise React will remount the child every time a streaming update lands.
 */
function synthesizeReasoningLocalMessageItem(
  item: GenericItem,
  fullMessageID: string,
  stableId: string,
): LocalMessageItem {
  return {
    item,
    ui_state: {
      id: stableId,
      needsAnnouncement: false,
    },
    fullMessageID,
  };
}

/**
 * Resolves whether the reasoning container (the parent panel that wraps the steps) should render open.
 *
 * Inputs:
 *  - `manualReasoningOpen`: the user's open/closed override, recorded when they toggle a host-controlled
 *    panel (one with an explicit container `open_state`).
 *  - `autoReasoningContainerOpen`: the auto-mode open state the component manages when the host does not
 *    control the panel.
 *  - `containerOpenState`: the host-supplied `reasoning.open_state` for this render, if any.
 *
 * The subtlety this guards: a host can drive a message through `open_state` while it streams (controlled
 * mode) and then drop `open_state` on a later snapshot (auto mode). The `manualReasoningOpen` override only
 * makes sense while the panel is host-controlled — if the message has flipped to auto mode, a stale manual
 * value must not pin the panel open or closed, otherwise the user can no longer collapse/expand it. So the
 * manual override is honored only when an explicit container `open_state` is still present; otherwise we
 * fall through to the auto state.
 */
function resolveReasoningContainerOpen({
  manualReasoningOpen,
  autoReasoningContainerOpen,
  containerOpenState,
}: {
  manualReasoningOpen?: boolean;
  autoReasoningContainerOpen?: boolean;
  containerOpenState?: ReasoningStepOpenState;
}): boolean {
  const hasExplicitContainerState =
    typeof containerOpenState !== "undefined" &&
    containerOpenState !== ReasoningStepOpenState.DEFAULT;

  if (hasExplicitContainerState && typeof manualReasoningOpen === "boolean") {
    return manualReasoningOpen;
  }

  if (hasExplicitContainerState) {
    return containerOpenState === ReasoningStepOpenState.OPEN;
  }

  return autoReasoningContainerOpen ?? true;
}

export {
  hasReasoningContent,
  resolveReasoningContainerOpen,
  synthesizeReasoningLocalMessageItem,
};
