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
import UserAvatar from '../../../react/user-avatar';
import {
  Default as DefaultWC,
  WithInitial as WithInitialWC,
  WithIcon as WithIconWC,
} from './user-avatar.stories';

export default {
  title: 'Preview/User avatar',
  component: UserAvatar,
};

const render = ({ name, image, label, width, height }) => (
  <UserAvatar
    name={name || undefined}
    image={image || undefined}
    label={label || undefined}
    width={width || undefined}
    height={height || undefined}
  />
);

export const Default = {
  argTypes: { ...DefaultWC.argTypes },
  args: { ...DefaultWC.args },
  render,
};

export const WithInitial = {
  argTypes: { ...Default.argTypes },
  args: { ...WithInitialWC.args },
  render,
};

export const WithIcon = {
  argTypes: { ...Default.argTypes },
  args: { ...WithIconWC.args },
  render,
};
