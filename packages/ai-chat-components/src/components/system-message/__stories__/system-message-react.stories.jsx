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
import Headset16 from '@carbon/icons/es/headset/16.js';
import SystemMessage from '../../../react/system-message';
import {
  Default as DefaultWC,
  Divider as DividerWC,
  WithIcon as WithIconWC,
  ResponseStopped as ResponseStoppedWC,
} from './system-message.stories';

export default {
  title: 'Preview/System message',
  component: SystemMessage,
};

const render = ({ text, divider, responseStopped, showIcon }) => (
  <SystemMessage
    divider={divider}
    responseStopped={responseStopped}
    icon={showIcon ? Headset16 : undefined}>
    {text}
  </SystemMessage>
);

export const Default = {
  argTypes: { ...DefaultWC.argTypes },
  args: { ...DefaultWC.args },
  render,
};

export const Divider = {
  argTypes: { ...Default.argTypes },
  args: { ...DividerWC.args },
  render,
};

export const WithIcon = {
  argTypes: { ...Default.argTypes },
  args: { ...WithIconWC.args },
  render,
};

export const ResponseStopped = {
  argTypes: { ...Default.argTypes },
  args: { ...ResponseStoppedWC.args },
  render,
};
