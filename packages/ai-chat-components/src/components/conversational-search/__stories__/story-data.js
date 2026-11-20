/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

export const citedAnswer =
  'Carbon provides reusable components, design tokens, and accessibility guidance for building consistent products.';

// Ranges index into citedAnswer.
export const citations = [
  {
    title: 'Carbon components',
    text: 'Carbon offers a library of reusable components built to the design system.',
    url: 'https://carbondesignsystem.com/components/overview/components/',
    ranges: [{ start: 16, end: 35 }],
  },
  {
    title: 'Design tokens',
    text: 'Tokens store the color, type, and spacing values that every Carbon component uses. Change a token, and every component that reads it follows. Themes swap token values so the same components render in light and dark modes without code changes. Use tokens instead of hard-coded values to keep your product in step with Carbon.',
    ranges: [{ start: 37, end: 50 }],
  },
  {
    title: 'Accessibility',
    text: 'Carbon components meet WCAG 2.1 AA.',
    ranges: [{ start: 56, end: 78 }],
  },
];

export const markdownBody =
  'Tokens store **color**, **type**, and **spacing** values.\n\n- Themes swap token values.\n- Components read tokens.';
