/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '../index';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { profileImage } from './story-data';

export default {
  title: 'Preview/User avatar',
  component: 'cds-aichat-user-avatar',
};

export const Default = {
  argTypes: {
    name: {
      control: 'text',
      description:
        'The person’s name. When the image is missing or fails, its first character is shown if the name only has characters from U+0020 to U+00FE. Otherwise the user icon is shown.',
    },
    image: {
      control: 'text',
      description:
        'URL of the profile image. If it fails to load, the avatar falls back to the initial or icon.',
    },
    label: {
      control: 'text',
      description:
        'Accessible label for the avatar. Provide a translated string.',
    },
    width: {
      control: 'text',
      description: 'Width as a CSS length, such as 48px. Defaults to 2rem.',
    },
    height: {
      control: 'text',
      description: 'Height as a CSS length, such as 48px. Defaults to 2rem.',
    },
  },
  args: {
    name: 'Alice',
    image: profileImage,
    label: 'Agent avatar',
    width: '',
    height: '',
  },
  render: (args) => html`
    <cds-aichat-user-avatar
      name=${ifDefined(args.name || undefined)}
      image=${ifDefined(args.image || undefined)}
      label=${ifDefined(args.label || undefined)}
      width=${ifDefined(args.width || undefined)}
      height=${ifDefined(args.height || undefined)}>
    </cds-aichat-user-avatar>
  `,
};

export const WithInitial = {
  argTypes: { ...Default.argTypes },
  args: { ...Default.args, image: '' },
  render: Default.render,
};

export const WithIcon = {
  argTypes: { ...Default.argTypes },
  args: { ...Default.args, name: '王小明', image: '' },
  render: Default.render,
};
