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

/**
 * This component renders a basic header with only a close button.
 */

interface SimpleHeaderProps {
  /**
   * This callback is called when the user clicks the close button.
   */
  onClose: () => void;

  /**
   * Controls whether to show the AI label in this specific header instance.
   * When undefined, falls back to the global config setting.
   */
  showAiLabel?: boolean;

  /**
   * Controls whether to show the restart button in this specific header instance.
   * When undefined, falls back to the global config setting.
   */
  showRestartButton?: boolean;
}

function SimpleHeader(props: SimpleHeaderProps, ref: Ref<HasRequestFocus>) {
  const { onClose, showAiLabel, showRestartButton } = props;
  const headerRef = useRef<HasRequestFocus>();

  // Reuse the imperative handles from the header.
  useImperativeHandle(ref, () => headerRef.current);

  return (
    <Header
      ref={headerRef}
      onClickClose={onClose}
      showAiLabel={showAiLabel}
      showRestartButton={showRestartButton}
    />
  );
}

const SimpleHeaderExport = React.memo(forwardRef(SimpleHeader));
export { SimpleHeaderExport as SimpleHeader };
