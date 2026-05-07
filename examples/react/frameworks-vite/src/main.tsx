/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Vite bootstrap. Mounts `App` from `./App.tsx` into `#root`. The chat
 * itself is configured in `App.tsx`; this file only wires React 19's
 * `createRoot` so the example can run from a Vite dev server.
 */

import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";

const rootElement = document.getElementById("root");

// guard the root lookup so this module can be imported by Vitest (where
// `index.html` is never loaded and `#root` is absent) without throwing.
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
