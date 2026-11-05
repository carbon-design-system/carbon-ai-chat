/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
import React, { useId, useState } from 'react';
import MessageByline from '../../../react/message-byline';
import MessageItemShell from '../../../react/message-item-shell';
import UserAvatar from '../../../react/user-avatar';
import ReasoningStepsToggle from '../../../react/reasoning-steps-toggle';
import ReasoningSteps from '../../../react/reasoning-steps';
import ReasoningStep from '../../../react/reasoning-step';
import Markdown from '../../../react/markdown';
import { reasoningSteps } from './story-data';
import { profileImage } from '../../user-avatar/__stories__/story-data';
import {
  Default as DefaultWC,
  WithoutAvatar as WithoutAvatarWC,
  WithReasoningSteps as WithReasoningStepsWC,
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
      image={profileImage}
      width="28px"
      height="28px"
    />
  ) : null;

const render = ({ label, timestamp, avatarName }) => (
  <MessageByline label={label || undefined} timestamp={timestamp || undefined}>
    {renderAvatar(avatarName)}
  </MessageByline>
);

/** The reasoning steps toggle in the byline controls the panel in the message content. */
const ReasoningStepsMessage = ({ label, timestamp, avatarName }) => {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <MessageItemShell rowType="response">
      <MessageByline
        slot="byline"
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
    </MessageItemShell>
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
