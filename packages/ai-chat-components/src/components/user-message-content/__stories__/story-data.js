/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// Text only. A document without chips or custom nodes renders as markdown.
export const textContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Please **review** the draft and send notes',
        },
      ],
    },
  ],
};

// Text with a mention chip. An unfilled slot shows the chip.
export const chipContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Ask ' },
        {
          type: 'mention',
          attrs: { id: 'u1', label: 'Jane Smith', value: 'Jane Smith' },
        },
        { type: 'text', text: ' to **review** the draft by Friday' },
      ],
    },
  ],
};

// A host-owned `tileChip` node, as in the prompt-line-custom-render example.
// The node is the second child of the first paragraph, so its slot is
// `${prefix}::0.1`.
export const tileChip = {
  label: 'Summarize thread',
  description: 'Condense the current conversation into a short recap.',
};

export const customNodeContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Run this action: ' },
        { type: 'tileChip', attrs: { ...tileChip } },
      ],
    },
  ],
};
