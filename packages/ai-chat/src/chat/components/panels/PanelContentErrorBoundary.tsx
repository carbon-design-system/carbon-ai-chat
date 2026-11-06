/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { type ReactNode } from 'react';
import type { OnErrorData } from '../../../types/config/ErrorConfig';
import { createDidCatchErrorData } from '../../utils/miscUtils';
import { InlineError } from '../responseTypes/error/InlineError';

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
