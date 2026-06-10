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
import {
  BookAvatarIcon,
  ChartLineAvatarIcon,
  DatabaseAvatarIcon,
  HelpAvatarIcon,
} from "./avatar-icons.js";

// Flat suggestion items (no groups)
const flatSuggestions = [
  {
    id: "suggestion-1",
    label: "When is the best time to eat?",
  },
  {
    id: "suggestion-2",
    label: "When is the sun rising today?",
  },
  {
    id: "suggestion-3",
    label: "When is the sun setting today?",
  },
  {
    id: "suggestion-4",
    label: "When is the start of Spring?",
  },
  {
    id: "suggestion-5",
    label: "When is the next full moon?",
  },
  {
    id: "suggestion-6",
    label: "When is the next lunar eclipse?",
  },
];

// Suggestion groups with avatars and descriptions
const suggestionGroupsWithAvatars = [
  {
    id: "group-1",
    title: "Domain A",
    items: [
      {
        id: "suggestion-1",
        label: "Summarize",
        description: "Describe selected data",
        avatar: BookAvatarIcon,
      },
      {
        id: "suggestion-2",
        label: "Visualization",
        description: "Generate quick chart",
        avatar: ChartLineAvatarIcon,
      },
    ],
  },
  {
    id: "group-2",
    title: "Domain B",
    items: [
      {
        id: "suggestion-3",
        label: "Train",
        description: "Use dataset to train model",
        avatar: DatabaseAvatarIcon,
      },
      {
        id: "suggestion-4",
        label: "Summarize",
        description: "Describe selected data",
        avatar: BookAvatarIcon,
      },
    ],
  },
  {
    id: "group-3",
    title: "Domain C",
    items: [
      {
        id: "suggestion-5",
        label: "Validate",
        description: "Check quality of data",
        avatar: DatabaseAvatarIcon,
      },
      {
        id: "suggestion-6",
        label: "Document",
        description: "Show available commands ",
        avatar: HelpAvatarIcon,
      },
    ],
  },
];

export default {
  title: "Preview/Autocomplete",
  component: "cds-aichat-autocomplete",
  argTypes: {
    inputText: {
      control: "text",
      description: "The input text to display",
    },
    enableSendButton: {
      control: "boolean",
      description: "Whether to enable the send button",
    },
  },
  args: {
    inputText: "",
    enableSendButton: true,
  },
};

export const Default = {
  render: ({ inputText, enableSendButton }) => html`
    <div style="width: 320px; margin: 2rem;">
      <cds-aichat-autocomplete
        style="--cds-aichat-autocomplete-max-height: 328px;"
        .items=${flatSuggestions}
        attached
        ?enable-send-button=${enableSendButton}
        input-text=${inputText}
      ></cds-aichat-autocomplete>
    </div>
  `,
};

export const WithHeader = {
  render: ({ inputText, enableSendButton }) => html`
    <div style="width: 320px; margin: 2rem;">
      <cds-aichat-autocomplete
        style="--cds-aichat-autocomplete-max-height: 328px;"
        .items=${flatSuggestions}
        attached
        ?enable-send-button=${enableSendButton}
        .headerConfig=${{ showHeader: true, title: "Prompt suggestions" }}
        input-text=${inputText}
      ></cds-aichat-autocomplete>
    </div>
  `,
};

export const WithCategories = {
  render: ({ inputText, enableSendButton }) => html`
    <div style="width: 320px; margin: 2rem;">
      <cds-aichat-autocomplete
        style="--cds-aichat-autocomplete-max-height: 328px;"
        .groups=${suggestionGroupsWithAvatars}
        attached
        ?enable-send-button=${enableSendButton}
        input-text=${inputText}
      ></cds-aichat-autocomplete>
    </div>
  `,
};

export const Detached = {
  render: ({ inputText, enableSendButton }) => html`
    <div style="width: 671px; margin: 2rem;">
      <cds-aichat-autocomplete
        style="--cds-aichat-autocomplete-max-height: 328px;"
        .items=${flatSuggestions}
        ?enable-send-button=${enableSendButton}
        input-text=${inputText}
        .attached=${false}
      ></cds-aichat-autocomplete>
    </div>
  `,
};
