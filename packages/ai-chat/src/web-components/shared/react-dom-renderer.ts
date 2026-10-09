/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

import { installDefaultRenderer } from './react-renderer';

/**
 * Installs the renderer for plain web-component hosts: one React root per
 * mount.
 *
 * Only the web-component entries import this module, because React 17 does
 * not ship `react-dom/client` and the React components import the element
 * class directly. Each entry calls it from its own body: a bundler can drop a
 * side-effect import between two entries, which left a page that loaded only
 * the custom-element entry with no renderer.
 */
export function installReactDomRenderer() {
  installDefaultRenderer({
    mount(target) {
      const root = createRoot(target);
      return {
        render(App, inputs) {
          root.render(React.createElement(App, inputs));
        },
        unmount() {
          root.unmount();
        },
      };
    },
  });
}
