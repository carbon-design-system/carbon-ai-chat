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
import '../../reasoning-steps/index';
import '../../markdown/index';
import '../../message-item-shell/index';
import { html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { reasoningSteps } from './story-data';

export default {
  title: 'Preview/Message byline',
  component: 'cds-aichat-message-byline',
};

let panelCount = 0;

const argTypes = {
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
  open: {
    control: 'boolean',
    description:
      'Story-only. Whether the reasoning panel starts open. Only used by the reasoning steps story.',
  },
};

const defaultArgs = {
  label: 'Assistant',
  timestamp: '10:42 AM',
  avatarName: 'Assistant',
  open: false,
};

const renderAvatar = (args) =>
  args.avatarName
    ? html`<cds-aichat-user-avatar
        slot="avatar"
        name=${args.avatarName}
        width="32px"
        height="32px"></cds-aichat-user-avatar>`
    : nothing;

/** Opens or closes the panel in the same message row as the toggle. */
const syncPanel = (selector) => (event) => {
  const panel = event.target
    .closest('cds-aichat-message-item-shell')
    ?.querySelector(selector);
  if (panel) {
    panel.open = event.detail?.open ?? false;
  }
};

export const Default = {
  argTypes,
  args: defaultArgs,
  render: (args) => html`
    <cds-aichat-message-byline
      label=${ifDefined(args.label || undefined)}
      timestamp=${ifDefined(args.timestamp || undefined)}>
      ${renderAvatar(args)}
    </cds-aichat-message-byline>
  `,
};

export const WithoutAvatar = {
  argTypes,
  args: { ...defaultArgs, label: 'You', avatarName: '' },
  render: Default.render,
};

export const HumanAgent = {
  argTypes,
  args: { ...defaultArgs, label: 'Jane Doe', avatarName: 'Jane Doe' },
  render: Default.render,
};

/**
 * The reasoning steps toggle sits in the byline's `reasoning` slot. The steps
 * render at the top of the message content, inside the message item shell.
 */
export const WithReasoningSteps = {
  argTypes,
  args: { ...defaultArgs, open: true },
  render: (args) => {
    const panelId = `story-reasoning-steps-${panelCount++}`;
    return html`
      <cds-aichat-message-item-shell row-type="response">
        <cds-aichat-message-byline
          slot="byline"
          label=${ifDefined(args.label || undefined)}
          timestamp=${ifDefined(args.timestamp || undefined)}>
          ${renderAvatar(args)}
          <cds-aichat-reasoning-steps-toggle
            slot="reasoning"
            panel-id=${panelId}
            ?open=${args.open}
            @reasoning-steps-toggle=${syncPanel(
              'cds-aichat-reasoning-steps'
            )}></cds-aichat-reasoning-steps-toggle>
        </cds-aichat-message-byline>
        <cds-aichat-reasoning-steps id=${panelId} ?open=${args.open}>
          ${reasoningSteps.map(
            (step) => html`
              <cds-aichat-reasoning-step
                title=${step.title}
                ?open=${step.open ?? false}>
                <cds-aichat-markdown
                  .markdown=${step.body}></cds-aichat-markdown>
              </cds-aichat-reasoning-step>
            `
          )}
        </cds-aichat-reasoning-steps>
      </cds-aichat-message-item-shell>
    `;
  },
};
