/* eslint-disable */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Markdown from "../../../react/markdown";

const comprehensiveMarkdown = `# Markdown Rendering Demo

This component supports ==comprehensive markdown rendering== with extended features. Visit the [Carbon Design System](https://carbondesignsystem.com){{target=_blank rel=noopener}} for more information.

## Text Formatting

The component supports **bold text**, *italic text*, \`inline code\`, ~~strikethrough~~, and ==highlighted text==.

You can combine formatting: ==**bold highlight**== and ==*italic highlight*==.

> This is a blockquote with **bold text** and *emphasis*.
> It can span multiple lines and include other formatting.

## Links
URL like structures will be auto-linked like https://ibm.com or ibm.com.

Also, Markdown links are supported like [Carbon Design System](https://carbondesignsystem.com).

By default links open in a new window, you can make them open in the same window by adding \`{{target=_self}}\` to the URL [Carbon Design System](https://carbondesignsystem.com){{target=_self}}.

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
class DataProcessor:
    """A comprehensive data processing class with multiple methods."""
    
    def __init__(self, data):
        self.data = data
        self.processed = False
    
    def validate_data(self):
        """Validate input data before processing."""
        if not isinstance(self.data, list):
            raise TypeError("Data must be a list")
        if len(self.data) == 0:
            raise ValueError("Data cannot be empty")
        return True
    
    def clean_data(self):
        """Remove None values and duplicates from data."""
        cleaned = [x for x in self.data if x is not None]
        return list(set(cleaned))
    
    def sort_data(self, reverse=False):
        """Sort data in ascending or descending order."""
        return sorted(self.clean_data(), reverse=reverse)
    
    def filter_data(self, condition):
        """Filter data based on a condition function."""
        return [x for x in self.clean_data() if condition(x)]
    
    def process(self):
        """Main processing pipeline."""
        self.validate_data()
        cleaned = self.clean_data()
        sorted_data = sorted(cleaned)
        self.processed = True
        return sorted_data

# Example usage
processor = DataProcessor([3, 6, 8, 10, 1, 2, 1, None, 5])
result = processor.process()
print(f"Processed data: {result}")
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

const chunkMarkdownBySpaces = (markdown) => {
  const chunks = [];
  let currentChunk = "";
  let spaceCount = 0;

  for (let i = 0; i < markdown.length; i += 1) {
    const char = markdown[i];
    currentChunk += char;

    if (char === " ") {
      spaceCount += 1;
      if (spaceCount === 3) {
        chunks.push(currentChunk);
        currentChunk = "";
        spaceCount = 0;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
};

const StreamingMarkdownDemo = () => {
  const [streamedContent, setStreamedContent] = useState("");
  const [streaming, setStreaming] = useState(true);
  const intervalRef = useRef(null);

  const chunks = useMemo(
    () => chunkMarkdownBySpaces(comprehensiveMarkdown),
    [],
  );

  const clearExistingInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startStreaming = useCallback(() => {
    clearExistingInterval();
    setStreamedContent("");
    setStreaming(true);

    let chunkIndex = 0;

    intervalRef.current = setInterval(() => {
      if (chunkIndex < chunks.length) {
        const chunk = chunks[chunkIndex];
        // Safety check: ensure chunk is not undefined to prevent "undefined" string in output
        if (chunk !== undefined) {
          setStreamedContent((prev) => prev + chunk);
        }
        chunkIndex += 1;
      } else {
        clearExistingInterval();
        setStreaming(false);
      }
    }, 50);
  }, [chunks, clearExistingInterval]);

  useEffect(() => {
    startStreaming();
    return () => clearExistingInterval();
  }, [startStreaming, clearExistingInterval]);

  return (
    <div>
      <div style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={startStreaming}
          style={{
            padding: "0.5rem 1rem",
            cursor: "pointer",
            marginRight: "0.5rem",
          }}
        >
          Restart Streaming
        </button>
      </div>
      <Markdown streaming={streaming} markdown={streamedContent} />
    </div>
  );
};

export default {
  title: "Components/Markdown",
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
  args: {
    markdown: comprehensiveMarkdown,
    streaming: false,
    sanitizeHTML: false,
    removeHTML: false,
    highlight: true,
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
};

export const Default = {
  render: (args) => <Markdown {...args} markdown={args.markdown} />,
};

export const Streaming = {
  args: {
    markdown: "",
  },
  argTypes: {
    markdown: {
      table: {
        disable: true,
      },
    },
  },
  render: () => <StreamingMarkdownDemo />,
};

export const WithHTMLSanitization = {
  args: {
    markdown: htmlSanitizationMarkdown,
    streaming: false,
    sanitizeHTML: true,
    removeHTML: false,
    highlight: true,
  },
  render: (args) => (
    <div>
      <p
        style={{
          marginBottom: "1rem",
          padding: "0.5rem",
          background: "#f4f4f4",
        }}
      >
        <strong>Note:</strong> With <code>sanitize-html</code> enabled,
        dangerous HTML like <code>&lt;script&gt;</code> tags and{" "}
        <code>onclick</code> attributes are removed while safe HTML is
        preserved.
      </p>
      <Markdown {...args} markdown={args.markdown} />
    </div>
  ),
};

export const WithHTMLRemoval = {
  args: {
    markdown: htmlSanitizationMarkdown,
    streaming: false,
    sanitizeHTML: false,
    removeHTML: true,
    highlight: true,
  },
  render: (args) => (
    <div>
      <p
        style={{
          marginBottom: "1rem",
          padding: "0.5rem",
          background: "#f4f4f4",
        }}
      >
        <strong>Note:</strong> With <code>remove-html</code> enabled, all HTML
        tags are stripped, leaving only plain text and markdown.
      </p>
      <Markdown {...args} markdown={args.markdown} />
    </div>
  ),
};

export const WithoutHighlighting = {
  args: {
    markdown: comprehensiveMarkdown,
    streaming: false,
    sanitizeHTML: false,
    removeHTML: false,
    highlight: false,
  },
  render: (args) => <Markdown {...args} markdown={args.markdown} />,
};
