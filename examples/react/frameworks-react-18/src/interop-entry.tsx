/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// Test-only entry for interop.html. It runs the shared component interop
// fixture on this example's React 18 runtime; App.tsx is the example itself.
import type React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

import { startReactInterop } from '../../../../tools/carbon-v12-consumer/react-interop-fixture.js';

const container = document.querySelector('#root') as HTMLElement;
let root: Root | undefined;

// Each fixture case unmounts its root to verify ref cleanup before the next case.
void startReactInterop({
  container,
  expectedMajor: 18,
  render: (node: React.ReactNode) =>
    flushSync(() => {
      root ??= createRoot(container);
      root.render(node);
    }),
  unmount: () => {
    flushSync(() => root!.unmount());
    root = undefined;
  },
});
