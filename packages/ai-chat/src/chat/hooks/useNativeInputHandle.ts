/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { Ref, useCallback, useRef } from 'react';
import type ChatInput from '../components/input/ChatInput';
import type { InputFunctions } from '../utils/inputTypes';

export function useNativeInputHandle(ref: Ref<InputFunctions>) {
  const elementRef = useRef<ChatInput | null>(null);
  const publishedHandle = useRef<InputFunctions | null | undefined>(undefined);
  const refCleanup = useRef<(() => void) | undefined>(undefined);
  const publishHandle = useCallback(
    (handle: InputFunctions | null) => {
      const previous = publishedHandle.current;
      if (previous === handle) {
        return;
      }
      publishedHandle.current = handle;
      if (typeof ref !== 'function') {
        if (ref) {
          ref.current = handle;
        }
        return;
      }
      const cleanup = refCleanup.current;
      refCleanup.current = undefined;
      if (cleanup) {
        cleanup();
      } else if (previous) {
        ref(null);
      }
      if (handle) {
        const nextCleanup = ref(handle);
        if (typeof nextCleanup === 'function') {
          refCleanup.current = nextCleanup;
        }
      } else if (previous === undefined) {
        ref(null);
      }
    },
    [ref]
  );
  const setInputRef = useCallback(
    (element: ChatInput | null) => {
      elementRef.current = element;
      publishHandle(element?.inputFunctions ?? null);
      if (!element) {
        publishedHandle.current = undefined;
      }
    },
    [publishHandle]
  );
  const handleInputHandleChange = useCallback(
    (event: CustomEvent<InputFunctions | null>) => {
      const element = elementRef.current;
      if (
        element &&
        event.target === element &&
        event.currentTarget === element &&
        event.detail === (element.inputFunctions ?? null)
      ) {
        publishHandle(event.detail);
      }
    },
    [publishHandle]
  );

  return { setInputRef, handleInputHandleChange };
}
