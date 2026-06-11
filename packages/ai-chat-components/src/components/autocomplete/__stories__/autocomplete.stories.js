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

const suggestionGroups = [
  {
    id: "group-1",
    title: "Getting Started",
    items: [
      {
        id: "suggestion-1",
        label: "How do I get started with the platform?",
        disabled: false,
      },
      {
        id: "suggestion-2",
        label: "How do I create my first project?",
        disabled: false,
      },
      {
        id: "suggestion-3",
        label: "How do I configure my settings?",
        disabled: false,
      },
    ],
  },
  {
    id: "group-2",
    title: "Features & Support",
    items: [
      {
        id: "suggestion-4",
        label: "How do I access advanced features?",
        disabled: false,
      },
      {
        id: "suggestion-5",
        label: "How do I contact support?",
        disabled: false,
      },
      {
        id: "suggestion-6",
        label: "How do I integrate with other tools?",
        disabled: false,
      },
    ],
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
      .groups=${suggestionGroups}
      .headerConfig=${{ showHeader: true, title: "Prompt suggestions" }}
      inputText="How do"
    ></cds-aichat-autocomplete>
  `,
};

// Made with Bob
