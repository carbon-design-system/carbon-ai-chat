/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
import React from 'react';
import MessageByline from '../../../react/message-byline';
import UserAvatar from '../../../react/user-avatar';
import {
  Default as DefaultWC,
  WithoutAvatar as WithoutAvatarWC,
  WithReasoning as WithReasoningWC,
  HumanAgent as HumanAgentWC,
} from './message-byline.stories';

export default {
  title: 'Preview/Message byline',
  component: MessageByline,
};

const render = ({ label, timestamp, avatarName, reasoningLabel }) => (
  <MessageByline label={label || undefined} timestamp={timestamp || undefined}>
    {avatarName && (
      <UserAvatar
        slot="avatar"
        name={avatarName}
        width="1.5rem"
        height="1.5rem"
      />
    )}
    {reasoningLabel && (
      <button slot="reasoning" type="button">
        {reasoningLabel}
      </button>
    )}
  </MessageByline>
);

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

export const WithReasoning = {
  argTypes: { ...Default.argTypes },
  args: { ...WithReasoningWC.args },
  render,
};

export const HumanAgent = {
  argTypes: { ...Default.argTypes },
  args: { ...HumanAgentWC.args },
  render,
};
