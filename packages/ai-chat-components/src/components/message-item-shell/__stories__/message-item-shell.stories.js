/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '../index';
import { html } from 'lit';
import styles from './story-styles.scss?lit';
import { storyClass } from './story-data';

export default {
  title: 'Preview/Message item shell',
  component: 'cds-aichat-message-item-shell',
  decorators: [
    (story) => html`
      <style>
        ${styles}
      </style>
      ${story()}
    `,
  ],
};

const argTypes = {
  rowType: {
    control: 'select',
    options: ['request', 'response'],
    description: 'Whether the row is a request or a response.',
  },
  fullWidth: {
    control: 'boolean',
    description: 'Breaks the content out of the inset column.',
  },
  hideAvatar: {
    control: 'boolean',
    description: 'Hides the byline area, including the avatar.',
  },
  rowId: {
    control: 'text',
    description: 'A stable ID for this row.',
  },
  groupId: {
    control: 'text',
    description: 'An ID shared by the rows of the same response.',
  },
  streaming: {
    control: 'boolean',
    description: 'Whether the row is streaming.',
  },
  firstItem: {
    control: 'boolean',
    description: 'Whether the row is the first in the list.',
  },
  lastItem: {
    control: 'boolean',
    description: 'Whether the row is the last in the list.',
  },
  history: {
    control: 'boolean',
    description: 'Whether the row is part of the conversation history.',
  },
};

const defaultArgs = {
  rowType: 'request',
  fullWidth: false,
  hideAvatar: false,
  rowId: 'row-1',
  groupId: '',
  streaming: false,
  firstItem: false,
  lastItem: false,
  history: false,
};

/** Renders one shell row with placeholder slot content. */
const renderRow = (args) => html`
  <cds-aichat-message-item-shell
    class="${storyClass}-${args.rowType}"
    row-type=${args.rowType}
    row-id=${args.rowId}
    group-id=${args.groupId}
    ?full-width=${args.fullWidth}
    ?hide-avatar=${args.hideAvatar}
    ?streaming=${args.streaming}
    ?first-item=${args.firstItem}
    ?last-item=${args.lastItem}
    ?history=${args.history}>
    <div slot="byline" class="${storyClass}-byline">
      ${args.rowType === 'request' ? 'You' : 'Assistant'} · 10:42 AM
    </div>
    <div class="${storyClass}-content">
      ${
        args.rowType === 'request'
          ? 'How do I reset my password?'
          : 'Open Settings, choose Security, and select Reset password.'
      }
    </div>
    <div slot="attachment" class="${storyClass}-attachment">
      Attachment slot
    </div>
    <div slot="footer" class="${storyClass}-footer">Footer slot</div>
  </cds-aichat-message-item-shell>
`;

export const Default = {
  argTypes,
  args: defaultArgs,
  render: (args) => html`
    <div class="${storyClass}-container">${renderRow(args)}</div>
  `,
};

export const Response = {
  argTypes,
  args: { ...defaultArgs, rowType: 'response', rowId: 'row-2' },
  render: Default.render,
};

export const FullWidth = {
  argTypes,
  args: {
    ...defaultArgs,
    rowType: 'response',
    rowId: 'row-3',
    fullWidth: true,
  },
  render: Default.render,
};

export const HiddenAvatar = {
  argTypes,
  args: {
    ...defaultArgs,
    rowType: 'response',
    rowId: 'row-4',
    hideAvatar: true,
  },
  render: Default.render,
};

export const Grouped = {
  argTypes,
  args: { ...defaultArgs, rowType: 'response', groupId: 'group-1' },
  render: (args) => html`
    <div class="${storyClass}-container">
      ${renderRow({ ...args, rowType: 'request', groupId: '', rowId: 'req-1' })}
      ${renderRow({ ...args, rowId: 'res-1' })}
      ${renderRow({ ...args, rowId: 'res-2', hideAvatar: true })}
    </div>
  `,
};
