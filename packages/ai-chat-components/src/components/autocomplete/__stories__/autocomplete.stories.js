/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import "../index";
import { html } from "lit";

const suggestionItems = [
  {
    id: "suggestion-1",
    label: "What are the key features of this product?",
    disabled: false,
  },
  {
    id: "suggestion-2",
    label: "How do I get started with the platform?",
    disabled: false,
  },
  {
    id: "suggestion-3",
    label: "Can you explain the pricing model?",
    disabled: false,
  },
  {
    id: "suggestion-4",
    label: "What integrations are available?",
    disabled: false,
  },
  {
    id: "suggestion-5",
    label: "How do I contact support?",
    disabled: false,
  },
];

export default {
  title: "Preview/Autocomplete",
  component: "cds-aichat-autocomplete",
  decorators: [
    (story) => html`
      <div style="max-width: 400px; margin: 2rem;">${story()}</div>
    `,
  ],
};

export const Default = {
  render: () => html`
    <cds-aichat-autocomplete
      .items=${suggestionItems}
      inputText=""
    ></cds-aichat-autocomplete>
  `,
};

// Made with Bob
