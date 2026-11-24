/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createContext } from 'react';
import type { ChatViewState } from '../services/chatViewState';

/**
 * The chat's view state. Its value stays the same for the whole mount, so the
 * context itself never re-renders a consumer; `useChatViewState` subscribes to
 * the fields that change.
 */
const ChatContext = createContext<ChatViewState | null>(null);

ChatContext.displayName = 'ChatContext';

export { ChatContext };
