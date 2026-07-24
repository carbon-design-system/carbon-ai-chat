/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  AppState,
  HumanAgentDisplayState,
  InputState,
} from "../../types/state/AppState";
import { LanguagePack } from "../../types/config/LanguagePack";

const getAssistantInputState = (state: Pick<AppState, "assistantInputState">) =>
  state.assistantInputState;
const getHumanAgentInputState = (state: Pick<AppState, "humanAgentState">) =>
  state.humanAgentState.inputState;
const getHumanAgentState = (state: Pick<AppState, "humanAgentState">) =>
  state.humanAgentState;
const getPersistedHumanAgent = (
  state: Pick<AppState, "persistedToBrowserStorage">,
) => state.persistedToBrowserStorage.humanAgentState;

/**
 * Structural input for `selectHumanAgentDisplayState`. Declared as a `Pick` so
 * components that hold a narrowed AppState slice (e.g. `MessagesComponent`'s
 * injected props bag) can call the selector without a wide `as AppState` cast.
 */
type HumanAgentDisplayStateInput = Pick<
  AppState,
  "humanAgentState" | "persistedToBrowserStorage"
>;

/**
 * Compute the display state for the agent.
 */
function selectHumanAgentDisplayState(
  state: HumanAgentDisplayStateInput,
): HumanAgentDisplayState {
  const humanAgentState = getHumanAgentState(state);
  const persisted = getPersistedHumanAgent(state);

  if (persisted.isSuspended) {
    return {
      isConnectingOrConnected: false,
      disableInput: false,
      isHumanAgentTyping: false,
      inputPlaceholderKey: null,
    };
  }

  const { isReconnecting, isConnecting, isHumanAgentTyping } = humanAgentState;
  const { isConnected } = persisted;

  let inputPlaceholderKey: keyof LanguagePack;
  if (isConnecting) {
    inputPlaceholderKey = "agent_inputPlaceholderConnecting";
  } else if (isReconnecting) {
    inputPlaceholderKey = "agent_inputPlaceholderReconnecting";
  } else {
    inputPlaceholderKey = null;
  }

  return {
    isHumanAgentTyping,
    isConnectingOrConnected: isConnecting || isConnected,
    disableInput: isConnecting || isReconnecting,
    inputPlaceholderKey,
  };
}

/**
 * Is the chat currently routed to a human agent?
 */
function selectIsInputToHumanAgent(state: AppState): boolean {
  return selectHumanAgentDisplayState(state).isConnectingOrConnected;
}

/**
 * Pick either the agent's input slice or the bot's.
 */
function selectInputState(state: AppState) {
  return selectIsInputToHumanAgent(state)
    ? getHumanAgentInputState(state)
    : getAssistantInputState(state);
}

/**
 * Effective read-only state of the active input. The input slices hold a
 * runtime override (`boolean | null`); when it is `null` the value is derived
 * from config. For the assistant input the baseline is
 * {@link PublicConfig.isReadonly}; the human-agent input has no config baseline
 * (it is driven entirely by the service-desk flow).
 */
function selectInputIsReadonly(state: AppState): boolean {
  if (selectIsInputToHumanAgent(state)) {
    return Boolean(getHumanAgentInputState(state).isReadonly);
  }
  const override = getAssistantInputState(state).isReadonly;
  return override != null ? override : Boolean(state.config.public.isReadonly);
}

/**
 * Effective disabled state (editor + send button) of the active input. The
 * assistant input reads `PublicConfig.input.isDisabled` directly; the
 * human-agent input has no isDisabled concept.
 */
function selectInputIsDisabled(state: AppState): boolean {
  if (selectIsInputToHumanAgent(state)) {
    return false;
  }
  return Boolean(state.config.public.input?.isDisabled);
}

/**
 * Effective visibility of the active input field. For the assistant input the
 * config baseline is `PublicConfig.input.isVisible`; a non-null override (the
 * deprecated `instance.updateInputFieldVisibility`, or the human-agent flow on
 * its own slice) wins. Defaults to visible when nothing specifies otherwise.
 */
function selectInputFieldVisible(state: AppState): boolean {
  if (selectIsInputToHumanAgent(state)) {
    const override = getHumanAgentInputState(state).fieldVisible;
    return override != null ? override : true;
  }
  const override = getAssistantInputState(state).fieldVisible;
  if (override != null) {
    return override;
  }
  const configured = state.config.public.input?.isVisible;
  return configured != null ? configured : true;
}

type InputUploadAndStreamingFields = Pick<
  InputState,
  | "allowFileUploads"
  | "allowedFileUploadTypes"
  | "allowMultipleFileUploads"
  | "maxFileSizeBytes"
  | "maxFiles"
  | "files"
  | "pendingUploads"
  | "stopStreamingButtonState"
>;

/**
 * The file-upload and stop-streaming-button fields of the active input slice.
 * Returns a fresh object each call, so use with `shallowEqual` so subscribers
 * only re-render when one of these specific fields changes — avoids
 * re-rendering on `rawValue` / `displayValue` updates (every keystroke).
 */
function selectInputUploadAndStreamingFields(
  state: AppState,
): InputUploadAndStreamingFields {
  const slice = selectInputState(state);
  return {
    allowFileUploads: slice.allowFileUploads,
    allowedFileUploadTypes: slice.allowedFileUploadTypes,
    allowMultipleFileUploads: slice.allowMultipleFileUploads,
    maxFileSizeBytes: slice.maxFileSizeBytes,
    maxFiles: slice.maxFiles,
    files: slice.files,
    pendingUploads: slice.pendingUploads,
    stopStreamingButtonState: slice.stopStreamingButtonState,
  };
}

/**
 * Determines if the currently open panel has a back button visible.
 * Returns true if any panel with a back button is open.
 */
function selectHasOpenPanelWithBackButton(state: AppState): boolean {
  const {
    iFramePanelState,
    viewSourcePanelState,
    responsePanelState,
    customPanelState,
  } = state;

  // IFramePanel always has back button
  if (iFramePanelState.isOpen) {
    return true;
  }

  // ViewSourcePanel always has back button
  if (viewSourcePanelState.isOpen) {
    return true;
  }

  // ResponsePanel always has back button
  if (responsePanelState.isOpen) {
    return true;
  }

  // CustomPanel has back button unless explicitly hidden
  if (customPanelState.isOpen && !customPanelState.options.hideBackButton) {
    return true;
  }

  return false;
}

/**
 * The active language pack (defaults + host `strings`). Lives in its own
 * top-level slice, so this is a direct read whose reference changes only when
 * the strings change — never on unrelated config updates. Read a single string
 * with `useSelector(s => s.languagePack.<key>)` to re-render only on that
 * string.
 */
function selectLanguagePack(
  state: Pick<AppState, "languagePack">,
): LanguagePack {
  return state.languagePack;
}

export {
  selectHumanAgentDisplayState,
  selectIsInputToHumanAgent,
  selectInputState,
  selectInputIsReadonly,
  selectInputIsDisabled,
  selectInputFieldVisible,
  selectInputUploadAndStreamingFields,
  selectHasOpenPanelWithBackButton,
  selectLanguagePack,
};
