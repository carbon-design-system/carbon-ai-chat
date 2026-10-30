/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { createPortal } from 'react-dom';

function PanelBodyContentAdapter({
  target,
  children,
}: {
  target?: HTMLElement;
  children: React.ReactNode;
}) {
  return target?.isConnected ? createPortal(children, target) : null;
}

export { PanelBodyContentAdapter };
