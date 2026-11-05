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
import '../../chain-of-thought/index';
import '../../markdown/index';
import { html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { chainOfThoughtSteps, reasoningSteps } from './story-data';

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
      'Story-only. Whether the reasoning panel starts open. Only used by the reasoning stories.',
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
        width="1.5rem"
        height="1.5rem"></cds-aichat-user-avatar>`
    : nothing;

/** Opens or closes the panel next to the byline that holds the toggle. */
const syncPanel = (selector) => (event) => {
  const panel = event.target
    .closest('[data-story-message]')
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

/**
 * The reasoning steps toggle sits in the `reasoning` slot. The host renders the
 * steps in the panel below the byline, as the chat does.
 */
export const WithReasoningSteps = {
  argTypes,
  args: { ...defaultArgs, open: true },
  render: (args) => {
    const panelId = `story-reasoning-steps-${panelCount++}`;
    return html`
      <div data-story-message>
        <cds-aichat-message-byline
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
      </div>
    `;
  },
};

/**
 * The chain of thought toggle sits in the `reasoning` slot. The host renders the
 * steps in the panel below the byline.
 */
export const WithChainOfThought = {
  argTypes,
  args: { ...defaultArgs, open: true },
  render: (args) => {
    const panelId = `story-chain-of-thought-${panelCount++}`;
    return html`
      <div data-story-message>
        <cds-aichat-message-byline
          label=${ifDefined(args.label || undefined)}
          timestamp=${ifDefined(args.timestamp || undefined)}>
          ${renderAvatar(args)}
          <cds-aichat-chain-of-thought-toggle
            slot="reasoning"
            panel-id=${panelId}
            ?open=${args.open}
            open-label-text="Hide chain of thought"
            closed-label-text="Show chain of thought"
            @chain-of-thought-toggle=${syncPanel(
              'cds-aichat-chain-of-thought'
            )}></cds-aichat-chain-of-thought-toggle>
        </cds-aichat-message-byline>
        <cds-aichat-chain-of-thought
          id=${panelId}
          panel-id=${panelId}
          ?open=${args.open}>
          ${chainOfThoughtSteps.map(
            (step, index) => html`
              <cds-aichat-chain-of-thought-step
                title=${step.title}
                status=${step.status}
                step-number=${index + 1}>
                <cds-aichat-tool-call-data tool-name=${step.tool_name}>
                  <div slot="description">
                    <cds-aichat-markdown
                      .markdown=${step.description}></cds-aichat-markdown>
                  </div>
                  <div slot="input">
                    <cds-aichat-markdown
                      .markdown=${step.request.args}></cds-aichat-markdown>
                  </div>
                  <div slot="output">
                    <cds-aichat-markdown
                      .markdown=${step.response.content}></cds-aichat-markdown>
                  </div>
                </cds-aichat-tool-call-data>
              </cds-aichat-chain-of-thought-step>
            `
          )}
        </cds-aichat-chain-of-thought>
      </div>
    `;
  },
};

export const HumanAgent = {
  argTypes,
  args: { ...defaultArgs, label: 'Jane Doe', avatarName: 'Jane Doe' },
  render: Default.render,
};
