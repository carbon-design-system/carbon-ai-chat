/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MutableRefObject, useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import type { PromptLineElement } from "@carbon/ai-chat-components/es/components/prompt-line/index.js";

import actions from "../../store/actions";
import {
  selectInputState,
  selectIsInputToHumanAgent,
} from "../../store/selectors";
import type { ServiceManager } from "../../services/ServiceManager";

interface UseInputValueSyncArgs {
  serviceManager: ServiceManager;

  /**
   * Ref to the live prompt-line element the Redux value is mirrored into.
   */
  promptLineRef: MutableRefObject<PromptLineElement | null>;

  /**
   * Whether this input stays in sync with the global Redux input state.
   */
  trackInputState: boolean;

  /**
   * Maximum number of characters allowed in the field.
   */
  maxInputChars: number;

  /**
   * Whether sending is disabled by the caller (prop-driven).
   */
  disableSend: boolean;

  /**
   * Whether sending is disabled by config.
   */
  isSendDisabledFromConfig: boolean;

  /**
   * Callback fired with the current text (and editor JSONContent when available)
   * when the user sends a message.
   */
  onSendInput: (text: string, displayContent?: JSONContent) => void;

  /**
   * Whether an error has been passed to the Input.
   */
  hasErrorProp: boolean;
}

/**
 * Owns the input's local value (`rawValue`), keeps it in lockstep with Redux
 * when `trackInputState` is on, and owns the send path. `setRawInputValue` and
 * `rawInputValueRef` are exposed specifically so the autocomplete starter path
 * can seed the value before invoking `sendCurrentValue`.
 */
function useInputValueSync({
  serviceManager,
  promptLineRef,
  trackInputState,
  maxInputChars,
  disableSend,
  isSendDisabledFromConfig,
  onSendInput,
  hasErrorProp,
}: UseInputValueSyncArgs) {
  const store = serviceManager.store;

  // Get tracked input state from Redux if enabled
  const trackedInputState = trackInputState
    ? selectInputState(store.getState())
    : null;

  // Local state for input value (rawValue only — JSONContent doc is internal).
  const [rawInputValue, setRawInputValue] = useState(
    trackedInputState?.rawValue ?? "",
  );

  const rawInputValueRef = useRef(rawInputValue);
  rawInputValueRef.current = rawInputValue;

  // Snapshot of the editor's last-known JSONContent. The send path forwards this verbatim so the
  // user message bubble can render structurally (mention chips, custom nodes).
  const displayContentRef = useRef<JSONContent | null>(null);

  // Subscribe to Redux state changes if tracking is enabled
  useEffect(() => {
    if (!trackInputState) {
      return undefined;
    }

    const unsubscribe = store.subscribe(() => {
      const nextInputState = selectInputState(store.getState());
      const nextRawValue = nextInputState.rawValue ?? "";

      if (nextRawValue !== rawInputValueRef.current) {
        setRawInputValue(nextRawValue);
        // Push the Redux-driven value into the surface to keep them aligned.
        // `getValue()` works in both textarea and rich modes (no getEditor()
        // branch), so the sync runs regardless of which surface is mounted.
        const promptLine = promptLineRef.current;
        if (promptLine && promptLine.getValue() !== nextRawValue) {
          promptLine.setContent(nextRawValue);
        }
      }
    });

    return unsubscribe;
    // `promptLineRef` is a ref (stable identity); the subscription only needs to
    // be torn down and rebuilt when the store or tracking flag changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, trackInputState]);

  const overMaxLength = rawInputValue.length > maxInputChars;

  const effectiveDisableSend =
    disableSend || isSendDisabledFromConfig || overMaxLength || hasErrorProp;

  /**
   * Handle input value changes from the prompt-line. Dispatches to Redux if
   * tracking is enabled. `content` is Tiptap JSONContent.
   */
  const handleInputChange = (
    event: CustomEvent<{ rawValue: string; content?: JSONContent }>,
  ) => {
    const { rawValue, content } = event.detail;

    setRawInputValue(rawValue);
    displayContentRef.current = content ?? null;

    if (trackInputState) {
      const isInputToHumanAgent = selectIsInputToHumanAgent(store.getState());
      store.dispatch(
        actions.updateInputState(
          { rawValue, content: content ?? { type: "doc", content: [] } },
          isInputToHumanAgent,
        ),
      );
    }
  };

  /**
   * Send the current input value - clears the editor and dispatches to Redux
   * if tracking is enabled.
   *
   * Order matters here. We clear Redux BEFORE onSendInput so the store
   * subscriber (see useEffect above) can never observe Redux holding the old
   * value while React state is "". onSendInput dispatches downstream actions
   * (sendWithCatch, etc.) — in React 17 those run through unbatched renders
   * whose layout effects can synchronously fire the subscriber, which would
   * otherwise revert React state back to the just-sent text. We also call
   * promptLineRef.current?.clearContent() to imperatively reset the Tiptap doc
   * in case the prop-driven sync (rawValue → setExternalRawValue) is delayed
   * by @lit/react's native-event scheduling. See issue #1382.
   */
  const sendCurrentValue = () => {
    const text = rawInputValueRef.current;
    if (!text.trim()) {
      return;
    }
    if (effectiveDisableSend) {
      return;
    }
    onSendInput(text, displayContentRef.current ?? undefined);

    setRawInputValue("");
    displayContentRef.current = null;
    promptLineRef.current?.clearContent();

    if (trackInputState) {
      const isInputToHumanAgent = selectIsInputToHumanAgent(store.getState());
      store.dispatch(
        actions.updateInputState({ rawValue: "" }, isInputToHumanAgent),
      );
    }
  };

  const handleSendControlSend = () => {
    sendCurrentValue();
  };

  const handlePromptSendIntent = (event: CustomEvent) => {
    event.stopPropagation();
    sendCurrentValue();
  };

  return {
    rawInputValue,
    rawInputValueRef,
    setRawInputValue,
    overMaxLength,
    effectiveDisableSend,
    handleInputChange,
    sendCurrentValue,
    handleSendControlSend,
    handlePromptSendIntent,
  };
}

export { useInputValueSync };
