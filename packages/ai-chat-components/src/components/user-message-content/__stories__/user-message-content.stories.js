/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '../index';
import '@carbon/web-components/es/components/tile/index.js';
import { html } from 'lit';
import {
  textContent,
  chipContent,
  customNodeContent,
  tileChip,
} from './story-data';

export default {
  title: 'Preview/User message content',
  component: 'cds-aichat-user-message-content',
};

const argTypes = {
  slotPrefix: {
    control: 'text',
    description:
      'Prefix for slot names, `${slotPrefix}::${path}`. Use a value unique to the message.',
  },
};

const defaultArgs = {
  slotPrefix: 'message-1',
};

/** Text and markdown only. */
export const Default = {
  argTypes,
  args: defaultArgs,
  render: (args) => html`
    <div
      style="display: flex; flex-direction: column; align-items: flex-end; max-inline-size: 400px;">
      <cds-aichat-user-message-content
        slot-prefix=${args.slotPrefix}
        .content=${textContent}></cds-aichat-user-message-content>
    </div>
  `,
};

/** A mention node shows a chip until the host fills its slot. */
export const WithChip = {
  name: 'With Chip',
  argTypes,
  args: defaultArgs,
  render: (args) => html`
    <div
      style="display: flex; flex-direction: column; align-items: flex-end; max-inline-size: 400px;">
      <cds-aichat-user-message-content
        slot-prefix=${args.slotPrefix}
        .content=${chipContent}></cds-aichat-user-message-content>
    </div>
  `,
};

/** Renders a Carbon tile in the slot. */
export const WithCustomNode = {
  name: 'With Custom Node',
  argTypes,
  args: defaultArgs,
  render: (args) => html`
    <div
      style="display: flex; flex-direction: column; align-items: flex-end; max-inline-size: 400px;">
      <cds-aichat-user-message-content
        slot-prefix=${args.slotPrefix}
        .content=${customNodeContent}>
        <cds-tile
          slot="${args.slotPrefix}::0.1"
          style="max-inline-size: 320px;">
          <strong style="display: block;">${tileChip.label}</strong>
          <span
            style="display: block; margin-block-start: 0.25rem; color: #525252; font-size: 0.875rem;"
            >${tileChip.description}</span
          >
        </cds-tile>
      </cds-aichat-user-message-content>
    </div>
  `,
};
