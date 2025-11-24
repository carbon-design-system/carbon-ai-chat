/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/code-snippet";
import "../src/code-snippet-tile-container";
import { html, LitElement } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";

const multilineCode = `/**
 * Carbon highlight showcase: control keywords, types, literals, doc comments, and more.
 * Designers can compare against https://carbondesignsystem.com
 */
import type { PaletteDefinition } from "./tokens";
import { readFile } from "fs/promises";

/**
 * Custom decorator to exercise meta/annotation styling.
 */
function Showcase(): ClassDecorator {
  return (target) => Reflect.defineMetadata?.("showcase", true, target);
}

type Nullable<T> = T | null | undefined;

interface TokenSwatch {
  readonly name: string;
  readonly hex: string;
  emphasis?: "strong" | "emphasis" | "strikethrough";
  notes?: string;
}

enum TokenGroup {
  Keyword = "keyword",
  Variable = "variable",
  String = "string",
  Number = "number",
  Comment = "comment",
}

namespace Guides {
  export const headings = [
    "# Heading One",
    "## Heading Two",
    "### Heading Three",
    "#### Heading Four",
    "##### Heading Five",
    "###### Heading Six",
  ] as const;

  export const markdown = [
    "> Quote with *emphasis*, **strong text**, \`code\`, and [link](https://example.com).",
    "- Bullet item",
    "1. Ordered item",
    "---",
    "~~Strikethrough~~ remains supported.",
  ];
}

@Showcase()
export class TokenShowcase<T extends TokenSwatch> {
  static readonly version = "1.0.0";
  static readonly palette: Record<TokenGroup, string> = {
    [TokenGroup.Keyword]: "--cds-syntax-keyword",
    [TokenGroup.Variable]: "--cds-syntax-variable",
    [TokenGroup.String]: "--cds-syntax-string",
    [TokenGroup.Number]: "--cds-syntax-number",
    [TokenGroup.Comment]: "--cds-syntax-comment",
  };

  #pattern = /--cds-syntax-[a-z-]+/g;
  #cache = new Map<string, T>();
  private url = new URL("https://carbon.design/components/code-snippet");
  private pending: Nullable<Promise<void>> = null;

  constructor(private readonly theme: PaletteDefinition, private mutable = false) {
    if (mutable && theme.allowOverrides === false) {
      throw new Error("Mutable showcase requires override permission.");
    }
  }

  /* multi-line
     comment demonstrating block syntax */

  async hydrate(path: string): Promise<void> {
    const file = await readFile(path, { encoding: "utf-8" });
    const matches = file.match(this.#pattern) ?? [];
    matches.forEach((token, index) => {
      const swatch = {
        name: token,
        hex: this.theme.tokens[token] ?? "#000000",
        notes: Guides.headings[index % Guides.headings.length],
      } as T;
      this.#cache.set(token, swatch);
    });
  }

  annotate(entry: T): void {
    const local = { ...entry, local: true } as T & { local: boolean };
    this.#cache.set(entry.name, local);
  }

  resolve(name: string): Nullable<T> {
    if (!this.#cache.has(name)) {
      return null;
    }
    const result = this.#cache.get(name) ?? null;
    return result && { ...result };
  }

  renderMarkdown(): string {
    const parts = [...Guides.headings, ...Guides.markdown];
    return parts.join("\\n");
  }

  toJSON(): Record<string, unknown> {
    return {
      url: this.url.href,
      version: TokenShowcase.version,
      mutable: this.mutable,
      tokens: Array.from(this.#cache.keys()),
      palette: TokenShowcase.palette,
    };
  }

  get summary(): string {
    return \`Loaded \${this.#cache.size} tokens for \${this.theme.name} (#\${this.theme.revision})\`;
  }
}

// trailing comment with TODO inside to exercise single-line states
`;

// Helper function to render with or without tile container
const renderSnippet = (args, code) => {
  if (args.useTileContainer) {
    return html`
      <cds-aichat-code-snippet-tile-container
        ?editable=${args.editable}
        ?highlight=${args.highlight}
        ?disabled=${args.disabled}
        ?hide-copy-button=${args.hideCopyButton}
        ?wrap-text=${args.wrapText}
        max-collapsed-number-of-rows=${ifDefined(args.maxCollapsedNumberOfRows)}
        max-expanded-number-of-rows=${ifDefined(args.maxExpandedNumberOfRows)}
        min-collapsed-number-of-rows=${ifDefined(args.minCollapsedNumberOfRows)}
        min-expanded-number-of-rows=${ifDefined(args.minExpandedNumberOfRows)}
        show-more-text=${ifDefined(args.showMoreText)}
        show-less-text=${ifDefined(args.showLessText)}
        tooltip-content=${ifDefined(args.tooltipContent)}
        feedback=${ifDefined(args.feedback)}
      >
        ${code}
      </cds-aichat-code-snippet-tile-container>
    `;
  }

  return html`
    <cds-aichat-code-snippet
      ?editable=${args.editable}
      ?highlight=${args.highlight}
      ?disabled=${args.disabled}
      ?hide-copy-button=${args.hideCopyButton}
      ?wrap-text=${args.wrapText}
      max-collapsed-number-of-rows=${ifDefined(args.maxCollapsedNumberOfRows)}
      max-expanded-number-of-rows=${ifDefined(args.maxExpandedNumberOfRows)}
      min-collapsed-number-of-rows=${ifDefined(args.minCollapsedNumberOfRows)}
      min-expanded-number-of-rows=${ifDefined(args.minExpandedNumberOfRows)}
      show-more-text=${ifDefined(args.showMoreText)}
      show-less-text=${ifDefined(args.showLessText)}
      tooltip-content=${ifDefined(args.tooltipContent)}
      feedback=${ifDefined(args.feedback)}
    >
      ${code}
    </cds-aichat-code-snippet>
  `;
};

export default {
  title: "Components/Code Snippet",
  argTypes: {
    useTileContainer: {
      control: "boolean",
      description: "Wrap in tile container",
      table: {
        category: "Wrapper",
      },
    },
    highlight: {
      control: "boolean",
      description: "Enable syntax highlighting",
    },
    editable: {
      control: "boolean",
      description: "Enable editing",
    },
    disabled: {
      control: "boolean",
      description: "Disable the snippet",
    },
    hideCopyButton: {
      control: "boolean",
      description: "Hide the copy button",
    },
    wrapText: {
      control: "boolean",
      description: "Wrap text instead of scrolling",
    },
    maxCollapsedNumberOfRows: {
      control: "number",
      description: "Maximum rows when collapsed",
    },
    maxExpandedNumberOfRows: {
      control: "number",
      description: "Maximum rows when expanded (0 = unlimited)",
    },
    minCollapsedNumberOfRows: {
      control: "number",
      description: "Minimum rows when collapsed",
    },
    minExpandedNumberOfRows: {
      control: "number",
      description: "Minimum rows when expanded",
    },
    showMoreText: {
      control: "text",
      description: "Text for expand button",
    },
    showLessText: {
      control: "text",
      description: "Text for collapse button",
    },
    tooltipContent: {
      control: "text",
      description: "Tooltip text for copy button",
    },
    feedback: {
      control: "text",
      description: "Feedback text after copying",
    },
  },
};

export const Default = {
  args: {
    useTileContainer: true,
    highlight: false,
    editable: false,
    disabled: false,
    hideCopyButton: false,
    wrapText: false,
    maxCollapsedNumberOfRows: 15,
    showMoreText: "Show more",
    showLessText: "Show less",
  },
  render: (args) => renderSnippet(args, multilineCode),
};

export const Highlight = {
  args: {
    useTileContainer: true,
    highlight: true,
    editable: false,
    disabled: false,
    hideCopyButton: false,
    wrapText: false,
    maxCollapsedNumberOfRows: 15,
    showMoreText: "Show more",
    showLessText: "Show less",
  },
  render: (args) => renderSnippet(args, multilineCode),
};

class StreamingDemo extends LitElement {
  static properties = {
    useTileContainer: { type: Boolean },
    language: { type: String },
    editable: { type: Boolean },
    highlight: { type: Boolean },
    disabled: { type: Boolean },
    hideCopyButton: { type: Boolean },
    wrapText: { type: Boolean },
    streamedContent: { type: String },
  };

  constructor() {
    super();
    this.useTileContainer = true;
    this.editable = false;
    this.highlight = true;
    this.disabled = false;
    this.hideCopyButton = false;
    this.wrapText = false;
    this.streamedContent = "";
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
    // Clear any existing interval first
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
    }

    let charIndex = 0;
    this.streamedContent = "";

    this.streamInterval = window.setInterval(() => {
      if (charIndex < multilineCode.length) {
        this.streamedContent += multilineCode[charIndex];
        charIndex++;
        this.requestUpdate();
      } else {
        if (this.streamInterval) {
          clearInterval(this.streamInterval);
        }
      }
    }, 20);
  }

  render() {
    const snippetContent = this.useTileContainer
      ? html`
          <cds-aichat-code-snippet-tile-container
            language=${this.language}
            ?editable=${this.editable}
            ?highlight=${this.highlight}
            ?disabled=${this.disabled}
            ?hide-copy-button=${this.hideCopyButton}
            ?wrap-text=${this.wrapText}
          >
            ${this.streamedContent}
          </cds-aichat-code-snippet-tile-container>
        `
      : html`
          <cds-aichat-code-snippet
            language=${this.language}
            ?editable=${this.editable}
            ?highlight=${this.highlight}
            ?disabled=${this.disabled}
            ?hide-copy-button=${this.hideCopyButton}
            ?wrap-text=${this.wrapText}
          >
            ${this.streamedContent}
          </cds-aichat-code-snippet>
        `;

    return html`
      <div>
        <button
          @click=${() => this.startStreaming()}
          style="margin-bottom: 1rem; padding: 0.5rem 1rem; cursor: pointer;"
        >
          Restart Streaming
        </button>
        ${snippetContent}
      </div>
    `;
  }
}

customElements.define("streaming-demo", StreamingDemo);

export const StreamingWithLanguageDetection = {
  args: {
    useTileContainer: true,
    highlight: true,
    editable: false,
    disabled: false,
    hideCopyButton: false,
    wrapText: false,
  },
  render: (args) => html`
    <streaming-demo
      ?use-tile-container=${args.useTileContainer}
      language=${args.language}
      ?editable=${args.editable}
      ?highlight=${args.highlight}
      ?disabled=${args.disabled}
      ?hide-copy-button=${args.hideCopyButton}
      ?wrap-text=${args.wrapText}
    ></streaming-demo>
  `,
};

export const StreamingWithLanguageSet = {
  args: {
    useTileContainer: true,
    language: "typescript",
    highlight: true,
    editable: false,
    disabled: false,
    hideCopyButton: false,
    wrapText: false,
  },
  render: (args) => html`
    <streaming-demo
      ?use-tile-container=${args.useTileContainer}
      language=${args.language}
      ?editable=${args.editable}
      ?highlight=${args.highlight}
      ?disabled=${args.disabled}
      ?hide-copy-button=${args.hideCopyButton}
      ?wrap-text=${args.wrapText}
    ></streaming-demo>
  `,
};

export const WithNoTileContainer = {
  args: {
    useTileContainer: false,
    highlight: true,
    editable: false,
    disabled: false,
    hideCopyButton: false,
    wrapText: false,
    maxCollapsedNumberOfRows: 15,
    showMoreText: "Show more",
    showLessText: "Show less",
  },
  render: (args) => renderSnippet(args, multilineCode),
};

export const Editable = {
  args: {
    useTileContainer: false,
    highlight: true,
    editable: true,
    disabled: false,
    hideCopyButton: false,
    wrapText: false,
  },
  render: (args) => renderSnippet(args, multilineCode),
};

export const EditableEmpty = {
  args: {
    useTileContainer: false,
    highlight: true,
    editable: true,
    disabled: false,
    hideCopyButton: false,
    wrapText: false,
  },
  render: (args) => renderSnippet(args, ""),
};
