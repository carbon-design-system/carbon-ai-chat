/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// Test-only entry for interop.html. It runs the shared component interop
// fixture on this example's React 17 runtime; App.tsx is the example itself.
import type React from 'react';
import ReactDOM, { flushSync } from 'react-dom';

import { startReactInterop } from '../../../../tools/carbon-v12-consumer/react-interop-fixture.js';

const container = document.querySelector('#root') as HTMLElement;

void startReactInterop({
  container,
  expectedMajor: 17,
  render: (node: React.ReactNode) =>
    flushSync(() => {
      // eslint-disable-next-line react/no-deprecated -- React 17 compatibility requires the legacy renderer
      ReactDOM.render(node, container);
    }),
  // eslint-disable-next-line react/no-deprecated -- React 17 compatibility requires legacy root cleanup
  unmount: () => ReactDOM.unmountComponentAtNode(container),
});
