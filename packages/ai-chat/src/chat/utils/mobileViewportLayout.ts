/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  adoptOnRoot,
  setVarsForSelector,
  clearSelector,
} from '@carbon/ai-chat-components/es/components/shared/dynamic-css-var-sheet.js';

const VIEWPORT_SELECTOR = '.cds-aichat--container--render';

export function connectMobileViewportLayout(
  enabled: boolean,
  container: HTMLElement | null,
  margin = 4
): () => void {
  const viewport =
    typeof window === 'undefined' ? undefined : window.visualViewport;
  if (!enabled || !viewport) {
    clearSelector(VIEWPORT_SELECTOR);
    return () => {};
  }
  if (!container) {
    return () => {};
  }
  const root = container.getRootNode();
  if (root instanceof Document || root instanceof ShadowRoot) {
    adoptOnRoot(root);
  }
  let connected = true;
  const update = () => {
    if (!connected) {
      return;
    }
    const vars: Record<string, string> = {};
    if (viewport.height) {
      vars['--cds-aichat-height'] = `calc(${viewport.height}px - ${margin}px)`;
    }
    if (viewport.width) {
      vars['--cds-aichat-width'] = `calc(${viewport.width}px - ${margin}px)`;
    }
    if (viewport.offsetTop) {
      vars['--cds-aichat-top-position'] = `${viewport.offsetTop}px`;
    }
    clearSelector(VIEWPORT_SELECTOR);
    if (Object.keys(vars).length) {
      setVarsForSelector(VIEWPORT_SELECTOR, vars);
    }
  };
  update();
  viewport.addEventListener('resize', update);
  viewport.addEventListener('scroll', update);
  return () => {
    if (!connected) {
      return;
    }
    connected = false;
    viewport.removeEventListener('resize', update);
    viewport.removeEventListener('scroll', update);
    clearSelector(VIEWPORT_SELECTOR);
  };
}
