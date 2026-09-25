/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useCallback } from 'react';
import CDSButton from '@carbon/web-components/es/components/button/button.js';
import { requestFocus as requestFocusForTargets } from '../utils/focusManager';
import type { InputFunctions } from '../components/input/Input';
import type { HasRequestFocus } from '../../types/utilities/HasRequestFocus';

interface UseFocusManagerProps {
  shouldAutoFocus: boolean;
  showDisclaimer: boolean;
  iFramePanelIsOpen: boolean;
  viewSourcePanelIsOpen: boolean;
  customPanelIsOpen: boolean;
  responsePanelIsOpen: boolean;
  disclaimerRef: React.RefObject<CDSButton | null>;
  iframePanelRef: React.RefObject<HasRequestFocus | null>;
  viewSourcePanelRef: React.RefObject<HasRequestFocus | null>;
  customPanelRef: React.RefObject<HasRequestFocus | null>;
  responsePanelRef: React.RefObject<HasRequestFocus | null>;
  inputRef: React.RefObject<InputFunctions | null>;
}

/**
 * Custom hook to manage focus across different UI elements based on priority
 * Homescreen now uses the same input field as messages, so no special focus handling needed
 */
export function useFocusManager({
  shouldAutoFocus,
  showDisclaimer,
  iFramePanelIsOpen,
  viewSourcePanelIsOpen,
  customPanelIsOpen,
  responsePanelIsOpen,
  disclaimerRef,
  iframePanelRef,
  viewSourcePanelRef,
  customPanelRef,
  responsePanelRef,
  inputRef,
}: UseFocusManagerProps) {
  const requestFocus = useCallback(() => {
    requestFocusForTargets({
      shouldAutoFocus,
      showDisclaimer,
      iFramePanelIsOpen,
      viewSourcePanelIsOpen,
      customPanelIsOpen,
      responsePanelIsOpen,
      disclaimer: disclaimerRef.current,
      iframePanel: iframePanelRef.current,
      viewSourcePanel: viewSourcePanelRef.current,
      customPanel: customPanelRef.current,
      responsePanel: responsePanelRef.current,
      input: inputRef.current,
    });
  }, [
    customPanelIsOpen,
    customPanelRef,
    disclaimerRef,
    iFramePanelIsOpen,
    iframePanelRef,
    inputRef,
    responsePanelIsOpen,
    responsePanelRef,
    shouldAutoFocus,
    showDisclaimer,
    viewSourcePanelIsOpen,
    viewSourcePanelRef,
  ]);

  return requestFocus;
}
