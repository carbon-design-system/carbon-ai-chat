/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createContext, Dispatch, SetStateAction } from 'react';
import type { EndHumanAgentChatPanelProps } from '../components/panels/EndHumanAgentChatPanel';

export type HumanAgentConfirmation = Omit<EndHumanAgentChatPanelProps, 'open'>;

export const HumanAgentConfirmationContext =
  createContext<Dispatch<SetStateAction<HumanAgentConfirmation | null>>>(null);
