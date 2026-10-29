/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { forwardRef, Ref } from 'react';
import { createComponent, type EventName } from '@lit/react';
import { useNativeInputConfig } from '../../hooks/useNativeInputConfig';
import { useNativeInputHandle } from '../../hooks/useNativeInputHandle';
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
  const { mention, command, autocomplete, starters, inputActions } =
    useNativeInputConfig();
  const { setInputRef, handleInputHandleChange } = useNativeInputHandle(ref);

  return (
    <NativeInput
      ref={setInputRef}
      onInputHandleChange={handleInputHandleChange}
      inputProps={inputProps}
      contentOwner={contentOwner}
      mention={mention}
      command={command}
      autocomplete={autocomplete}
      starters={starters}
      inputActions={inputActions}
    />
  );
}

const NativeInputAdapter = React.memo(forwardRef(NativeInputAdapterComponent));

export { NativeInputAdapter };
