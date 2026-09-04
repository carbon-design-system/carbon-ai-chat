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
import { TruncatedText } from '../../../react/truncated-text';
import {
  Default as DefaultWC,
  Expand as ExpandWC,
} from './truncated-text.stories';

const renderTruncatedText = (args) => (
  <div style={{ maxWidth: '20rem' }}>
    <TruncatedText {...args} />
  </div>
);

export default {
  title: 'Components/Truncated text',
  component: TruncatedText,
};

export const Default = {
  argTypes: { ...DefaultWC.argTypes },
  args: { ...DefaultWC.args },
  render: renderTruncatedText,
};

export const Expand = {
  argTypes: { ...ExpandWC.argTypes },
  args: { ...ExpandWC.args },
  render: renderTruncatedText,
};
