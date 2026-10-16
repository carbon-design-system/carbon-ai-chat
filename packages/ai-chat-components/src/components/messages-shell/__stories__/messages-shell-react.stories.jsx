/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import MessagesShell from '../../../react/messages-shell';
import { action } from 'storybook/actions';
import './story-styles.scss';
import { placeholderMessages, storyClass } from './story-data';
import messagesShellStories, {
  Default as DefaultWC,
  NoContent as NoContentWC,
} from './messages-shell.stories';

export default {
  title: messagesShellStories.title,
  component: MessagesShell,
  parameters: messagesShellStories.parameters,
  argTypes: messagesShellStories.argTypes,
};

export const Default = {
  args: DefaultWC.args,
  render: ({ topHandleLabel, bottomHandleLabel }) => (
    <div className={`${storyClass}-container`}>
      <MessagesShell
        topHandleLabel={topHandleLabel}
        bottomHandleLabel={bottomHandleLabel}
        onMessagesShellScroll={(e) => action('scroll')(e.detail)}>
        <div slot="notifications" className={`${storyClass}-notification`}>
          Notification slot — e.g. human-agent banner
        </div>
        {placeholderMessages.map((msg) => (
          <div
            key={msg.text}
            className={`${storyClass}-message ${storyClass}-message--${msg.type}`}>
            {msg.text}
          </div>
        ))}
        <div slot="processing" className={`${storyClass}-processing`}>
          Processing slot (typing indicator goes here)
        </div>
        <div slot="scroll-down" className={`${storyClass}-scroll-down`}>
          <button type="button">↓ Scroll to bottom</button>
        </div>
        <div slot="error" className={`${storyClass}-error`}>
          Error slot — e.g. send failure
        </div>
      </MessagesShell>
    </div>
  ),
};

export const NoContent = {
  args: NoContentWC.args,
  render: ({ topHandleLabel, bottomHandleLabel }) => (
    <div className={`${storyClass}-container`}>
      <MessagesShell
        topHandleLabel={topHandleLabel}
        bottomHandleLabel={bottomHandleLabel}
      />
    </div>
  ),
};
