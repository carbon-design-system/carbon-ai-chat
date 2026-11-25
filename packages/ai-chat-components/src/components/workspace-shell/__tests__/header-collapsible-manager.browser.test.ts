/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import '../index.js';
import {
  HeaderCollapsibleManager,
  type CollapsibleState,
} from '../src/header-collapsible-manager.js';
import type CDSAIChatWorkspaceShell from '../src/workspace-shell.js';

// The manager throttles resize work to one calculation per 150 ms and then
// waits a frame. A resize it still observes reports well inside this window.
const RESIZE_REPORT_WINDOW_MS = 400;

/**
 * Resizes once the browser has delivered the target's first observation,
 * and resolves when it delivers the resize, so a caller knows the resize
 * reached every observer of the target.
 */
const resizeAndWait = (target: Element, resize: () => void): Promise<void> =>
  new Promise((resolve) => {
    let seenInitial = false;
    const observer = new ResizeObserver(() => {
      if (!seenInitial) {
        seenInitial = true;
        resize();
        return;
      }
      observer.disconnect();
      resolve();
    });
    observer.observe(target);
  });

describe('HeaderCollapsibleManager in the browser', () => {
  it('should disconnect observers when disconnect is called', async () => {
    // The shell has no auto-collapsible-header, so this manager is the only one.
    const wrapper = await fixture<HTMLDivElement>(
      html`<div style="block-size: 400px">
        <cds-aichat-workspace-shell>
          <cds-aichat-workspace-shell-header
            title-text="Title"
            subtitle-text="Subtitle">
          </cds-aichat-workspace-shell-header>
        </cds-aichat-workspace-shell>
      </div>`
    );
    const shell = wrapper.querySelector(
      'cds-aichat-workspace-shell'
    ) as CDSAIChatWorkspaceShell;
    await shell.updateComplete;

    const states: CollapsibleState[] = [];
    const manager = new HeaderCollapsibleManager(shell.shadowRoot!, shell);
    manager.connect((state) => states.push(state));

    try {
      // While connected, a resize reports a new state.
      const beforeResize = states.length;
      await resizeAndWait(shell, () => {
        wrapper.style.blockSize = '350px';
      });
      await waitUntil(
        () => states.length > beforeResize,
        'a resize while connected never reported a state'
      );

      manager.disconnect();
      const afterDisconnect = states.length;
      await resizeAndWait(shell, () => {
        wrapper.style.blockSize = '300px';
      });
      await new Promise((resolve) =>
        setTimeout(resolve, RESIZE_REPORT_WINDOW_MS)
      );

      expect(states.length).to.equal(afterDisconnect);
    } finally {
      manager.disconnect();
    }
  });
});
