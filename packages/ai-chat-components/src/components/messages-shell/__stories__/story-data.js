/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// Base class for the story-only styles in story-styles.scss.
export const storyClass = 'messages-shell-story';

// Labels for the scroll handles, shared by every story.
export const handleLabelArgs = {
  topHandleLabel: 'Start of messages.',
  bottomHandleLabel: 'End of messages.',
};

// Twelve rows, so the list is long enough to scroll. Every third row is from the user.
export const placeholderMessages = Array.from({ length: 12 }, (_, index) => {
  const type = index % 3 === 0 ? 'user' : 'assistant';
  const label = type === 'user' ? 'User message' : 'Assistant response';
  return { type, text: `${label} ${index + 1}` };
});
