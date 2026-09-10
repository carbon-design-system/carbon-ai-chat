/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '../src/truncated-text';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';

const argTypes = {
  align: {
    control: 'text',
    description: 'Positions the tooltip relative to the truncated text.',
  },
  autoalign: {
    control: 'boolean',
    description: 'Automatically adjusts the tooltip alignment when needed.',
  },
  collapseLabel: {
    control: 'text',
    description: 'Label for the control that collapses expanded text.',
  },
  expandLabel: {
    control: 'text',
    description: 'Label for the control that expands truncated text.',
  },
  id: {
    control: 'text',
    description: 'Unique identifier for the truncated content.',
  },
  lines: {
    control: { type: 'number', min: 0, step: 1 },
    description: 'Maximum number of visible lines before truncation.',
  },
  type: {
    control: 'select',
    options: ['tooltip', 'expand'],
    description: 'Shows overflow text in a tooltip or with an expand control.',
  },
  value: {
    control: 'text',
    description: 'Text to truncate.',
  },
};

const renderTruncatedText = (args) => html`
  <div style="max-width: 20rem;">
    <cds-aichat-truncated-text
      align=${ifDefined(args.align)}
      ?autoalign=${args.autoalign}
      collapse-label=${ifDefined(args.collapseLabel)}
      expand-label=${ifDefined(args.expandLabel)}
      id=${ifDefined(args.id)}
      .lines=${args.lines}
      type=${ifDefined(args.type)}
      value=${ifDefined(args.value)}></cds-aichat-truncated-text>
  </div>
`;

export default {
  title: 'Components/Truncated text',
  component: 'cds-aichat-truncated-text',
};

export const Default = {
  args: {
    align: 'top',
    autoalign: false,
    collapseLabel: 'Show less',
    expandLabel: 'Show more',
    id: 'truncated-text-default',
    lines: 2,
    type: 'tooltip',
    value:
      'This is a long piece of text that demonstrates how truncated text reveals overflow content in a tooltip.',
  },
  argTypes,
  render: renderTruncatedText,
};

export const Expand = {
  args: {
    ...Default.args,
    id: 'truncated-text-expand',
    type: 'expand',
  },
  argTypes: { ...Default.argTypes },
  render: renderTruncatedText,
};
