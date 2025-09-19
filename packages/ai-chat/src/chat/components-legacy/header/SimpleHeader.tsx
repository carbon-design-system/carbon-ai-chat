/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { forwardRef, Ref, useImperativeHandle, useRef } from "react";

import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { Header } from "./Header";
import { OverlayPanelName } from "../OverlayPanel";

/**
 * This component renders a basic header with only a close button.
 */

interface SimpleHeaderProps {
  /**
   * Indicates if the AI theme should be used.
   */
  useAITheme?: boolean;

  /**
   * This callback is called when the user clicks the close button.
   */
  onClose: () => void;

  /**
   * The header component is used by multiple panels. This is a prefix for data-testid to keep buttons
   * in the header obviously unique.
   */
  testIdPrefix: OverlayPanelName;
}

function SimpleHeader(props: SimpleHeaderProps, ref: Ref<HasRequestFocus>) {
  const { useAITheme, onClose, testIdPrefix } = props;
  const headerRef = useRef<HasRequestFocus>();

  // Reuse the imperative handles from the header.
  useImperativeHandle(ref, () => headerRef.current);

  return (
    <Header
      ref={headerRef}
      onClickClose={onClose}
      useAITheme={useAITheme}
      testIdPrefix={testIdPrefix}
    />
  );
}

const SimpleHeaderExport = React.memo(forwardRef(SimpleHeader));
export { SimpleHeaderExport as SimpleHeader };
