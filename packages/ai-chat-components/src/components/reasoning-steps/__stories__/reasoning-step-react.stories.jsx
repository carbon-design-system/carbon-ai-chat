/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
import { manifestEventArgTypes } from '../../../../.storybook-react/manifest-event-arg-types.js';
import React from 'react';
import ReasoningSteps from '../../../react/reasoning-steps';
import ReasoningStep from '../../../react/reasoning-step';
import Markdown from '../../../react/markdown';

const defaultBody = (
  <Markdown
    markdown={`Confirmed the retrieved snippets map to the user's request and captured any
open questions before drafting a response.`}
  />
);

export default {
  title: 'Components/Reasoning steps/Step',
  component: ReasoningStep,
  parameters: {
    docs: {
      description: {
        component:
          'Represents a single entry within the reasoning steps timeline. Supports controlled or uncontrolled open state when paired with ReasoningSteps.',
      },
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Label displayed in the step header.',
    },
    open: {
      control: 'boolean',
      description: 'Whether the step is expanded.',
    },
    controlled: {
      control: 'boolean',
      description:
        'When true, the host application must update the open state in response to toggle events.',
    },

    ...manifestEventArgTypes(ReasoningStep),
  },
  args: {
    title: 'Review retrieved context',
    open: true,
    controlled: false,
    onBeforeToggle: (event) => {
      console.log('onBeforeToggle', event?.detail);
    },
    onToggle: (event) => {
      console.log('onToggle', event?.detail);
    },
  },
};

export const Default = {
  render: (args) => (
    <div style={{ maxWidth: '32rem' }}>
      <ReasoningSteps open>
        <ReasoningStep
          title={args.title}
          open={args.open}
          controlled={args.controlled}
          onBeforeToggle={args.onBeforeToggle}
          onToggle={args.onToggle}>
          {defaultBody}
        </ReasoningStep>
        <ReasoningStep
          title="Awaiting attachments"
          onBeforeToggle={args.onBeforeToggle}
          onToggle={args.onToggle}
        />
      </ReasoningSteps>
    </div>
  ),
};

export const Static = {
  render: () => (
    <div style={{ maxWidth: '32rem' }}>
      <ReasoningSteps open>
        <ReasoningStep title="Context missing" />
      </ReasoningSteps>
    </div>
  ),
};

export const ReasoningStepEvents = {
  tags: ['!dev'],
  parameters: { chromatic: { disable: true } },
  argTypes: { ...manifestEventArgTypes(ReasoningStep) },
};
