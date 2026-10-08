/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

export interface CorpusExpectation {
  items: number;
  responses?: number;
  text: readonly string[];
  selectors?: readonly [string, number][];
}

const markdown: CorpusExpectation = {
  items: 1,
  text: ['Carbon is a', 'Activated carbon'],
};

const feedback: CorpusExpectation = {
  items: 1,
  text: [
    "We'd love to hear your thoughts on Carbon!",
    'Please use the feedback buttons below to share your opinion.',
  ],
};

const code: CorpusExpectation = {
  items: 1,
  text: [
    'from dataclasses import dataclass',
    '~~Strikethrough~~ remains supported.',
  ],
};

const table: CorpusExpectation = {
  items: 1,
  text: ['A periodic table in markdown format.', 'Neon'],
  selectors: [['cds-table-row', 15]],
};

const search: CorpusExpectation = {
  items: 1,
  text: [
    'Carbon was first recognized as an element by Antoine Lavoisier in 1789',
    'at the University of Manchester.',
  ],
};

const html: CorpusExpectation = {
  items: 1,
  text: [
    'Carbon (C) - The Element of Life',
    "Carbon's unique ability to form four bonds makes it the perfect element for complex biological molecules.",
  ],
};

const userDefined: CorpusExpectation = {
  items: 1,
  text: [
    'Some text that came from the server inside the user_defined object.',
    'Pastrami filet mignon salami, flank short loin t-bone tenderloin ribeye brisket.',
  ],
  selectors: [['.external', 1]],
};

const previewCard: CorpusExpectation = {
  items: 2,
  text: [
    'Here is a plan for optimizing excess inventory.',
    'Optimizing excess inventory',
  ],
};

export const RESPONSE_EXPECTATIONS: Record<string, CorpusExpectation> = {
  'audio - mp3': {
    items: 2,
    text: [
      "Here's a native mp3 file with transcript for accessibility:",
      'Your own mp3 file with transcript',
    ],
    selectors: [['.cds-aichat--media-player__root', 1]],
  },
  'audio - soundcloud': {
    items: 2,
    text: [
      "Here's an audio clip from SoundCloud:",
      'An audio clip from SoundCloud',
    ],
    selectors: [['.cds-aichat--media-player__root', 1]],
  },
  button: {
    items: 5,
    text: [
      'Fire a client side event',
      'Send a message to your server',
      'Open a panel',
      'Add a button that is a link',
    ],
  },
  card: {
    items: 4,
    text: [
      'Carbon Design System Component',
      'Carbon Component with max_width: WidthOptions.SMALL on card',
      'Carbon Component with max_width: WidthOptions.MEDIUM on card',
      'Carbon Component with max_width: WidthOptions.LARGE on card',
    ],
    selectors: [['.cds-aichat--card-message-component', 4]],
  },
  carousel: {
    items: 2,
    text: ['Peach Colored Blouse', 'Green Leopard Jacket', 'Yellow Wool Hat'],
    selectors: [['.cds-aichat--card-message-component', 3]],
  },
  code,
  'code (stream)': code,
  'conversational search': search,
  'conversational search (stream)': search,
  date: {
    items: 1,
    text: [],
    selectors: [['.cds-aichat--date-picker', 1]],
  },
  grid: {
    items: 9,
    text: [
      'Grid alignment example with max_width: WidthOptions.SMALL',
      'Grid alignment example with max_width: WidthOptions.MEDIUM',
      'Grid alignment example with max_width: WidthOptions.LARGE',
      'Using the grid to control the width of a single response type (Video set to SMALL here)',
    ],
    selectors: [
      ['.cds-aichat--grid', 4],
      ['.cds-aichat--grid__cell', 37],
      ['.cds-aichat--media-player__root', 1],
    ],
  },
  html: {
    ...html,
    items: 2,
    responses: 2,
    text: [...html.text, 'Carbon is bold!'],
  },
  'html (stream)': html,
  'human agent': { items: 1, text: ['Connect to agent'] },
  iframe: {
    items: 3,
    text: [
      'You can show an iframe either in a hero card that opens up a panel, or inline.',
      'IFrame example panel',
    ],
    selectors: [['iframe[title="An inline display of an iframe"]', 1]],
  },
  image: {
    items: 12,
    text: [
      'The image title (optional)',
      'The image description (optional)',
      'And now just an image by itself.',
      'This is a custom_event button:',
    ],
  },
  'option list': {
    items: 2,
    text: [
      'Select a response to view it in action (dropdown).',
      'Select a response to view it in action (button).',
    ],
  },
  'ordered list': {
    items: 1,
    text: ['Carbon bonding types', 'Metallic carbides'],
    selectors: [['cds-list-item', 4]],
  },
  'system message (inline)': {
    items: 4,
    responses: 3,
    text: ['This is a system message', 'Activated carbon'],
  },
  'system message (stand alone, agent variant)': {
    items: 4,
    responses: 4,
    text: [
      'Agent joined the chat',
      'This is a system message',
      'Activated carbon',
    ],
  },
  'system message (stand alone, date variant)': {
    items: 2,
    responses: 2,
    text: ['Monday, June 14th 2025', 'Activated carbon'],
  },
  'system message (stand alone, default variant)': {
    items: 2,
    responses: 2,
    text: ['This is a system message', 'Activated carbon'],
  },
  table,
  'table (stream)': table,
  text: markdown,
  'text (stream)': markdown,
  'text (delayed response)': markdown,
  'text (delayed streaming response)': markdown,
  'text from watsonx agent': markdown,
  'text from third party human': markdown,
  'text from third party bot': markdown,
  'text (stream) from third party bot': markdown,
  'text (stream) with reasoning steps': markdown,
  'text (stream) with single reasoning trace': markdown,
  'text with feedback': feedback,
  'text with feedback (stream)': feedback,
  'text (consecutive responses)': { ...feedback, items: 2, responses: 2 },
  'text (stream early resolve)': {
    items: 1,
    text: ['The button should only disappear after this final chunk arrives.'],
  },
  'text with chain of thought': {
    items: 1,
    text: [
      "Carbon's versatile bonding properties have been analyzed through multiple chemical databases to present this comprehensive overview.",
    ],
  },
  'text (stream) with chain of thought': {
    items: 1,
    text: [
      'various computational chemistry tools are querying molecular structures and periodic trends.',
    ],
  },
  'unordered list': {
    items: 1,
    text: ['Carbon allotropes', 'Graphene layers', 'Activated carbon'],
    selectors: [['cds-list-item', 12]],
  },
  user_defined: {
    ...userDefined,
    items: 2,
    text: [...userDefined.text, 'As full width'],
    selectors: [['.external', 2]],
  },
  'user_defined (stream)': userDefined,
  'video - youtube': {
    items: 2,
    text: ["Here's a video from YouTube:"],
    selectors: [['.cds-aichat--media-player__root', 1]],
  },
  'video - vimeo': {
    items: 2,
    text: ["Here's a video from Vimeo:"],
    selectors: [['.cds-aichat--media-player__root', 1]],
  },
  'video - kaltura': {
    items: 2,
    text: ["Here's a video from Kaltura", 'Generative Models Explained'],
    selectors: [['.cds-aichat--media-player__root', 1]],
  },
  'workspace preview card (open start)': previewCard,
  'workspace preview card (open end)': previewCard,
};
