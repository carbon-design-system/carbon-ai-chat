/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
import React, { useEffect, useId, useState } from 'react';
import MessageByline from '../../../react/message-byline';
import UserAvatar from '../../../react/user-avatar';
import ReasoningStepsToggle from '../../../react/reasoning-steps-toggle';
import ReasoningSteps from '../../../react/reasoning-steps';
import ReasoningStep from '../../../react/reasoning-step';
import ChainOfThoughtToggle from '../../../react/chain-of-thought-toggle';
import ChainOfThought from '../../../react/chain-of-thought';
import ChainOfThoughtStep from '../../../react/chain-of-thought-step';
import ToolCallData from '../../../react/tool-call-data';
import Markdown from '../../../react/markdown';
import { chainOfThoughtSteps, reasoningSteps } from './story-data';
import {
  Default as DefaultWC,
  WithoutAvatar as WithoutAvatarWC,
  WithReasoningSteps as WithReasoningStepsWC,
  WithChainOfThought as WithChainOfThoughtWC,
  HumanAgent as HumanAgentWC,
} from './message-byline.stories';

export default {
  title: 'Preview/Message byline',
  component: MessageByline,
};

const renderAvatar = (avatarName) =>
  avatarName ? (
    <UserAvatar
      slot="avatar"
      name={avatarName}
      width="1.5rem"
      height="1.5rem"
    />
  ) : null;

const render = ({ label, timestamp, avatarName }) => (
  <MessageByline label={label || undefined} timestamp={timestamp || undefined}>
    {renderAvatar(avatarName)}
  </MessageByline>
);

/** The reasoning steps toggle in the byline controls the panel below it. */
const ReasoningStepsMessage = ({ label, timestamp, avatarName, open }) => {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(open);
  useEffect(() => setIsOpen(open), [open]);

  return (
    <div>
      <MessageByline
        label={label || undefined}
        timestamp={timestamp || undefined}>
        {renderAvatar(avatarName)}
        <ReasoningStepsToggle
          slot="reasoning"
          panelID={panelId}
          open={isOpen}
          onToggle={(event) => setIsOpen(event.detail?.open ?? false)}
        />
      </MessageByline>
      <ReasoningSteps id={panelId} open={isOpen}>
        {reasoningSteps.map((step) => (
          <ReasoningStep
            key={step.title}
            title={step.title}
            open={step.open ?? false}>
            <Markdown markdown={step.body} />
          </ReasoningStep>
        ))}
      </ReasoningSteps>
    </div>
  );
};

/** The chain of thought toggle in the byline controls the panel below it. */
const ChainOfThoughtMessage = ({ label, timestamp, avatarName, open }) => {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(open);
  useEffect(() => setIsOpen(open), [open]);
  const handleToggle = (event) => setIsOpen(event.detail?.open ?? false);

  return (
    <div>
      <MessageByline
        label={label || undefined}
        timestamp={timestamp || undefined}>
        {renderAvatar(avatarName)}
        <ChainOfThoughtToggle
          slot="reasoning"
          panelId={panelId}
          open={isOpen}
          openLabelText="Hide chain of thought"
          closedLabelText="Show chain of thought"
          onToggle={handleToggle}
        />
      </MessageByline>
      <ChainOfThought
        id={panelId}
        panelId={panelId}
        open={isOpen}
        onToggle={handleToggle}>
        {chainOfThoughtSteps.map((step, index) => (
          <ChainOfThoughtStep
            key={step.title}
            title={step.title}
            status={step.status}
            stepNumber={index + 1}>
            <ToolCallData toolName={step.tool_name}>
              <Markdown slot="description" markdown={step.description} />
              <Markdown slot="input" markdown={step.request.args} />
              <Markdown slot="output" markdown={step.response.content} />
            </ToolCallData>
          </ChainOfThoughtStep>
        ))}
      </ChainOfThought>
    </div>
  );
};

export const Default = {
  argTypes: { ...DefaultWC.argTypes },
  args: { ...DefaultWC.args },
  render,
};

export const WithoutAvatar = {
  argTypes: { ...Default.argTypes },
  args: { ...WithoutAvatarWC.args },
  render,
};

export const WithReasoningSteps = {
  argTypes: { ...Default.argTypes },
  args: { ...WithReasoningStepsWC.args },
  render: (args) => <ReasoningStepsMessage {...args} />,
};

export const WithChainOfThought = {
  argTypes: { ...Default.argTypes },
  args: { ...WithChainOfThoughtWC.args },
  render: (args) => <ChainOfThoughtMessage {...args} />,
};

export const HumanAgent = {
  argTypes: { ...Default.argTypes },
  args: { ...HumanAgentWC.args },
  render,
};
