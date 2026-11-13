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
import Headset16 from '@carbon/icons/es/headset/16.js';

export default {
  title: 'Preview/System message',
  component: 'cds-aichat-system-message',
};

const argTypes = {
  text: {
    control: 'text',
    description: 'Story-only. The text slotted into the default slot.',
  },
  standalone: {
    control: 'boolean',
    description:
      'If true (the default), the message adds its own outer spacing. Set to false inside a message bubble.',
  },
  divider: {
    control: 'boolean',
    description: 'If true, draws a divider line above the message.',
  },
  responseStopped: {
    control: 'boolean',
    description:
      'If true, renders the message in the "response stopped" state.',
  },
  showIcon: {
    control: 'boolean',
    description:
      'Story-only. Sets the `icon` property to a Carbon icon shown before the text.',
  },
};

const defaultArgs = {
  text: 'The agent joined the conversation',
  standalone: true,
  divider: false,
  responseStopped: false,
  showIcon: false,
};

export const Default = {
  argTypes,
  args: defaultArgs,
  render: (args) => html`
    <cds-aichat-system-message
      .standalone=${args.standalone}
      ?divider=${args.divider}
      ?response-stopped=${args.responseStopped}
      .icon=${args.showIcon ? Headset16 : undefined}>
      ${args.text}
    </cds-aichat-system-message>
  `,
};

export const Divider = {
  argTypes,
  args: { ...defaultArgs, divider: true },
  render: Default.render,
};

export const WithIcon = {
  argTypes,
  args: { ...defaultArgs, showIcon: true },
  render: Default.render,
};

export const ResponseStopped = {
  argTypes,
  args: {
    ...defaultArgs,
    text: 'Response generation stopped',
    responseStopped: true,
  },
  render: Default.render,
};
