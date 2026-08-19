/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import '../index';
import { html } from 'lit';
import { action } from 'storybook/actions';
import {
  BookAvatarIcon,
  ChartLineAvatarIcon,
  DatabaseAvatarIcon,
  HelpAvatarIcon,
} from './avatar-icons.js';

// Flat suggestion items (no groups)
const flatSuggestions = [
  {
    id: 'suggestion-1',
    label: 'When is the best time to eat?',
  },
  {
    id: 'suggestion-2',
    label: 'When is the sun rising today?',
  },
  {
    id: 'suggestion-3',
    label: 'When is the sun setting today?',
  },
  {
    id: 'suggestion-4',
    label: 'When is the start of Spring?',
  },
  {
    id: 'suggestion-5',
    label: 'When is the next full moon?',
  },
  {
    id: 'suggestion-6',
    label: 'When is the next lunar eclipse?',
  },
];

// Suggestion groups with avatars and descriptions
const suggestionGroupsWithAvatars = [
  {
    id: 'group-1',
    title: 'Domain A',
    items: [
      {
        id: 'suggestion-1',
        label: 'Summarize',
        description: 'Describe selected data',
        avatar: BookAvatarIcon,
      },
      {
        id: 'suggestion-2',
        label: 'Visualization',
        description: 'Generate quick chart',
        avatar: ChartLineAvatarIcon,
      },
    ],
  },
  {
    id: 'group-2',
    title: 'Domain B',
    items: [
      {
        id: 'suggestion-3',
        label: 'Train',
        description: 'Use dataset to train model',
        avatar: DatabaseAvatarIcon,
      },
      {
        id: 'suggestion-4',
        label: 'Summarize',
        description: 'Describe selected data',
        avatar: BookAvatarIcon,
      },
    ],
  },
  {
    id: 'group-3',
    title: 'Domain C',
    items: [
      {
        id: 'suggestion-5',
        label: 'Validate',
        description: 'Check quality of data',
        avatar: DatabaseAvatarIcon,
      },
      {
        id: 'suggestion-6',
        label: 'Document',
        description: 'Show available commands ',
        avatar: HelpAvatarIcon,
      },
    ],
  },
];

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
        item.label.toLowerCase().includes(lower)
      ),
    }))
    .filter((group) => group.items.length > 0);
};

export default {
  title: 'Preview/Prompt line/Autocomplete',
  component: 'cds-aichat-autocomplete',
  argTypes: {
    items: {
      control: false,
      description:
        'Array of flat suggestion items to display. Each item requires an `id` and `label`, and optionally accepts a `description` and `avatar`.',
    },
    groups: {
      control: false,
      description:
        'Array of grouped suggestion items to display. Each group requires an `id`, `title`, and `items` array. Groups are rendered after any flat `items`.',
    },
    headerConfig: {
      control: false,
      description:
        'Optional header configuration object. Set `showHeader: true` and provide a `title` string to display a header above the suggestion list.',
    },
    i18n: {
      control: 'object',
      description:
        'Localized strings for announcements and accessible labels. Defaults to English via `defaultAutocompleteI18n`. Override individual keys to customize or translate the component.',
    },
    inputText: {
      control: 'text',
      description:
        'The current input text. Suggestion items will apply styling to indicate what the user has already typed.',
    },
    disableDirectSend: {
      control: 'boolean',
      description:
        'When `false` (default), clicking an item fires `cds-aichat-autocomplete-send` and shows a send icon on hover. When `true`, clicking fires `cds-aichat-autocomplete-select` (insert-into-editor) and no send icon is shown.',
    },
    attached: {
      control: 'boolean',
      description:
        'Whether the autocomplete is attached to another element (e.g., an input field). When true, the bottom corners will not be rounded.',
    },
  },
  args: {
    inputText: '',
    disableDirectSend: false,
    attached: true,
  },
};

export const Default = {
  render: ({ inputText, disableDirectSend, attached }) => {
    const query = inputText || '';
    const filteredItems = filterSuggestions(flatSuggestions, query);

    return html`
      <div style="width: 320px;">
        <cds-aichat-autocomplete
          style="--cds-aichat-autocomplete-max-height: 328px;"
          .items=${filteredItems}
          ?attached=${attached}
          ?disable-direct-send=${disableDirectSend}
          input-text=${inputText}
          @cds-aichat-autocomplete-select=${(e) =>
            action('cds-aichat-autocomplete-select')(e.detail)}
          @cds-aichat-autocomplete-send=${(e) =>
            action('cds-aichat-autocomplete-send')(e.detail)}
          @cds-aichat-autocomplete-dismiss=${() =>
            action(
              'cds-aichat-autocomplete-dismiss'
            )()}></cds-aichat-autocomplete>
      </div>
    `;
  },
};

export const WithHeader = {
  render: ({ inputText, disableDirectSend, attached }) => {
    const query = inputText || '';
    const filteredItems = filterSuggestions(flatSuggestions, query);

    return html`
      <div style="width: 320px;">
        <cds-aichat-autocomplete
          style="--cds-aichat-autocomplete-max-height: 328px;"
          .items=${filteredItems}
          ?attached=${attached}
          ?disable-direct-send=${disableDirectSend}
          .headerConfig=${{ showHeader: true, title: 'Prompt suggestions' }}
          input-text=${inputText}
          @cds-aichat-autocomplete-select=${(e) =>
            action('cds-aichat-autocomplete-select')(e.detail)}
          @cds-aichat-autocomplete-send=${(e) =>
            action('cds-aichat-autocomplete-send')(e.detail)}
          @cds-aichat-autocomplete-dismiss=${() =>
            action(
              'cds-aichat-autocomplete-dismiss'
            )()}></cds-aichat-autocomplete>
      </div>
    `;
  },
};

export const WithCategories = {
  render: ({ inputText, disableDirectSend, attached }) => {
    const query = inputText || '';
    const filteredGroups = filterSuggestionGroups(
      suggestionGroupsWithAvatars,
      query
    );

    return html`
      <div style="width: 320px;">
        <cds-aichat-autocomplete
          style="--cds-aichat-autocomplete-max-height: 328px;"
          .groups=${filteredGroups}
          ?attached=${attached}
          ?disable-direct-send=${disableDirectSend}
          input-text=${inputText}
          @cds-aichat-autocomplete-select=${(e) =>
            action('cds-aichat-autocomplete-select')(e.detail)}
          @cds-aichat-autocomplete-send=${(e) =>
            action('cds-aichat-autocomplete-send')(e.detail)}
          @cds-aichat-autocomplete-dismiss=${() =>
            action(
              'cds-aichat-autocomplete-dismiss'
            )()}></cds-aichat-autocomplete>
      </div>
    `;
  },
};

export const WithDisabledItems = {
  render: ({ inputText, disableDirectSend, attached }) => {
    const mixedItems = [
      {
        id: 'suggestion-1',
        label: 'When is the best time to eat?',
      },
      {
        id: 'suggestion-2',
        label: 'When is the sun rising today?',
        disabled: true,
      },
      {
        id: 'suggestion-3',
        label: 'When is the sun setting today?',
      },
      {
        id: 'suggestion-4',
        label: 'When is the start of Spring?',
        disabled: true,
      },
      {
        id: 'suggestion-5',
        label: 'When is the next full moon?',
      },
    ];

    return html`
      <div style="width: 320px;">
        <cds-aichat-autocomplete
          style="--cds-aichat-autocomplete-max-height: 328px;"
          .items=${mixedItems}
          ?attached=${attached}
          ?disable-direct-send=${disableDirectSend}
          input-text=${inputText}
          @cds-aichat-autocomplete-select=${(e) =>
            action('cds-aichat-autocomplete-select')(e.detail)}
          @cds-aichat-autocomplete-send=${(e) =>
            action('cds-aichat-autocomplete-send')(e.detail)}
          @cds-aichat-autocomplete-dismiss=${() =>
            action(
              'cds-aichat-autocomplete-dismiss'
            )()}></cds-aichat-autocomplete>
      </div>
    `;
  },
};

export const Detached = {
  args: {
    attached: false,
  },
  render: ({ inputText, disableDirectSend, attached }) => {
    const query = inputText || '';
    const filteredItems = filterSuggestions(flatSuggestions, query);

    return html`
      <div style="width: 671px;">
        <cds-aichat-autocomplete
          style="--cds-aichat-autocomplete-max-height: 328px;"
          .items=${filteredItems}
          ?disable-direct-send=${disableDirectSend}
          input-text=${inputText}
          ?attached=${attached}
          @cds-aichat-autocomplete-select=${(e) =>
            action('cds-aichat-autocomplete-select')(e.detail)}
          @cds-aichat-autocomplete-send=${(e) =>
            action('cds-aichat-autocomplete-send')(e.detail)}
          @cds-aichat-autocomplete-dismiss=${() =>
            action(
              'cds-aichat-autocomplete-dismiss'
            )()}></cds-aichat-autocomplete>
      </div>
    `;
  },
};
