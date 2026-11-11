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
import MessageItemShell from '../../../react/message-item-shell';
import UserAvatar from '../../../react/user-avatar';
import './story-styles.scss';
import { storyClass } from './story-data';
import {
  Default as DefaultWC,
  Response as ResponseWC,
  FullWidth as FullWidthWC,
  HiddenAvatar as HiddenAvatarWC,
} from './message-item-shell.stories';

export default {
  title: 'Preview/Message item shell',
  component: MessageItemShell,
};

/** Renders one shell row with placeholder slot content. */
const renderRow = (args) => (
  <MessageItemShell
    className={`${storyClass}-${args.rowType}`}
    rowType={args.rowType}
    fullWidth={args.fullWidth}
    hideAvatar={args.hideAvatar}>
    <MessageByline
      slot="byline"
      label={args.rowType === 'request' ? 'You' : 'Assistant'}
      timestamp="10:42 AM">
      {args.rowType === 'response' && (
        <UserAvatar slot="avatar" width="28px" height="28px" />
      )}
    </MessageByline>
    <div className={`${storyClass}-content`}>
      {args.rowType === 'request'
        ? 'How do I reset my password?'
        : 'Open Settings, choose Security, and select Reset password.'}
    </div>
    <div slot="attachment" className={`${storyClass}-attachment`}>
      Attachment slot
    </div>
    <div slot="footer" className={`${storyClass}-footer`}>
      Footer slot
    </div>
  </MessageItemShell>
);

export const Default = {
  argTypes: DefaultWC.argTypes,
  args: DefaultWC.args,
  render: (args) => (
    <div className={`${storyClass}-container`}>{renderRow(args)}</div>
  ),
};

export const Response = {
  argTypes: ResponseWC.argTypes,
  args: ResponseWC.args,
  render: Default.render,
};

export const FullWidth = {
  argTypes: FullWidthWC.argTypes,
  args: FullWidthWC.args,
  render: Default.render,
};

export const HiddenAvatar = {
  argTypes: HiddenAvatarWC.argTypes,
  args: HiddenAvatarWC.args,
  render: Default.render,
};
