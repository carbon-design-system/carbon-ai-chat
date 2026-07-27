/* eslint-disable */
/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import React, { useMemo } from "react";
import { action } from "storybook/actions";
import CDSAIChatAutocomplete from "../../../react/autocomplete";
import {
  Default as DefaultWC,
  WithHeader as WithHeaderWC,
  WithCategories as WithCategoriesWC,
  Detached as DetachedWC,
} from "./autocomplete.stories";
import {
  BookAvatarIcon,
  ChartLineAvatarIcon,
  DatabaseAvatarIcon,
  HelpAvatarIcon,
} from "./avatar-icons.js";

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

const Wrapper = ({ width, children }) => {
  return <div style={{ width }}>{children}</div>;
};

/**
 * Filter suggestion items based on query string (case-insensitive).
 * Returns all items if query is empty.
 */
const filterSuggestions = (items, query) => {
  if (!query) {
    return items;
  }
  const lower = query.toLowerCase();
  return items.filter((item) => item.label.toLowerCase().includes(lower));
};

/**
 * Filter suggestion groups based on query string (case-insensitive).
 * Returns groups with filtered items, excluding empty groups.
 */
const filterSuggestionGroups = (groups, query) => {
  if (!query) {
    return groups;
  }
  const lower = query.toLowerCase();
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(lower),
      ),
    }))
    .filter((group) => group.items.length > 0);
};

export default {
  title: "Preview/Autocomplete",
  argTypes: {
    inputText: {
      control: "text",
      description:
        "The current input text. Suggestion items will apply styling to indicate what user has already typed.",
    },
    enableSendButton: {
      control: "boolean",
      description: "Whether to enable the send button",
    },
    attached: {
      control: "boolean",
      description:
        "Whether the autocomplete is attached to another element (e.g., an input field). When true, the bottom corners will not be rounded.",
    },
  },
  args: {
    inputText: "",
    enableSendButton: true,
    attached: true,
  },
};

export const Default = {
  render: (args) => {
    const query = args.inputText || "";
    const filteredItems = React.useMemo(
      () => filterSuggestions(flatSuggestions, query),
      [query],
    );

    return (
      <Wrapper width="320px">
        <CDSAIChatAutocomplete
          items={filteredItems}
          inputText={query}
          attached={args.attached ?? true}
          enableSendButton={args.enableSendButton ?? true}
          style={{ "--cds-aichat-autocomplete-max-height": "328px" }}
          onSelect={(e) => action("cds-aichat-autocomplete-select")(e.detail)}
          onSend={(e) => action("cds-aichat-autocomplete-send")(e.detail)}
          onDismiss={() => action("cds-aichat-autocomplete-dismiss")()}
        />
      </Wrapper>
    );
  },
};

export const WithHeader = {
  render: (args) => {
    const query = args.inputText || "";
    const filteredItems = React.useMemo(
      () => filterSuggestions(flatSuggestions, query),
      [query],
    );

    return (
      <Wrapper width="320px">
        <CDSAIChatAutocomplete
          items={filteredItems}
          headerConfig={{
            showHeader: true,
            title: "Prompt suggestions",
          }}
          inputText={query}
          attached={args.attached ?? true}
          enableSendButton={args.enableSendButton ?? true}
          style={{ "--cds-aichat-autocomplete-max-height": "328px" }}
          onSelect={(e) => action("cds-aichat-autocomplete-select")(e.detail)}
          onSend={(e) => action("cds-aichat-autocomplete-send")(e.detail)}
          onDismiss={() => action("cds-aichat-autocomplete-dismiss")()}
        />
      </Wrapper>
    );
  },
};

export const WithCategories = {
  render: (args) => {
    const query = args.inputText || "";
    const filteredGroups = React.useMemo(
      () => filterSuggestionGroups(suggestionGroupsWithAvatars, query),
      [query],
    );

    return (
      <Wrapper width="320px">
        <CDSAIChatAutocomplete
          groups={filteredGroups}
          inputText={query}
          attached={args.attached ?? true}
          enableSendButton={args.enableSendButton ?? true}
          style={{ "--cds-aichat-autocomplete-max-height": "328px" }}
          onSelect={(e) => action("cds-aichat-autocomplete-select")(e.detail)}
          onSend={(e) => action("cds-aichat-autocomplete-send")(e.detail)}
          onDismiss={() => action("cds-aichat-autocomplete-dismiss")()}
        />
      </Wrapper>
    );
  },
};

export const Detached = {
  args: {
    attached: false,
  },
  render: (args) => {
    const query = args.inputText || "";
    const filteredItems = React.useMemo(
      () => filterSuggestions(flatSuggestions, query),
      [query],
    );

    return (
      <Wrapper width="671px">
        <CDSAIChatAutocomplete
          items={filteredItems}
          inputText={query}
          attached={args.attached ?? false}
          enableSendButton={args.enableSendButton ?? true}
          style={{ "--cds-aichat-autocomplete-max-height": "328px" }}
          onSelect={(e) => action("cds-aichat-autocomplete-select")(e.detail)}
          onSend={(e) => action("cds-aichat-autocomplete-send")(e.detail)}
          onDismiss={() => action("cds-aichat-autocomplete-dismiss")()}
        />
      </Wrapper>
    );
  },
};
