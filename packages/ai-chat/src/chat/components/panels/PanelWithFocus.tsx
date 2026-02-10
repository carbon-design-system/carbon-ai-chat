/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  ReactNode,
} from "react";
import { HasRequestFocus } from "../../../types/utilities/HasRequestFocus";
import { focusOnFirstFocusableElement } from "../../utils/domUtils";

interface PanelWithFocusProps {
  header?: ReactNode;
  body: ReactNode;
  footer?: ReactNode;
}

/**
 * A wrapper component for panel content that implements the HasRequestFocus interface.
 * When requestFocus is called, it will:
 * 1. First try to focus on the first focusable element in the panel body
 * 2. If no focusable element is found in the body, try the panel header
 * 3. Return true if focus was successfully set, false otherwise
 */
export const PanelWithFocus = forwardRef<HasRequestFocus, PanelWithFocusProps>(
  ({ header, body, footer }, ref) => {
    const bodyRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      requestFocus: () => {
        // Try to focus on the first focusable element in the body
        if (bodyRef.current && focusOnFirstFocusableElement(bodyRef.current)) {
          return true;
        }

        // Fallback: try to focus on the first focusable element in the header
        if (
          headerRef.current &&
          focusOnFirstFocusableElement(headerRef.current)
        ) {
          return true;
        }

        // No focusable element found
        return false;
      },
    }));

    return (
      <>
        {header && (
          <div ref={headerRef} slot="header">
            {header}
          </div>
        )}
        <div
          ref={bodyRef}
          slot="body"
          className="cds-aichat--widget--expand-to-fit"
        >
          {body}
        </div>
        {footer && <div slot="footer">{footer}</div>}
      </>
    );
  },
);

PanelWithFocus.displayName = "PanelWithFocus";

// Made with Bob
