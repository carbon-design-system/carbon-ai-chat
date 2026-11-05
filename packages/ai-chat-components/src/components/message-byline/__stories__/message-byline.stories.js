/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '../index';
import '../../user-avatar/index';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';

export default {
  title: 'Preview/Message byline',
  component: 'cds-aichat-message-byline',
};

export const Default = {
  argTypes: {
    label: {
      control: 'text',
      description: 'The sender name or role, such as Assistant or Jane Doe.',
    },
    timestamp: {
      control: 'text',
      description: 'The formatted time string. The host supplies it.',
    },
    avatarName: {
      control: 'text',
      description:
        'Story-only. Name for the slotted user avatar. Leave empty to render the byline with no avatar.',
    },
    reasoningLabel: {
      control: 'text',
      description:
        'Story-only. Text for the reasoning toggle in the reasoning slot. Leave empty to leave the slot empty.',
    },
  },
  args: {
    label: 'Assistant',
    timestamp: '10:42 AM',
    avatarName: 'Assistant',
    reasoningLabel: '',
  },
  render: (args) => html`
    <cds-aichat-message-byline
      label=${ifDefined(args.label || undefined)}
      timestamp=${ifDefined(args.timestamp || undefined)}>
      ${
        args.avatarName
          ? html`<cds-aichat-user-avatar
              slot="avatar"
              name=${args.avatarName}
              width="1.5rem"
              height="1.5rem"></cds-aichat-user-avatar>`
          : ''
      }
      ${
        args.reasoningLabel
          ? html`<button slot="reasoning" type="button">
              ${args.reasoningLabel}
            </button>`
          : ''
      }
    </cds-aichat-message-byline>
  `,
};

export const WithoutAvatar = {
  argTypes: { ...Default.argTypes },
  args: { ...Default.args, label: 'You', avatarName: '' },
  render: Default.render,
};

export const WithReasoning = {
  argTypes: { ...Default.argTypes },
  args: { ...Default.args, reasoningLabel: 'Show reasoning' },
  render: Default.render,
};

export const HumanAgent = {
  argTypes: { ...Default.argTypes },
  args: { ...Default.args, label: 'Jane Doe', avatarName: 'Jane Doe' },
  render: Default.render,
};
