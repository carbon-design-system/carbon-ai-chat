/*
 *  Copyright IBM Corp. 2025, 2026
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
} from 'react';
import type { OnErrorData } from '../../../types/config/ErrorConfig';
import { HasRequestFocus } from '../../../types/utilities/HasRequestFocus';
import { focusOnFirstFocusableElement } from '../../utils/domUtils';
import { createDidCatchErrorData } from '../../utils/miscUtils';
import { InlineError } from '../responseTypes/error/InlineError';

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
          className="cds-aichat--widget--expand-to-fit">
          {body}
        </div>
        {footer && <div slot="footer">{footer}</div>}
      </>
    );
  }
);

PanelWithFocus.displayName = 'PanelWithFocus';

interface PanelContentErrorBoundaryProps {
  children: ReactNode;

  /**
   * The text to show in place of the content that failed.
   */
  errorText: string;

  /**
   * Draws the error inside the body's wrapper elements, so it gets the body's padding.
   */
  isBody?: boolean;

  /**
   * Called once when the content fails, with the render error to report.
   */
  onError: (errorData: OnErrorData) => void;
}

interface PanelContentErrorBoundaryState {
  didError: boolean;
}

/**
 * Keeps a render failure in a panel's body or footer inside the panel: it shows an inline error in place of the
 * content, while the panel header and the rest of the chat keep working. Key it by the panel's item, so that
 * reopening the panel tries again.
 */
export class PanelContentErrorBoundary extends React.Component<
  PanelContentErrorBoundaryProps,
  PanelContentErrorBoundaryState
> {
  state: PanelContentErrorBoundaryState = { didError: false };

  static getDerivedStateFromError(): PanelContentErrorBoundaryState {
    return { didError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError(
      createDidCatchErrorData('ResponsePanel', error, errorInfo)
    );
  }

  render() {
    if (!this.state.didError) {
      return this.props.children;
    }
    const error = <InlineError text={this.props.errorText} />;
    if (!this.props.isBody) {
      return error;
    }
    return (
      <div className="cds-aichat--body-message-components">
        <div className="cds-aichat--body-message-components__message-wrapper">
          {error}
        </div>
      </div>
    );
  }
}
