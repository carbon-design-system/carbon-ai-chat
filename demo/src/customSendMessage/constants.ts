/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

const WELCOME_TEXT = `Welcome to this example of a custom back-end.

This back-end is mocked entirely on the client side. It does **not** show all potential functionality.

You can type **help** to see this message again.`;

const TABLE = `
| Lorem        | Ipsum      | Odor    | Amet      |
|--------------|------------|---------|-----------|
| consectetuer | adipiscing | elit    | Venenatis |
| 0            | 1          | 2       | 3         |
| bibendum     | enim       | blandit | quis      |
| consectetuer | adipiscing | elit    | Venenatis |
| 0            | 1          | 2       | 3         |
| bibendum     | enim       | blandit | quis      |
| consectetuer | adipiscing | elit    | Venenatis |
| 0            | 1          | 2       | 3         |
| bibendum     | enim       | blandit | quis      |
`;

const UNORDERED_LIST = `
- consectetuer
- adipiscing
- elit
  - sublist
  - adipiscing
  - elit
  - Venenatis
- Venenatis
- consectetuer
- adipiscing
- elit
- Venenatis
`;

const ORDERED_LIST = `
1. consectetuer
  1. sub item 1
  2. sub item 2
2. adipiscing
3. elit
4. Venenatis
`;

const TEXT = `Lorem **bold text** *italics text* ipsum odor amet, consectetuer adipiscing elit. \`alert("inline code");\` aliquet non platea elementum morbi porta accumsan. Tortor libero consectetur dapibus volutpat porta vestibulum.

Quam [link with target blank](https://ibm.com) scelerisque platea [link with target self](https://ibm.com){{target="_self"}} sem placerat pharetra sed. Porttitor per massa venenatis fusce fusce ad cras. Vel congue semper, rhoncus tempus nisl nam. Purus molestie tristique diam himenaeos sapien lacus.

`;

const HEADERS = `
# Header 1
${TEXT}

## Header 2
${TEXT}

### Header 3
${TEXT}

#### Header 4
${TEXT}

##### Header 5
${TEXT}

###### Header 6
${TEXT}
`;

const CODE =
  "\n```python\n" +
  `import random

def generate_lorem_ipsum(paragraphs=1):
    # Base words for Lorem Ipsum
    lorem_words = (
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor "
        "incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud "
        "exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure "
        "dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. "
        "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt "
        "mollit anim id est laborum."
    ).split()
    
    # Function to generate a random sentence
    def random_sentence():
        sentence_length = random.randint(4, 12)
        sentence = random.sample(lorem_words, sentence_length)
        return " ".join(sentence).capitalize() + "."
    
    # Function to generate a paragraph
    def random_paragraph():
        sentence_count = random.randint(3, 6)
        return " ".join(random_sentence() for _ in range(sentence_count))
    
    # Generate the requested number of paragraphs
    return "\\n\\n".join(random_paragraph() for _ in range(paragraphs))

# Example usage
print(generate_lorem_ipsum(2))  # Generates 2 paragraphs of Lorem Ipsum text
` +
  "\n\n```";

const BLOCKQUOTE = `
> Lorem **bold text** *italics text* ipsum odor amet, consectetuer adipiscing elit. \`alert("inline code");\` aliquet non platea elementum morbi porta accumsan. Tortor libero consectetur dapibus volutpat porta vestibulum.
>
> Quam [link with target blank](https://ibm.com) scelerisque platea [link with target self](https://ibm.com){{target="_self"}} sem placerat pharetra sed. Porttitor per massa venenatis fusce fusce ad cras. Vel congue semper, rhoncus tempus nisl nam. Purus molestie tristique diam himenaeos sapien lacus.
 `;

const MARKDOWN = `
${TEXT}
---
${HEADERS}
---
${TABLE}
---
${BLOCKQUOTE}
---
${ORDERED_LIST}
---
${UNORDERED_LIST}
---
`;

// eslint-disable-next-line prefer-template, no-useless-concat
const MARKDOWN_WITH_SOURCE = MARKDOWN + "\n\n```\n" + MARKDOWN + "\n```";

const CHART_DATA = JSON.stringify({
  $schema: "https://vega.github.io/schema/vega-lite/v5.json",
  data: {
    values: [
      { category: "A", value: 20 },
      { category: "B", value: 40 },
      { category: "C", value: 60 },
    ],
  },
  mark: "bar",
  encoding: {
    x: { field: "category", type: "nominal", axis: { title: "Category" } },
    y: { field: "value", type: "quantitative", axis: { title: "Value" } },
  },
});

const WORD_DELAY = 50;

export {
  WELCOME_TEXT,
  TEXT,
  WORD_DELAY,
  CHART_DATA,
  TABLE,
  ORDERED_LIST,
  UNORDERED_LIST,
  CODE,
  BLOCKQUOTE,
  MARKDOWN,
};
