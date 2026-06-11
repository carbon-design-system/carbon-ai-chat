/* eslint-disable */
/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import React from "react";
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

// Suggestion groups with avatars and descriptions
// Using the same avatar icons from avatar-icons.js as the web components story
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
  return <div style={{ width, margin: "2rem" }}>{children}</div>;
};

export default {
  title: "Preview/Autocomplete",
  argTypes: {
    inputText: {
      control: "text",
      description: "The input text to display",
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
    const ref = React.useRef(null);
    React.useEffect(() => {
      if (ref.current) {
        ref.current.items = flatSuggestions;
        ref.current.inputText = args.inputText || "";
        ref.current.attached = args.attached ?? true;
        ref.current.enableSendButton = args.enableSendButton ?? true;
      }
    }, [args.inputText, args.attached, args.enableSendButton]);

    return (
      <Wrapper width="320px">
        <CDSAIChatAutocomplete
          ref={ref}
          style={{ "--cds-aichat-autocomplete-max-height": "328px" }}
        />
      </Wrapper>
    );
  },
};

export const WithHeader = {
  render: (args) => {
    const ref = React.useRef(null);
    React.useEffect(() => {
      if (ref.current) {
        ref.current.items = flatSuggestions;
        ref.current.headerConfig = {
          showHeader: true,
          title: "Prompt suggestions",
        };
        ref.current.inputText = args.inputText || "";
        ref.current.attached = args.attached ?? true;
        ref.current.enableSendButton = args.enableSendButton ?? true;
      }
    }, [args.inputText, args.attached, args.enableSendButton]);

    return (
      <Wrapper width="320px">
        <CDSAIChatAutocomplete
          ref={ref}
          style={{ "--cds-aichat-autocomplete-max-height": "328px" }}
        />
      </Wrapper>
    );
  },
};

export const WithCategories = {
  render: (args) => {
    const ref = React.useRef(null);
    React.useEffect(() => {
      if (ref.current) {
        ref.current.groups = suggestionGroupsWithAvatars;
        ref.current.inputText = args.inputText || "";
        ref.current.attached = args.attached ?? true;
        ref.current.enableSendButton = args.enableSendButton ?? true;
      }
    }, [args.inputText, args.attached, args.enableSendButton]);

    return (
      <Wrapper width="320px">
        <CDSAIChatAutocomplete
          ref={ref}
          style={{ "--cds-aichat-autocomplete-max-height": "328px" }}
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
    const ref = React.useRef(null);
    React.useEffect(() => {
      if (ref.current) {
        ref.current.items = flatSuggestions;
        ref.current.inputText = args.inputText || "";
        ref.current.attached = args.attached ?? false;
        ref.current.enableSendButton = args.enableSendButton ?? true;
      }
    }, [args.inputText, args.attached, args.enableSendButton]);

    return (
      <Wrapper width="671px">
        <CDSAIChatAutocomplete
          ref={ref}
          style={{ "--cds-aichat-autocomplete-max-height": "328px" }}
        />
      </Wrapper>
    );
  },
};
