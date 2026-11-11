/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
import React from 'react';
import { Tile } from '@carbon/react';
import UserMessageContent from '../../../react/user-message-content';
import {
  textContent,
  chipContent,
  customNodeContent,
  tileChip,
} from './story-data';
import {
  Default as DefaultWC,
  WithChip as WithChipWC,
  WithCustomNode as WithCustomNodeWC,
} from './user-message-content.stories';

export default {
  title: 'Preview/User message content',
  component: UserMessageContent,
};

/** Text and markdown only. */
export const Default = {
  argTypes: { ...DefaultWC.argTypes },
  args: { ...DefaultWC.args },
  render: ({ slotPrefix }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        maxInlineSize: 400,
      }}>
      <UserMessageContent slotPrefix={slotPrefix} content={textContent} />
    </div>
  ),
};

/** A mention node shows a chip until the host fills its slot. */
export const WithChip = {
  name: 'With Chip',
  argTypes: { ...WithChipWC.argTypes },
  args: { ...WithChipWC.args },
  render: ({ slotPrefix }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        maxInlineSize: 400,
      }}>
      <UserMessageContent slotPrefix={slotPrefix} content={chipContent} />
    </div>
  ),
};

/** Renders a Carbon tile in the slot. */
export const WithCustomNode = {
  name: 'With Custom Node',
  argTypes: { ...WithCustomNodeWC.argTypes },
  args: { ...WithCustomNodeWC.args },
  render: ({ slotPrefix }) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        maxInlineSize: 400,
      }}>
      <UserMessageContent slotPrefix={slotPrefix} content={customNodeContent}>
        <Tile slot={`${slotPrefix}::0.1`} style={{ maxInlineSize: 320 }}>
          <strong style={{ display: 'block' }}>{tileChip.label}</strong>
          <span
            style={{
              display: 'block',
              marginBlockStart: '0.25rem',
              color: '#525252',
              fontSize: '0.875rem',
            }}>
            {tileChip.description}
          </span>
        </Tile>
      </UserMessageContent>
    </div>
  ),
};
