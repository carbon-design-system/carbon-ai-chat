/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '../index';
import '../../message-byline/index';
import '../../user-avatar/index';
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
    description:
      'Hides the avatar slotted in the byline. The byline keeps the label and timestamp.',
  },
};

const defaultArgs = {
  rowType: 'request',
  fullWidth: false,
  hideAvatar: false,
};

/** Renders one shell row with placeholder slot content. */
const renderRow = (args) => html`
  <cds-aichat-message-item-shell
    class="${storyClass}-${args.rowType}"
    row-type=${args.rowType}
    ?full-width=${args.fullWidth}
    ?hide-avatar=${args.hideAvatar}>
    <cds-aichat-message-byline
      slot="byline"
      label=${args.rowType === 'request' ? 'You' : 'Assistant'}
      timestamp="10:42 AM">
      ${
        args.rowType === 'response'
          ? html`<cds-aichat-user-avatar
              slot="avatar"
              width="28px"
              height="28px"></cds-aichat-user-avatar>`
          : ''
      }
    </cds-aichat-message-byline>
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
  args: { ...defaultArgs, rowType: 'response' },
  render: Default.render,
};

export const FullWidth = {
  argTypes,
  args: {
    ...defaultArgs,
    rowType: 'response',
    fullWidth: true,
  },
  render: Default.render,
};

export const HiddenAvatar = {
  argTypes,
  args: {
    ...defaultArgs,
    rowType: 'response',
    hideAvatar: true,
  },
  render: Default.render,
};
