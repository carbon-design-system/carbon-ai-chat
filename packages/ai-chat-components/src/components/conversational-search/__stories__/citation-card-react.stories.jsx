/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/* eslint-disable */
import React from 'react';
import { action } from 'storybook/actions';
import CitationCard from '../../../react/citation-card';
import Markdown from '../../../react/markdown';
import {
  Default as DefaultWC,
  Expandable as ExpandableWC,
  Plain as PlainWC,
  Overflowing as OverflowingWC,
  MarkdownBody as MarkdownBodyWC,
} from './citation-card.stories';
import { markdownBody } from './story-data';

const {
  '@cds-aichat-citation-select': selectEvent,
  '@cds-aichat-citation-expand': expandEvent,
  ...argTypes
} = DefaultWC.argTypes;

function Card({ args, children }) {
  return (
    <div style={{ maxInlineSize: '400px' }}>
      <CitationCard
        index={0}
        url={args.url || undefined}
        expandable={args.expandable}
        sourceLabel={args.sourceLabel || undefined}
        selected={args.selected}
        onCitationSelect={(event) => action('citation-select')(event.detail)}
        onCitationExpand={(event) => action('citation-expand')(event.detail)}>
        <div slot="title">{args.title}</div>
        {children ?? <div slot="body">{args.body}</div>}
      </CitationCard>
    </div>
  );
}

export default {
  title: 'Preview/Conversational search/Citation card',
  component: CitationCard,
};

export const Default = {
  args: { ...DefaultWC.args },
  argTypes: {
    ...argTypes,
    onCitationSelect: { ...selectEvent, control: 'none' },
    onCitationExpand: { ...expandEvent, control: 'none' },
  },
  render: (args) => <Card args={args} />,
};

export const Expandable = { ...Default, args: { ...ExpandableWC.args } };

export const Plain = { ...Default, args: { ...PlainWC.args } };

export const Overflowing = { ...Default, args: { ...OverflowingWC.args } };

export const MarkdownBody = {
  ...Default,
  args: { ...MarkdownBodyWC.args },
  argTypes: { ...Default.argTypes, body: { control: false } },
  render: (args) => (
    <Card args={args}>
      <Markdown slot="body" markdown={markdownBody} />
    </Card>
  ),
};
