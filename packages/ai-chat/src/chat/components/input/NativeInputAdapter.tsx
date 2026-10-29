/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, {
  forwardRef,
  Ref,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { createComponent, type EventName } from '@lit/react';
import {
  transformStarterItems,
  transformSuggestionConfig,
} from '@carbon/ai-chat-components/es/react/utils/transformSuggestionConfig.js';
import { transformReactIconToCarbonIcon } from '@carbon/ai-chat-components/es/globals/utils/iconTransform.js';
import { useInputConfig } from '../../hooks/useInputConfig';
import type { AutocompleteContent } from '../../services/autocompleteContent';
import type { InputFunctions, InputProps } from '../../utils/inputTypes';
import ChatInput from './ChatInput';

const NativeInput = createComponent({
  tagName: 'cds-aichat-chat-input',
  elementClass: ChatInput,
  react: React,
  events: {
    onInputHandleChange: 'cds-aichat-input-handle-change' as EventName<
      CustomEvent<InputFunctions | null>
    >,
  },
});

interface NativeInputAdapterProps extends InputProps {
  contentOwner: AutocompleteContent;
}

function NativeInputAdapterComponent(
  { contentOwner, ...inputProps }: NativeInputAdapterProps,
  ref: Ref<InputFunctions>
) {
  const elementRef = useRef<ChatInput | null>(null);
  const publishedHandle = useRef<InputFunctions | null | undefined>(undefined);
  const refCleanup = useRef<(() => void) | undefined>(undefined);
  const { mention, command, autocomplete, starters, actions } =
    useInputConfig();
  const normalizedMention = useMemo(
    () => transformSuggestionConfig(mention),
    [mention]
  );
  const normalizedCommand = useMemo(
    () => transformSuggestionConfig(command),
    [command]
  );
  const normalizedAutocomplete = useMemo(
    () => transformSuggestionConfig(autocomplete),
    [autocomplete]
  );
  const normalizedStarters = useMemo(
    () => transformStarterItems(starters),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only consumed starter fields invalidate normalization
    [
      starters?.items,
      starters?.renderCustomList,
      starters?.isOn,
      starters?.disableDirectSend,
    ]
  );
  const normalizedActions = useMemo(
    () =>
      actions?.map((action) => ({
        ...action,
        icon: transformReactIconToCarbonIcon(action.icon, 16),
      })),
    [actions]
  );
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

  useLayoutEffect(() => {
    // Consumer effects can call public input methods in this same React commit.
    elementRef.current?.commitInput();
  });

  return (
    <NativeInput
      ref={setInputRef}
      onInputHandleChange={handleInputHandleChange}
      inputProps={inputProps}
      contentOwner={contentOwner}
      mention={normalizedMention}
      command={normalizedCommand}
      autocomplete={normalizedAutocomplete}
      starters={normalizedStarters}
      inputActions={normalizedActions}
    />
  );
}

const NativeInputAdapter = React.memo(forwardRef(NativeInputAdapterComponent));

export { NativeInputAdapter };
