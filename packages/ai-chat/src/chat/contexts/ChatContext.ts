/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createContext } from 'react';
import type { ChatMountState } from '../services/chatMountState';

/**
 * The mount's state. Its value stays the same for the whole mount, so the
 * context itself never re-renders a consumer; `useChatMountState` subscribes to
 * the fields that change.
 */
const ChatContext = createContext<ChatMountState | null>(null);

ChatContext.displayName = 'ChatContext';

export { ChatContext };
