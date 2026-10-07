/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import '../src/conversational-search-text';
import '../../markdown/src/markdown';
import { html, LitElement, nothing } from 'lit';
import { useArgs } from 'storybook/preview-api';
import { action } from 'storybook/actions';

const renderAnswer = (args, onToggle) => html`
  <div style="max-inline-size: 40rem">
    <cds-aichat-conversational-search-text
      .citationsOpen=${args.citationsOpen}
      .showCitationsToggle=${args.showCitationsToggle}
      .citationsLabel=${args.citationsLabel}
      .toggleLabel=${args.toggleLabel}
      @cds-aichat-citations-toggle=${onToggle}>
      <cds-aichat-markdown
        .markdown=${args.markdown}
        .streaming=${args.streaming}></cds-aichat-markdown>
    </cds-aichat-conversational-search-text>
    ${
      args.citationsOpen && args.showCitationsToggle
        ? html`<p>${args.citationText}</p>`
        : nothing
    }
  </div>
`;

class StreamingAnswerDemo extends LitElement {
  static properties = {
    config: { attribute: false },
    length: { state: true },
    open: { state: true },
  };

  constructor() {
    super();
    this.config = { markdown: '', streaming: false };
    this.length = 0;
    this.open = false;
  }

  createRenderRoot() {
    return this;
  }

  updated(changed) {
    if (changed.has('config')) {
      this.open = this.config.citationsOpen;
      this.length = 0;
      clearInterval(this.timer);
      if (this.config.streaming) {
        this.timer = setInterval(() => {
          this.length = Math.min(this.length + 8, this.config.markdown.length);
          if (this.length === this.config.markdown.length) {
            clearInterval(this.timer);
          }
        }, 100);
      }
    }
  }

  disconnectedCallback() {
    clearInterval(this.timer);
    super.disconnectedCallback();
  }

  render() {
    const streaming =
      this.config.streaming && this.length < this.config.markdown.length;
    return renderAnswer(
      {
        ...this.config,
        citationsOpen: this.open,
        streaming,
        markdown: this.config.streaming
          ? this.config.markdown.slice(0, this.length)
          : this.config.markdown,
      },
      (event) => {
        this.open = event.detail.open;
        action('citations-toggle')(event.detail);
      }
    );
  }
}

if (!customElements.get('story-conversational-search-stream')) {
  customElements.define(
    'story-conversational-search-stream',
    StreamingAnswerDemo
  );
}

export default {
  title: 'Preview/Conversational search/Answer text',
  component: 'cds-aichat-conversational-search-text',
};

export const Default = {
  args: {
    citationsOpen: false,
    showCitationsToggle: true,
    citationsLabel: 'Citations',
    toggleLabel: 'Toggle citations',
    streaming: false,
    markdown:
      'Carbon provides reusable components and accessibility guidance for your application.',
    citationText: 'Source: Carbon Design System documentation.',
  },
  argTypes: {
    citationsOpen: {
      control: 'boolean',
      description: 'Host-controlled open state.',
    },
    showCitationsToggle: {
      control: 'boolean',
      description: 'Show the citations toggle.',
    },
    citationsLabel: { control: 'text', description: 'Visible toggle text.' },
    toggleLabel: { control: 'text', description: 'Accessible toggle name.' },
    streaming: {
      control: 'boolean',
      description: 'Mark the slotted Markdown as streaming.',
    },
    markdown: {
      control: 'text',
      description: 'Markdown supplied by the host in the default slot.',
    },
    citationText: {
      control: 'text',
      description: 'Example source text rendered by the host.',
    },
    '@cds-aichat-citations-toggle': {
      action: 'citations-toggle',
      description: 'Requests a new open state in event.detail.open.',
      table: { category: 'events' },
    },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return renderAnswer(args, (event) => {
      updateArgs({ citationsOpen: event.detail.open });
      action('citations-toggle')(event.detail);
    });
  },
};

export const Open = {
  ...Default,
  args: { ...Default.args, citationsOpen: true },
};

export const WithoutToggle = {
  ...Default,
  args: { ...Default.args, showCitationsToggle: false },
};

export const Highlighted = {
  ...Default,
  args: {
    ...Default.args,
    citationsOpen: true,
    markdown:
      'Carbon provides ==reusable components== and ==accessibility guidance== for your application.',
  },
};

export const Streaming = {
  ...Default,
  args: { ...Default.args, streaming: true },
  render: (args) =>
    html`<story-conversational-search-stream
      .config=${args}></story-conversational-search-stream>`,
};
