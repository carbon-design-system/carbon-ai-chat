/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  MutableRefObject,
  Ref,
  useEffect,
  useImperativeHandle,
  useMemo,
} from "react";
import type { PromptLineElement } from "@carbon/ai-chat-components/es/components/input/index.js";

import type { ServiceManager } from "../../services/ServiceManager";
import type { InputFunctions } from "./Input";

interface UseInputImperativeHandleArgs {
  /**
   * The forwarded ref the `InputFunctions` object is published on.
   */
  ref: Ref<InputFunctions>;

  /**
   * Ref to the live prompt-line element every imperative call delegates to.
   */
  promptLineRef: MutableRefObject<PromptLineElement | null>;

  /**
   * The service manager the `InputFunctions` object is registered on.
   */
  serviceManager: ServiceManager;

  /**
   * Sticky-latches the rich surface on. Called from `ensureEditor` so the
   * element's own on-demand upgrade keeps React passing `rich`/`extensions`.
   */
  latchRich: () => void;
}

/**
 * Builds the imperative `InputFunctions` object (focus / content / editor
 * access), publishes it on the forwarded `ref`, and registers it on the
 * service manager so `ChatActionsImpl` can drive the input. The object is
 * memoized with empty deps because it only reaches the live surface through
 * stable refs/callbacks — re-creating it would needlessly re-fire the
 * imperative handle and the registration effect.
 */
function useInputImperativeHandle({
  ref,
  promptLineRef,
  serviceManager,
  latchRich,
}: UseInputImperativeHandleArgs): void {
  const inputFunctions = useMemo<InputFunctions>(
    () => ({
      requestFocus: () => {
        const promptLine = promptLineRef.current;
        if (!promptLine) {
          return false;
        }
        promptLine.focus();
        return true;
      },
      hasFocus: () => promptLineRef.current?.hasFocus() ?? false,
      setContent: (next) => {
        const promptLine = promptLineRef.current;
        if (!promptLine) {
          throw new Error("Input is not currently rendered");
        }
        promptLine.setContent(next);
      },
      insertContent: (content, options) => {
        const promptLine = promptLineRef.current;
        if (!promptLine) {
          throw new Error("Input is not currently rendered");
        }
        promptLine.insertContent(content, options);
      },
      getEditor: () => promptLineRef.current?.getEditor() ?? null,
      ensureEditor: () => {
        const promptLine = promptLineRef.current;
        if (!promptLine) {
          throw new Error("Input is not currently rendered");
        }
        // Keep React's latch in sync with the element's own sticky upgrade so a
        // later render doesn't revert `rich`/`extensions`.
        latchRich();
        return promptLine.ensureEditor();
      },
    }),
    // `promptLineRef` is a ref and `latchRich` is a stable callback, so the
    // object only reaches the live surface through stable identities — build it
    // once. Re-creating it would needlessly re-fire the imperative handle and
    // the registration effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useImperativeHandle(ref, () => inputFunctions, [inputFunctions]);

  useEffect(() => {
    serviceManager.setInputFunctionsRef(inputFunctions);
    return () => {
      serviceManager.setInputFunctionsRef(null);
    };
  }, [serviceManager, inputFunctions]);
}

export { useInputImperativeHandle };
