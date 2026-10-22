/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This is a React hook that will provided access to the {@link AriaAnnouncerFunctionType}.
 */

import { useContext } from 'react';

import { ChatContext } from '../contexts/ChatContext';

function useAriaAnnouncer() {
  return useContext(ChatContext)?.announcer.announce;
}

export { useAriaAnnouncer };
