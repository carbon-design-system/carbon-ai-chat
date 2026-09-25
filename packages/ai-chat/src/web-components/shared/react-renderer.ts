/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatAppEntryProps } from '../../chat/ChatAppEntry';
import { resolvablePromise } from '../../chat/utils/resolvablePromise';

/**
 * Private seam between `cds-aichat-container` and whatever renders the React
 * app into it. The public web-component entry installs a standalone renderer
 * that owns a React root; the React wrappers pass their own renderer, which
 * portals the app from the host application's tree.
 */

/**
 * A live mount of the app into one target element.
 *
 * @internal
 */
interface ChatRenderMount {
  render(inputs: ChatAppEntryProps): void;
  unmount(): void;
}

/** @internal */
interface ChatRenderer {
  mount(target: HTMLElement): ChatRenderMount;
}

let defaultRenderer: ChatRenderer | undefined;
const defaultRendererReady = resolvablePromise<ChatRenderer>();

/** Called once by the public web-component entry. The first install wins. */
function installDefaultRenderer(renderer: ChatRenderer) {
  if (!defaultRenderer) {
    defaultRenderer = renderer;
    defaultRendererReady.doResolve(renderer);
  }
}

function getDefaultRenderer(): ChatRenderer | undefined {
  return defaultRenderer;
}

/** Settles when a default renderer is installed, for hosts connected before that. */
function whenDefaultRenderer(): Promise<ChatRenderer> {
  return defaultRendererReady;
}

export {
  ChatRenderer,
  ChatRenderMount,
  getDefaultRenderer,
  installDefaultRenderer,
  whenDefaultRenderer,
};
