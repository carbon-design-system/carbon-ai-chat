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
import InlineError from '../../../react/inline-error';
import {
  Default as DefaultWC,
  WithMarkdown as WithMarkdownWC,
} from './inline-error.stories';

export default {
  title: 'Preview/Inline error',
  component: InlineError,
};

const render = ({ text, iconLabel }) => (
  <InlineError iconLabel={iconLabel || undefined}>{text}</InlineError>
);

export const Default = {
  argTypes: { ...DefaultWC.argTypes },
  args: { ...DefaultWC.args },
  render,
};

export const WithMarkdown = {
  argTypes: { ...Default.argTypes },
  args: { ...WithMarkdownWC.args },
  render,
};
