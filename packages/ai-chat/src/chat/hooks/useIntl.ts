/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useChatViewState } from './useChatViewState';
import { IntlShape } from '../utils/i18n';
import type { ChatViewStateSnapshot } from '../services/chatViewState';

const selectIntl = (snapshot: ChatViewStateSnapshot) => snapshot.intl;

/**
 * React hook to access the i18n formatter.
 * This replaces react-intl's useIntl() hook. It re-renders when the chat's
 * formatter changes, including after a locale finishes loading.
 *
 * @returns The chat's current IntlShape instance
 * @throws Error if used outside of ChatContext
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { formatMessage, formatDate } = useIntl();
 *
 *   return (
 *     <div>
 *       <h1>{formatMessage('window_title')}</h1>
 *       <p>{formatDate(new Date())}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntl(): IntlShape {
  const formatter = useChatViewState(selectIntl);

  if (!formatter) {
    throw new Error(
      'useIntl must be used within a ChatContext whose service manager has a formatter.'
    );
  }

  return formatter;
}
