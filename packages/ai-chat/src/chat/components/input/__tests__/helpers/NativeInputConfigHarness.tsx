/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { createComponent } from '@lit/react';
import ChatInput from '../../ChatInput';
import { useNativeInputConfig } from '../../../../hooks/useNativeInputConfig';
import type { AutocompleteContent } from '../../../../services/autocompleteContent';
import type { InputProps } from '../../../../utils/inputTypes';

const NativeInput = createComponent({
  tagName: 'cds-aichat-chat-input',
  elementClass: ChatInput,
  react: React,
});

export function NativeInputConfigHarness({
  contentOwner,
  ...inputProps
}: InputProps & { contentOwner: AutocompleteContent }) {
  const config = useNativeInputConfig();
  return (
    <NativeInput
      inputProps={inputProps}
      contentOwner={contentOwner}
      {...config}
    />
  );
}
