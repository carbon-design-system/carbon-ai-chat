/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

export interface AppShellErrorBoundaryProps {
  children: React.ReactNode;
  onError: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export default class AppShellErrorBoundary extends React.Component<AppShellErrorBoundaryProps> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError(error, errorInfo);
  }

  render(): React.ReactNode {
    return this.props.children;
  }
}
