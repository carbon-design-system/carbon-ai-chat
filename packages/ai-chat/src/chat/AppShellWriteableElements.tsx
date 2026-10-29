/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useMemo } from 'react';

import WriteableElement from './components/helpers/WriteableElement/WriteableElement';
import { HasServiceManager } from './hocs/withServiceManager';
import { useSelector } from './hooks/useSelector';
import { selectCustomPromptLineVisible } from './utils/customPromptLine';
import { getShellWriteableElements } from './utils/shellWriteableElements';
import { AppState } from '../types/state/AppState';

interface AppShellWriteableElementsProps extends HasServiceManager {
  showHomeScreen: boolean;
  /**
   * Value-stable, space-separated, sorted list of writeable-element slot names
   * the host supplied content for (see `ChatAppEntry`). `undefined` means the
   * host omitted the map entirely — render all default elements (back-compat);
   * an empty string means a map was provided with no content — render none.
   */
  writeableElementsPresentKeys?: string;
}

/**
 * Renders WriteableElement slots that live directly under ChatShell.
 */
export const AppShellWriteableElements = React.memo(
  function AppShellWriteableElements({
    serviceManager,
    showHomeScreen,
    writeableElementsPresentKeys,
  }: AppShellWriteableElementsProps) {
    const suffix = serviceManager.namespace.suffix;
    const inputIsVisible = useSelector(selectCustomPromptLineVisible);
    const hasContentMaxWidth = useSelector(
      (state: AppState) =>
        state.config.derived.header.hasContentMaxWidth ?? false
    );
    const headerIsOn = useSelector(
      (state: AppState) => state.config.derived.header.isOn ?? true
    );

    const elements = useMemo(
      () =>
        getShellWriteableElements({
          suffix,
          showHomeScreen,
          writeableElementsPresentKeys,
          inputIsVisible,
          hasContentMaxWidth,
          headerIsOn,
        }),
      [
        showHomeScreen,
        suffix,
        writeableElementsPresentKeys,
        hasContentMaxWidth,
        headerIsOn,
        inputIsVisible,
      ]
    );

    return (
      <>
        {elements.map((props) => (
          <WriteableElement key={props.wrapperSlot} {...props} />
        ))}
      </>
    );
  }
);
