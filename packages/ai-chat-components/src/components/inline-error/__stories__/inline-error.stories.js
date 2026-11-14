/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '../index';
import '../../markdown/index';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';

export default {
  title: 'Preview/Inline error',
  component: 'cds-aichat-inline-error',
};

const argTypes = {
  text: {
    control: 'text',
    description:
      'Story-only. The text slotted into the element, as a `cds-aichat-markdown` element with HTML removed.',
  },
  iconLabel: {
    control: 'text',
    description:
      'Accessible label for the error icon, in the host’s language. Without it the icon is hidden from assistive technology.',
  },
};

const defaultArgs = {
  text: 'There was an error displaying this content',
  iconLabel: 'Error',
};

export const Default = {
  argTypes,
  args: defaultArgs,
  render: (args) => html`
    <cds-aichat-inline-error
      icon-label=${ifDefined(args.iconLabel || undefined)}>
      <cds-aichat-markdown remove-html>${args.text}</cds-aichat-markdown>
    </cds-aichat-inline-error>
  `,
};

export const WithMarkdown = {
  argTypes,
  args: {
    ...defaultArgs,
    text: 'Something went wrong. [Try again](https://www.carbondesignsystem.com/) or contact **support**.',
  },
  render: Default.render,
};
