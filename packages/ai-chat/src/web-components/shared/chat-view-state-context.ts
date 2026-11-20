/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createContext } from '@lit/context';

import type { ChatViewState } from '../../chat/services/chatViewState';

/**
 * The chat's {@link ChatViewState}, provided by `cds-aichat-container` to the
 * Lit elements rendered inside it. Private to this package: nothing exports
 * it. The value is `undefined` until services start and after the host
 * detaches. Services that need the rendered UI exist only once the shell
 * mounts.
 */
const chatViewStateContext = createContext<ChatViewState | undefined>(
  Symbol('cds-aichat-view-state')
);

export { chatViewStateContext };
