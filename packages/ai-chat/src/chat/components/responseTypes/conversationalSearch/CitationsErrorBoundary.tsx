/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import InlineError from '@carbon/ai-chat-components/es/react/inline-error.js';
import React from 'react';

export class CitationsErrorBoundary extends React.Component<
  { children: React.ReactNode; errorText: string; iconLabel: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <InlineError iconLabel={this.props.iconLabel}>
        {this.props.errorText}
      </InlineError>
    ) : (
      this.props.children
    );
  }
}
