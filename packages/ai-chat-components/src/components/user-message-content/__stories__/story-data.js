/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// A saved prompt-line document: text, a mention chip, and a host-owned node.
// The widget is the sixth child (index 5), so its slot is `${prefix}::0.5`.
export const sampleContent = {
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
        { type: 'text', text: ' to ' },
        { type: 'text', text: '**review**' },
        { type: 'text', text: ' ' },
        { type: 'widget', attrs: { id: 'chart-4', label: 'Chart 4' } },
        { type: 'text', text: ' by `Friday`.' },
      ],
    },
  ],
};
