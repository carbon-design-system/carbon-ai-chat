/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import '../index';
import { stopMenuClickPropagation } from '../../../globals/utils/menu-item-activation.js';
import '@carbon/web-components/es/components/icon-button/index.js';
import '@carbon/web-components/es/components/ai-label/index.js';
import '@carbon/web-components/es/components/copy-button/index.js';
import '@carbon/web-components/es/components/overflow-menu/index.js';
import '@carbon/web-components/es/components/menu/index.js';
import '@carbon/web-components/es/components/content-switcher/index.js';

import {
  Home16,
  ArrowLeft16,
  OverflowMenuVertical16,
  Star16,
  StarFilled16,
  Download16,
  Close16,
} from '@carbon/icons';

import { html } from 'lit';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import { actionLists } from './story-data';
import { action } from 'storybook/actions';

import styles from './story-styles.scss?lit';

export default {
  title: 'Components/Toolbar',
  component: 'cds-aichat-toolbar',
  argTypes: {
    title: {
      control: 'select',
      table: { category: 'slot' },
      options: ['default', 'with truncation', 'none'],
      mapping: {
        default: html`<div slot="title">
          Title <span class="bold">text</span>
        </div>`,
        'with truncation': html`<div slot="title">
          <span class="truncated-text">
            Lorem ipsum dolor sit amet <span class="bold">consectetur</span>
          </span>
        </div>`,
        none: undefined,
      },
      description:
        "Title text for the Toolbar component. This Storybook-only control populates the title slot. `slot='title'`",
    },
    navigation: {
      control: 'select',
      options: ['home', 'back', 'custom 1', 'custom 2', 'none'],
      mapping: {
        home: html` <div slot="navigation" data-rounded="top-left">
          <cds-icon-button
            kind="ghost"
            @click=${action('onClick')}
            align="bottom-start"
            enter-delay-ms="0"
            leave-delay-ms="0">
            ${iconLoader(Home16, { slot: 'icon' })}
            <span slot="tooltip-content">Home</span>
          </cds-icon-button>
        </div>`,
        back: html` <div slot="navigation" data-rounded="top-left">
          <cds-icon-button
            kind="ghost"
            align="bottom-start"
            @click=${action('onClick')}
            enter-delay-ms="0"
            leave-delay-ms="0">
            ${iconLoader(ArrowLeft16, { slot: 'icon' })}
            <span slot="tooltip-content">Back</span>
          </cds-icon-button>
        </div>`,
        'custom 1': html` <div slot="navigation" data-rounded="top-left">
          <cds-overflow-menu
            size="md"
            index="1"
            kind="ghost"
            align="bottom-start"
            menu-alignment="bottom-start"
            enter-delay-ms="0"
            leave-delay-ms="0">
            ${iconLoader(OverflowMenuVertical16, {
              class: 'overflow-menu-svg',
              slot: 'icon',
            })}
            <span slot="tooltip-content"> Menu </span>
            <cds-menu @click=${stopMenuClickPropagation}>
              <cds-menu-item label="Stop app"></cds-menu-item>
              <cds-menu-item label="Restart app"></cds-menu-item>
              <cds-menu-item label="Rename app"></cds-menu-item>
              <cds-menu-item
                label="Clone and move app"
                disabled></cds-menu-item>
              <cds-menu-item label="Edit routes and access"></cds-menu-item>
              <cds-menu-item-divider></cds-menu-item-divider>
              <cds-menu-item label="Delete app" kind="danger"></cds-menu-item>
            </cds-menu>
          </cds-overflow-menu>
        </div>`,
        'custom 2': html` <div slot="navigation" data-rounded="top-left">
          <cds-button @click=${action('onClick')} size="md">test</cds-button>
        </div>`,
        none: undefined,
      },
      table: { category: 'slot' },
      description:
        "Navigation slot in the toolbar component. `slot='navigation'`",
    },
    fixedActions: {
      control: 'select',
      options: ['content switcher', 'custom 1', 'none'],
      mapping: {
        'content switcher': html` <div slot="fixed-actions">
          <cds-content-switcher
            @cds-content-switcher-selected=${(e) => console.log(e)}
            selection-mode="automatic"
            selected-index="0"
            size="sm">
            <cds-content-switcher-item value="code" name="one">
              Code
            </cds-content-switcher-item>
            <cds-content-switcher-item value="preview" name="two">
              Preview
            </cds-content-switcher-item>
          </cds-content-switcher>
        </div>`,
        'custom 1': html` <div slot="fixed-actions">
          <cds-button @click=${action('onClick')} size="md">test</cds-button>
        </div>`,
        none: undefined,
      },
      table: { category: 'slot' },
      description:
        "Fixed actions slot for toolbar component. `slot='fixed-actions'`",
    },
    overflow: {
      control: 'boolean',
      description:
        'Option to overflow non fixed actions into an overflow menu.',
    },
    actions: {
      control: 'select',
      options: Object.keys(actionLists),
      mapping: actionLists,
      description:
        'Select which predefined set of actions to render in the Toolbar component.',
    },
    aiLabel: {
      table: { category: 'slot' },
      control: 'boolean',
      description: "AI Label slot in the toolbar component `slot='decorator'`",
    },
    '--cds-aichat-border-radius': {
      control: 'boolean',
      description:
        'Setting this property with 8px will apply the border radius to the toolbar component.',
    },
  },
  decorators: [
    (story) => html`
      <style>
        ${styles}
      </style>
      ${story()}
    `,
  ],
};

export const Default = {
  args: {
    title: 'default',
    overflow: true,
    actions: 'Advanced list',
    navigation: 'home',
    fixedActions: 'none',
    aiLabel: true,
    '--cds-aichat-border-radius': false,
  },

  render: ({
    title,
    overflow,
    actions,
    aiLabel,
    navigation,
    fixedActions,
    '--cds-aichat-border-radius': borderRadius,
  }) => html`
    <cds-aichat-toolbar
      .actions=${actions}
      ?overflow=${overflow}
      style=${borderRadius ? '--cds-aichat-border-radius: 8px;' : ''}>
      <!-- Navigation slot -->
      ${navigation}

      <!-- Title slot -->
      ${title}

      <!-- Fixed actions slot -->
      ${fixedActions}

      <!-- AI Label slot -->
      ${
        aiLabel
          ? html` <cds-ai-label
              size="2xs"
              autoalign
              alignment="bottom"
              slot="decorator">
              <div slot="body-text">
                <h4 class="margin-bottom-05">Powered by IBM watsonx</h4>
                <div>
                  IBM watsonx is powered by the latest AI models to
                  intelligently process conversations and provide help whenever
                  and wherever you may need it.
                </div>
              </div>
            </cds-ai-label>`
          : ''
      }
    </cds-aichat-toolbar>
  `,
};

export const Toggle = {
  name: 'Toggleable actions',
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates the usage of the `isSelected` prop on a toolbar action. Click star action to see the action selected state.',
      },
    },
  },
  render: () => {
    let isOn = false;

    const getActions = () => [
      {
        text: 'Favourite',
        icon: isOn ? StarFilled16 : Star16,
        size: 'md',
        isSelected: isOn,
        onClick: () => {
          isOn = !isOn;
          toolbar.actions = getActions();
        },
      },
      {
        text: 'Download',
        icon: Download16,
        size: 'md',
        onClick: () => {},
      },
      {
        text: 'Close',
        fixed: true,
        icon: Close16,
        size: 'md',
        onClick: () => {},
      },
    ];

    const toolbar = document.createElement('cds-aichat-toolbar');
    toolbar.setAttribute('overflow', '');
    toolbar.actions = getActions();

    return toolbar;
  },
};
