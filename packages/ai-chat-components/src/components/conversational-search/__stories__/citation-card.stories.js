/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import '../src/citation-card';
import '../../markdown/src/markdown';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { action } from 'storybook/actions';
import { citations, markdownBody } from './story-data';

export default {
  title: 'Preview/Conversational search/Citation card',
  component: 'cds-aichat-citation-card',
};

export const Default = {
  args: {
    url: citations[0].url,
    expandable: false,
    sourceLabel: '',
    selected: false,
    title: citations[0].title,
    body: citations[0].text,
  },
  argTypes: {
    url: {
      control: 'text',
      description: 'Source URL. With it, the card is a link.',
    },
    expandable: {
      control: 'boolean',
      description: 'Make the card a button even when its text fits.',
    },
    sourceLabel: {
      control: 'text',
      description:
        "Footer text. Links default to the URL's hostname when it's empty.",
    },
    selected: {
      control: 'boolean',
      description: 'Mark the card as selected. The shell sets this.',
    },
    title: { control: 'text', description: 'Text in the title slot.' },
    body: { control: 'text', description: 'Text in the body slot.' },
    '@cds-aichat-citation-select': {
      action: 'citation-select',
      description: 'Fires when the link or button gets focus or is clicked.',
      table: { category: 'events' },
    },
    '@cds-aichat-citation-expand': {
      action: 'citation-expand',
      description: 'Fires when an expandable card is clicked.',
      table: { category: 'events' },
    },
  },
  render: (args) => html`
    <div style="max-inline-size: 400px">
      <cds-aichat-citation-card
        index="0"
        url=${ifDefined(args.url || undefined)}
        ?expandable=${args.expandable}
        source-label=${ifDefined(args.sourceLabel || undefined)}
        ?selected=${args.selected}
        @cds-aichat-citation-select=${(event) =>
          action('citation-select')(event.detail)}
        @cds-aichat-citation-expand=${(event) =>
          action('citation-expand')(event.detail)}>
        <div slot="title">${args.title}</div>
        <div slot="body">${args.body}</div>
      </cds-aichat-citation-card>
    </div>
  `,
};

export const Expandable = {
  ...Default,
  args: {
    ...Default.args,
    url: '',
    expandable: true,
    sourceLabel: 'View source',
    title: citations[2].title,
    body: citations[2].text,
  },
};

export const Plain = {
  ...Default,
  args: {
    ...Default.args,
    url: '',
    sourceLabel: 'View source',
    title: citations[2].title,
    body: citations[2].text,
  },
};

export const Overflowing = {
  ...Default,
  args: {
    ...Default.args,
    url: '',
    sourceLabel: 'View source',
    title: citations[1].title,
    body: citations[1].text,
  },
};

export const MarkdownBody = {
  ...Default,
  args: {
    ...Default.args,
    url: '',
    expandable: true,
    sourceLabel: 'View source',
    title: citations[1].title,
  },
  argTypes: { ...Default.argTypes, body: { control: false } },
  render: (args) => html`
    <div style="max-inline-size: 400px">
      <cds-aichat-citation-card
        index="0"
        ?expandable=${args.expandable}
        source-label=${ifDefined(args.sourceLabel || undefined)}
        @cds-aichat-citation-select=${(event) =>
          action('citation-select')(event.detail)}
        @cds-aichat-citation-expand=${(event) =>
          action('citation-expand')(event.detail)}>
        <div slot="title">${args.title}</div>
        <cds-aichat-markdown
          slot="body"
          .markdown=${markdownBody}></cds-aichat-markdown>
      </cds-aichat-citation-card>
    </div>
  `,
};
