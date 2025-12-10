/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/markdown";
import { html, LitElement } from "lit";

const comprehensiveMarkdown = `# Markdown Rendering Demo

This component supports ==comprehensive markdown rendering== with extended features. Visit the [Carbon Design System](https://carbondesignsystem.com){{target=_blank rel=noopener}} for more information.

## Text Formatting

The component supports **bold text**, *italic text*, \`inline code\`, ~~strikethrough~~, and ==highlighted text==.

You can combine formatting: ==**bold highlight**== and ==*italic highlight*==.

> This is a blockquote with **bold text** and *emphasis*.
> It can span multiple lines and include other formatting.

## Lists

Unordered lists:
- Item one
- Item two
  - Nested item
  - Another nested item
- Item three

Ordered lists:
1. First item
2. Second item
3. Third item
---

## Code Examples

### JavaScript

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // Output: 55
\`\`\`

### Python

\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

print(quicksort([3, 6, 8, 10, 1, 2, 1]))
\`\`\`

### Inline Code

Use \`npm install\` to install dependencies and \`npm run build\` to build the project.

## Data Tables

### Sales Report 2024

| Month | Revenue | Units Sold | Growth |
|-------|---------|------------|--------|
| January | $127,000 | 4,832 | +12% |
| February | $143,000 | 5,123 | +15% |
| March | $156,000 | 5,477 | +18% |
| April | $168,000 | 5,892 | +21% |
| May | $175,000 | 6,234 | +23% |
| June | $182,000 | 6,543 | +25% |
| July | $191,000 | 6,821 | +28% |
| August | $198,000 | 7,012 | +30% |
| September | $205,000 | 7,234 | +32% |
| October | $213,000 | 7,456 | +34% |
| November | $221,000 | 7,689 | +36% |
| December | $235,000 | 7,923 | +38% |
| **Total** | **$2,214,000** | **79,236** | **+25%** |


## Custom attributes

Attributes supported: (\`target\`, \`rel\`, \`class\`, \`id\`)

### Header with custom id{{id=extended-links}}

[Open in current tab](https://carbondesignsystem.com){{target=_self}}`;

const htmlSanitizationMarkdown = `# HTML Content Handling

This component can handle HTML content in different ways:

## With Sanitization

When \`sanitize-html\` is enabled, potentially dangerous HTML is removed:

<p style="color: blue;">This paragraph has inline styles (safe).</p>

<script>alert('This would be removed')</script>

<a href="https://example.com" onclick="alert('dangerous')">This link is safe, but onclick is removed</a>

## Emphasis with HTML

You can use <strong>strong tags</strong> and <em>emphasis tags</em> alongside **markdown bold** and *markdown italic*.

## Mixed Content

Regular markdown works fine:
- List item with <code>HTML code tag</code>
- List item with \`markdown code\`

<blockquote>HTML blockquote</blockquote>

> Markdown blockquote`;

class StreamingDemo extends LitElement {
  static properties = {
    streamedContent: { type: String },
    streaming: { type: Boolean },
    isComplete: { type: Boolean },
  };

  constructor() {
    super();
    this.streamedContent = "";
    this.streaming = true;
    this.isComplete = false;
    this.streamInterval = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.startStreaming();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
    }
  }

  startStreaming() {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
    }

    // Split content into chunks based on every 3 spaces
    const chunks = [];
    let currentChunk = "";
    let spaceCount = 0;

    for (let i = 0; i < comprehensiveMarkdown.length; i++) {
      const char = comprehensiveMarkdown[i];
      currentChunk += char;

      if (char === " ") {
        spaceCount++;
        if (spaceCount === 3) {
          chunks.push(currentChunk);
          currentChunk = "";
          spaceCount = 0;
        }
      }
    }

    // Add any remaining content as the last chunk
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    let chunkIndex = 0;
    this.streamedContent = "";
    this.isComplete = false;

    this.streamInterval = window.setInterval(() => {
      if (chunkIndex < chunks.length) {
        this.streamedContent += chunks[chunkIndex];
        chunkIndex++;
        this.requestUpdate();
      } else {
        if (this.streamInterval) {
          clearInterval(this.streamInterval);
          this.isComplete = true;
        }
      }
    }, 50);
  }

  render() {
    return html`
      <div>
        <div style="margin-bottom: 1rem;">
          <button
            @click=${() => this.startStreaming()}
            style="padding: 0.5rem 1rem; cursor: pointer; margin-right: 0.5rem;"
          >
            Restart Streaming
          </button>
        </div>
        <cds-aichat-markdown ?streaming=${this.streaming}>
          ${this.streamedContent}
        </cds-aichat-markdown>
      </div>
    `;
  }
}

customElements.define("streaming-markdown-demo", StreamingDemo);

export default {
  title: "Components/Markdown",
  component: "cds-aichat-markdown",
  argTypes: {
    markdown: {
      control: "text",
      description: "Markdown content to render",
    },
    streaming: {
      control: "boolean",
      description: "Enable streaming mode for progressive rendering",
    },
    sanitizeHTML: {
      control: "boolean",
      description: "Sanitize HTML content using DOMPurify",
    },
    removeHTML: {
      control: "boolean",
      description: "Remove all HTML tags",
    },
    highlight: {
      control: "boolean",
      description: "Enable syntax highlighting for code blocks",
    },
    debug: {
      control: "boolean",
      description: "Enable debug logging",
    },
    feedback: {
      control: "text",
      description: "Feedback text for code copy",
    },
    tooltipContent: {
      control: "text",
      description: "Tooltip text for copy button",
    },
    showMoreText: {
      control: "text",
      description: "Text for expand button",
    },
    showLessText: {
      control: "text",
      description: "Text for collapse button",
    },
    filterPlaceholderText: {
      control: "text",
      description: "Placeholder for table filter",
    },
    previousPageText: {
      control: "text",
      description: "Previous page button text",
    },
    nextPageText: {
      control: "text",
      description: "Next page button text",
    },
    itemsPerPageText: {
      control: "text",
      description: "Items per page label",
    },
    locale: {
      control: "text",
      description: "Locale for number formatting",
    },
  },
};

export const Default = {
  args: {
    markdown: comprehensiveMarkdown,
    streaming: false,
    sanitizeHTML: false,
    removeHTML: false,
    highlight: true,
    debug: false,
    feedback: "Copied!",
    tooltipContent: "Copy code",
    showMoreText: "Show more",
    showLessText: "Show less",
    filterPlaceholderText: "Filter table...",
    previousPageText: "Previous page",
    nextPageText: "Next page",
    itemsPerPageText: "Items per page:",
    locale: "en",
  },
  render: (args) => html`
    <cds-aichat-markdown
      ?streaming=${args.streaming}
      ?sanitize-html=${args.sanitizeHTML}
      ?remove-html=${args.removeHTML}
      ?highlight=${args.highlight}
      ?debug=${args.debug}
      feedback=${args.feedback}
      tooltip-content=${args.tooltipContent}
      show-more-text=${args.showMoreText}
      show-less-text=${args.showLessText}
      filter-placeholder-text=${args.filterPlaceholderText}
      previous-page-text=${args.previousPageText}
      next-page-text=${args.nextPageText}
      items-per-page-text=${args.itemsPerPageText}
      locale=${args.locale}
    >
      ${args.markdown}
    </cds-aichat-markdown>
  `,
};

export const Streaming = {
  args: {},
  render: () => html` <streaming-markdown-demo></streaming-markdown-demo> `,
};

export const WithHTMLSanitization = {
  args: {
    markdown: htmlSanitizationMarkdown,
    streaming: false,
    sanitizeHTML: true,
    removeHTML: false,
    highlight: true,
    debug: false,
  },
  render: (args) => html`
    <div>
      <p style="margin-bottom: 1rem; padding: 0.5rem; background: #f4f4f4;">
        <strong>Note:</strong> With \`sanitize-html\` enabled, dangerous HTML
        like \`&lt;script&gt;\` tags and \`onclick\` attributes are removed
        while safe HTML is preserved.
      </p>
      <cds-aichat-markdown
        ?streaming=${args.streaming}
        ?sanitize-html=${args.sanitizeHTML}
        ?remove-html=${args.removeHTML}
        .highlight=${args.highlight}
        ?debug=${args.debug}
      >
        ${args.markdown}
      </cds-aichat-markdown>
    </div>
  `,
};

export const WithHTMLRemoval = {
  args: {
    markdown: htmlSanitizationMarkdown,
    streaming: false,
    sanitizeHTML: false,
    removeHTML: true,
    highlight: true,
    debug: false,
  },
  render: (args) => html`
    <div>
      <p style="margin-bottom: 1rem; padding: 0.5rem; background: #f4f4f4;">
        <strong>Note:</strong> With \`remove-html\` enabled, all HTML tags are
        stripped, leaving only plain text and markdown.
      </p>
      <cds-aichat-markdown
        ?streaming=${args.streaming}
        ?sanitize-html=${args.sanitizeHTML}
        ?remove-html=${args.removeHTML}
        .highlight=${args.highlight}
        ?debug=${args.debug}
      >
        ${args.markdown}
      </cds-aichat-markdown>
    </div>
  `,
};

export const WithoutHighlighting = {
  args: {
    markdown: comprehensiveMarkdown,
    streaming: false,
    sanitizeHTML: false,
    removeHTML: false,
    highlight: false,
    debug: true,
  },
  render: (args) => html`
    <div>
      <cds-aichat-markdown
        ?streaming=${args.streaming}
        ?sanitize-html=${args.sanitizeHTML}
        ?remove-html=${args.removeHTML}
        .highlight=${args.highlight}
        ?debug=${args.debug}
      >
        ${args.markdown}
      </cds-aichat-markdown>
    </div>
  `,
};
