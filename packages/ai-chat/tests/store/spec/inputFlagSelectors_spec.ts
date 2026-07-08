/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Unit coverage for the effective input-flag selectors. These encode the
 * "derive from config + runtime override" model:
 *  - assistant input: a non-null override on the slice wins; otherwise the value
 *    comes from PublicConfig (isReadonly / input.isDisabled / input.isVisible),
 *  - human-agent input: the slice value is used raw (no config baseline).
 */

import {
  selectInputIsReadonly,
  selectInputIsDisabled,
  selectInputFieldVisible,
} from "../../../src/chat/store/selectors";
import {
  createAppConfig,
  createInitialState,
} from "../../../src/chat/store/doCreateStore";
import { AppState, InputState } from "../../../src/types/state/AppState";
import { PublicConfig } from "../../../src/types/config/PublicConfig";

function stateFor(config: PublicConfig): AppState {
  return createInitialState(createAppConfig(config));
}

/** Build a state where the chat is connected to a human agent. */
function connectedState(
  config: PublicConfig,
  agentInput: Partial<InputState>,
): AppState {
  const state = stateFor(config);
  return {
    ...state,
    persistedToBrowserStorage: {
      ...state.persistedToBrowserStorage,
      humanAgentState: {
        ...state.persistedToBrowserStorage.humanAgentState,
        isConnected: true,
      },
    },
    humanAgentState: {
      ...state.humanAgentState,
      inputState: { ...state.humanAgentState.inputState, ...agentInput },
    },
  };
}

describe("input flag selectors", () => {
  describe("assistant input (no human agent)", () => {
    it("defaults to enabled/visible/editable with no config and no override", () => {
      const state = stateFor({});
      expect(selectInputIsReadonly(state)).toBe(false);
      expect(selectInputIsDisabled(state)).toBe(false);
      expect(selectInputFieldVisible(state)).toBe(true);
      // Override slots default to null (no override; selector reads config).
      expect(state.assistantInputState.isReadonly).toBeNull();
      expect(state.assistantInputState.fieldVisible).toBeNull();
    });

    it("derives each flag from config when there is no override", () => {
      expect(selectInputIsReadonly(stateFor({ isReadonly: true }))).toBe(true);
      expect(
        selectInputIsDisabled(stateFor({ input: { isDisabled: true } })),
      ).toBe(true);
      expect(
        selectInputFieldVisible(stateFor({ input: { isVisible: false } })),
      ).toBe(false);
    });

    it("lets a readonly override win over config", () => {
      const state = stateFor({ isReadonly: false });
      state.assistantInputState = {
        ...state.assistantInputState,
        isReadonly: true,
      };
      expect(selectInputIsReadonly(state)).toBe(true);
    });

    it("lets a visibility override win over config (both directions)", () => {
      const hidden = stateFor({ input: { isVisible: true } });
      hidden.assistantInputState = {
        ...hidden.assistantInputState,
        fieldVisible: false,
      };
      expect(selectInputFieldVisible(hidden)).toBe(false);

      const shown = stateFor({ input: { isVisible: false } });
      shown.assistantInputState = {
        ...shown.assistantInputState,
        fieldVisible: true,
      };
      expect(selectInputFieldVisible(shown)).toBe(true);
    });

    it("keeps the override after a later config change (override is sticky)", () => {
      // Override marks input readonly while config has it editable.
      const state = stateFor({ isReadonly: false });
      state.assistantInputState = {
        ...state.assistantInputState,
        isReadonly: true,
      };
      expect(selectInputIsReadonly(state)).toBe(true);

      // A subsequent config change to the SAME field must not clear the override:
      // the derive-at-read model always prefers a non-null slice override.
      const afterConfigChange: AppState = {
        ...state,
        config: createAppConfig({ isReadonly: false }),
      };
      expect(selectInputIsReadonly(afterConfigChange)).toBe(true);
    });
  });

  describe("human-agent input (connected)", () => {
    it("uses the human-agent slice value and ignores assistant config", () => {
      // Assistant config is read-only, but the agent input slice is not.
      const state = connectedState({ isReadonly: true }, { isReadonly: false });
      expect(selectInputIsReadonly(state)).toBe(false);
    });

    it("reflects a service-desk-imposed readonly on the agent slice", () => {
      const state = connectedState({}, { isReadonly: true });
      expect(selectInputIsReadonly(state)).toBe(true);
    });

    it("defaults the agent field to visible when unset", () => {
      const state = connectedState({ input: { isVisible: false } }, {});
      // Assistant config (hidden) does not apply to the agent input.
      expect(selectInputFieldVisible(state)).toBe(true);
    });

    it("returns false for isDisabled regardless of state (no agent-side concept)", () => {
      const state = connectedState({ input: { isDisabled: true } }, {});
      // Assistant config's isDisabled does not apply to the agent input.
      expect(selectInputIsDisabled(state)).toBe(false);
    });
  });
});
