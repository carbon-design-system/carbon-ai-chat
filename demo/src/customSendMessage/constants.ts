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

const CHAIN_OF_THOUGHT_TEXT = `This content has required making a lot of requests to tools to render.`;

const CHAIN_OF_THOUGHT_TEXT_STREAM = `This content has required making a lot of requests to tools to render. As this text is streaming in, different tool calls are being made to update what is coming back in the response.`;

const TABLE = `
| Lorem        | Ipsum      | Odor    | Amet      |
|--------------|------------|---------|-----------|
| consectetuer dddd ddddd ddddd | adipiscing | elit    | Venenatis |
| 0            | 1          | 2       | 3         |
| bibendum     | enim       | blandit | quis      |
| consectetuer | adipiscing | elit    | Venenatis |
| 4            | 5          | 6       | 7         |
| bibendum     | enim       | blandit | quis      |
| consectetuer | adipiscing | elit    | Venenatis |
| 8            | 9          | 10      | 11        |
| bibendum     | enim       | blandit | quis      |
| consectetuer | adipiscing | elit    | Venenatis |
| 12           | 13         | 14      | 15        |
| bibendum     | enim       | blandit | quis      |
| consectetuer | adipiscing | elit    | Venenatis |
| 16           | 17         | 18      | 19        |
| bibendum     | enim       | blandit | quis      |
| consectetuer | adipiscing | elit    | Venenatis |
| 20           | 21         | 22      | 23        |
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

const TEXT = `Lorem **bold text** *italics text* ipsum odor amet, consectetuer adipiscing elit. \`alert("inline code");\` aliquet non platea elementum morbi porta accumsan.

Quam [link with target blank](https://ibm.com) scelerisque platea [link with target self](https://ibm.com){{target="_self"}} sem placerat pharetra sed.

`;

const HEADERS = `
# Header 1 sized header
${TEXT}

## Header 2 sized header
${TEXT}

### Header 3 sized header
${TEXT}
`;

const CODE =
  "\n```python\n" +
  `import random

def generate_lorem_ipsum(paragraphs=1):
    # Base words for Lorem Ipsum
    lorem_words = (
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor "
        "incididunt ut labore et dolore magna aliqua."
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

const WORD_DELAY = 20;

export {
  CHAIN_OF_THOUGHT_TEXT_STREAM,
  CHAIN_OF_THOUGHT_TEXT,
  WELCOME_TEXT,
  TEXT,
  WORD_DELAY,
  TABLE,
  ORDERED_LIST,
  UNORDERED_LIST,
  CODE,
  BLOCKQUOTE,
  MARKDOWN,
};
