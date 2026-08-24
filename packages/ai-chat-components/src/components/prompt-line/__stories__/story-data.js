/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Shared story data for Prompt line stories.
 *
 * Exports suggestion item datasets and dummy action definitions used across
 * the Default, Expanded, Commands & Mentions, Conversation Starters,
 * File Uploads, and Typeahead stories.
 */

import Book16 from '@carbon/icons/es/book/16.js';
import ChartLine16 from '@carbon/icons/es/chart--line/16.js';
import Database16 from '@carbon/icons/es/data--base/16.js';
import Help16 from '@carbon/icons/es/help/16.js';
import Person16 from '@carbon/icons/es/person/16.js';
import Document16 from '@carbon/icons/es/document/16.js';
import Language16 from '@carbon/icons/es/language/16.js';
import Idea16 from '@carbon/icons/es/idea/16.js';
import Edit16 from '@carbon/icons/es/edit/16.js';
import MagicWand16 from '@carbon/icons/es/magic-wand/16.js';
import Code16 from '@carbon/icons/es/code/16.js';
import Image16 from '@carbon/icons/es/image/16.js';
import Search16 from '@carbon/icons/es/search/16.js';
import Microphone16 from '@carbon/icons/es/microphone/16.js';
import Chat16 from '@carbon/icons/es/chat/16.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import { action } from 'storybook/actions';

// ---------------------------------------------------------------------------
// Avatar icons (WC-compatible, via iconLoader)
// ---------------------------------------------------------------------------
export const BookAvatarIcon = iconLoader(Book16);
export const ChartLineAvatarIcon = iconLoader(ChartLine16);
export const DatabaseAvatarIcon = iconLoader(Database16);
export const HelpAvatarIcon = iconLoader(Help16);
export const PersonAvatarIcon = iconLoader(Person16);
export const LanguageAvatarIcon = iconLoader(Language16);

// ---------------------------------------------------------------------------
// Mention items — team members with avatar icons
// ---------------------------------------------------------------------------
export const mentionItems = [
  {
    id: 'u1',
    label: 'Jane Smith',
    description: 'Design Lead',
    avatar: PersonAvatarIcon,
  },
  {
    id: 'u2',
    label: 'Bob Chen',
    description: 'Frontend Engineer',
    avatar: BookAvatarIcon,
  },
  {
    id: 'u3',
    label: 'Alice Park',
    description: 'Product Manager',
    avatar: ChartLineAvatarIcon,
  },
  {
    id: 'u4',
    label: 'Carlos Rivera',
    description: 'Backend Engineer',
    avatar: DatabaseAvatarIcon,
  },
  {
    id: 'u5',
    label: 'Dana Williams',
    description: 'QA Engineer',
    avatar: HelpAvatarIcon,
  },
];

// ---------------------------------------------------------------------------
// Command items — slash-commands with avatar icons
// ---------------------------------------------------------------------------
export const commandItems = [
  {
    id: 'summarize',
    label: 'summarize',
    description: 'Summarize the conversation',
    avatar: BookAvatarIcon,
  },
  {
    id: 'translate',
    label: 'translate',
    description: 'Translate to another language',
    avatar: LanguageAvatarIcon,
  },
  {
    id: 'clear',
    label: 'clear',
    description: 'Clear the conversation',
    avatar: DatabaseAvatarIcon,
  },
  {
    id: 'help',
    label: 'help',
    description: 'Show available commands',
    avatar: HelpAvatarIcon,
  },
];

// ---------------------------------------------------------------------------
// Starter items — conversation starters (static array)
// ---------------------------------------------------------------------------
export const starterItems = [
  { id: 'starter-1', label: 'Generate a chart for key metrics' },
  { id: 'starter-2', label: 'Convert my question into an SQL query' },
  { id: 'starter-3', label: 'Summarize recent High and Critical incidents' },
  { id: 'starter-4', label: 'Generate test data with similar schema' },
];

// ---------------------------------------------------------------------------
// Typeahead items — flat suggestions (no avatar, no description)
// ---------------------------------------------------------------------------
export const typeaheadItems = [
  { id: 'ta-1', label: 'When is the best time to eat?' },
  { id: 'ta-2', label: 'When is the sun rising today?' },
  { id: 'ta-3', label: 'When is the sun setting today?' },
  { id: 'ta-4', label: 'When is the start of Spring?' },
  { id: 'ta-5', label: 'When is the next full moon?' },
  { id: 'ta-6', label: 'When is the next lunar eclipse?' },
  { id: 'ta-7', label: 'When is the next solar eclipse?' },
];

// ---------------------------------------------------------------------------
// Dummy actions — mirrors the demo app's DEMO_MENU_OPTIONS
// Actions use action() so clicks appear in the Storybook Actions panel.
// ---------------------------------------------------------------------------
export const dummyActions = [
  {
    text: 'Summarize conversation',
    icon: Document16,
    onClick: () => action('dummy-action')('Summarize conversation'),
  },
  {
    text: 'Translate last message',
    icon: Language16,
    onClick: () => action('dummy-action')('Translate last message'),
  },
  {
    text: 'Brainstorm ideas',
    icon: Idea16,
    onClick: () => action('dummy-action')('Brainstorm ideas'),
  },
  {
    text: 'Refine my writing',
    icon: Edit16,
    onClick: () => action('dummy-action')('Refine my writing'),
  },
  {
    text: 'Suggest a follow-up',
    icon: MagicWand16,
    onClick: () => action('dummy-action')('Suggest a follow-up'),
  },
  {
    text: 'Explain this code',
    icon: Code16,
    onClick: () => action('dummy-action')('Explain this code'),
  },
  {
    text: 'Describe an image',
    icon: Image16,
    onClick: () => action('dummy-action')('Describe an image'),
  },
  {
    text: 'Search the web',
    icon: Search16,
    onClick: () => action('dummy-action')('Search the web'),
  },
  {
    text: 'Dictate a message',
    icon: Microphone16,
    onClick: () => action('dummy-action')('Dictate a message'),
  },
  {
    text: 'Start a new chat',
    icon: Chat16,
    onClick: () => action('dummy-action')('Start a new chat'),
  },
];

// ---------------------------------------------------------------------------
// Filter helper — used by Typeahead story
// ---------------------------------------------------------------------------
export const filterItems = (items, query) => {
  if (!query) {
    return items;
  }
  const lower = query.toLowerCase();
  return items.filter((item) => item.label.toLowerCase().includes(lower));
};
