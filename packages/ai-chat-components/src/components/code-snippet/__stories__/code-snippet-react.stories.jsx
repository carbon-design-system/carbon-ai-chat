/* eslint-disable */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import CodeSnippet from "../../../react/code-snippet";
import Card from "../../../react/card";
import { Download, Share } from "@carbon/icons-react";
import { AILabel, AILabelContent } from "@carbon/react";

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

const renderSnippet = (args, code) => {
  const {
    useCard,
    highlight,
    editable,
    disabled,
    hideCopyButton,
    wrapText,
    maxCollapsedNumberOfRows,
    maxExpandedNumberOfRows,
    minCollapsedNumberOfRows,
    minExpandedNumberOfRows,
    showMoreText,
    showLessText,
    tooltipContent,
    feedback,
    language,
    defaultLanguage,
    onChange,
  } = args;

  const commonProps = {
    highlight,
    editable,
    disabled,
    hideCopyButton,
    wrapText,
  };

  if (typeof maxCollapsedNumberOfRows !== "undefined") {
    commonProps.maxCollapsedNumberOfRows = maxCollapsedNumberOfRows;
  }
  if (typeof maxExpandedNumberOfRows !== "undefined") {
    commonProps.maxExpandedNumberOfRows = maxExpandedNumberOfRows;
  }
  if (typeof minCollapsedNumberOfRows !== "undefined") {
    commonProps.minCollapsedNumberOfRows = minCollapsedNumberOfRows;
  }
  if (typeof minExpandedNumberOfRows !== "undefined") {
    commonProps.minExpandedNumberOfRows = minExpandedNumberOfRows;
  }
  if (typeof showMoreText !== "undefined") {
    commonProps.showMoreText = showMoreText;
  }
  if (typeof showLessText !== "undefined") {
    commonProps.showLessText = showLessText;
  }
  if (typeof tooltipContent !== "undefined") {
    commonProps.tooltipContent = tooltipContent;
  }
  if (typeof feedback !== "undefined") {
    commonProps.feedback = feedback;
  }
  if (typeof language !== "undefined") {
    commonProps.language = language;
  }
  if (typeof defaultLanguage !== "undefined") {
    commonProps.defaultLanguage = defaultLanguage;
  }
  if (typeof onChange !== "undefined") {
    commonProps.onChange = onChange;
  }

  const snippet = <CodeSnippet {...commonProps}>{code}</CodeSnippet>;

  return useCard ? (
    <Card isFlush>
      <div slot="body">{snippet}</div>
    </Card>
  ) : (
    snippet
  );
};

const chunkContent = (text) => Array.from(text);

const StreamingDemo = (args) => {
  const {
    useCard,
    highlight,
    editable,
    disabled,
    hideCopyButton,
    wrapText,
    language,
    defaultLanguage,
    maxCollapsedNumberOfRows,
    maxExpandedNumberOfRows,
    minCollapsedNumberOfRows,
    minExpandedNumberOfRows,
    showMoreText,
    showLessText,
    tooltipContent,
    feedback,
  } = args;

  const [streamedContent, setStreamedContent] = useState("");
  const intervalRef = useRef(null);
  const chunks = useMemo(() => chunkContent(multilineCode), []);

  const clearExistingInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startStreaming = useCallback(() => {
    clearExistingInterval();
    setStreamedContent("");

    let index = 0;
    intervalRef.current = setInterval(() => {
      if (index < chunks.length) {
        setStreamedContent((prev) => prev + chunks[index]);
        index += 1;
      } else {
        clearExistingInterval();
      }
    }, 20);
  }, [chunks, clearExistingInterval]);

  useEffect(() => {
    startStreaming();
    return () => clearExistingInterval();
  }, [startStreaming, clearExistingInterval]);

  const commonProps = {
    highlight,
    editable,
    disabled,
    hideCopyButton,
    wrapText,
  };

  if (typeof language !== "undefined") {
    commonProps.language = language;
  }
  if (typeof defaultLanguage !== "undefined") {
    commonProps.defaultLanguage = defaultLanguage;
  }
  if (typeof maxCollapsedNumberOfRows !== "undefined") {
    commonProps.maxCollapsedNumberOfRows = maxCollapsedNumberOfRows;
  }
  if (typeof maxExpandedNumberOfRows !== "undefined") {
    commonProps.maxExpandedNumberOfRows = maxExpandedNumberOfRows;
  }
  if (typeof minCollapsedNumberOfRows !== "undefined") {
    commonProps.minCollapsedNumberOfRows = minCollapsedNumberOfRows;
  }
  if (typeof minExpandedNumberOfRows !== "undefined") {
    commonProps.minExpandedNumberOfRows = minExpandedNumberOfRows;
  }
  if (typeof showMoreText !== "undefined") {
    commonProps.showMoreText = showMoreText;
  }
  if (typeof showLessText !== "undefined") {
    commonProps.showLessText = showLessText;
  }
  if (typeof tooltipContent !== "undefined") {
    commonProps.tooltipContent = tooltipContent;
  }
  if (typeof feedback !== "undefined") {
    commonProps.feedback = feedback;
  }

  const snippet = <CodeSnippet {...commonProps}>{streamedContent}</CodeSnippet>;

  return (
    <div>
      <button
        type="button"
        onClick={startStreaming}
        style={{
          marginBottom: "1rem",
          padding: "0.5rem 1rem",
          cursor: "pointer",
        }}
      >
        Restart Streaming
      </button>
      {useCard ? (
        <Card>
          <div slot="body">{snippet}</div>
        </Card>
      ) : (
        snippet
      )}
    </div>
  );
};

export default {
  title: "Components/Code snippet",
  argTypes: {
    useCard: {
      control: "boolean",
      description: "Wrap in Card",
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
    language: {
      control: "text",
      description: "Explicit language override",
    },
    defaultLanguage: {
      control: "text",
      description: "Default language used when detection fails",
    },
    onChange: {
      action: "onChange",
      table: { category: "events" },
      description:
        "Fires when editable content changes. `event.detail.value` contains the new string.",
    },
  },
  args: {
    onChange: undefined,
  },
};

export const Default = {
  args: {
    useCard: true,
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
    useCard: true,
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

export const StreamingWithLanguageDetection = {
  args: {
    useCard: true,
    highlight: true,
    editable: false,
    disabled: false,
    hideCopyButton: false,
    wrapText: false,
  },
  render: (args) => <StreamingDemo {...args} />,
};

export const StreamingWithLanguageSet = {
  args: {
    useCard: true,
    language: "typescript",
    highlight: true,
    editable: false,
    disabled: false,
    hideCopyButton: false,
    wrapText: false,
  },
  render: (args) => <StreamingDemo {...args} />,
};

export const WithNoCard = {
  args: {
    useCard: false,
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
    useCard: false,
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
    useCard: false,
    highlight: true,
    editable: true,
    disabled: false,
    hideCopyButton: false,
    wrapText: false,
  },
  render: (args) => renderSnippet(args, ""),
};

export const WithActions = {
  args: {
    useCard: true,
    highlight: true,
    editable: false,
    disabled: false,
    hideCopyButton: false,
    wrapText: false,
    maxCollapsedNumberOfRows: 15,
  },
  render: (args) => {
    const actions = [
      {
        text: "Download",
        icon: Download,
        onClick: () => console.log("Download clicked"),
      },
      {
        text: "Share",
        icon: Share,
        onClick: () => console.log("Share clicked"),
      },
    ];

    const snippet = (
      <CodeSnippet {...args} actions={actions} overflow>
        {multilineCode}
      </CodeSnippet>
    );

    return args.useCard ? (
      <Card>
        <div slot="body">{snippet}</div>
      </Card>
    ) : (
      snippet
    );
  },
};

export const WithActionsAndDecorator = {
  args: {
    useCard: true,
    highlight: true,
    editable: false,
    disabled: false,
    hideCopyButton: false,
    wrapText: false,
    maxCollapsedNumberOfRows: 15,
  },
  render: (args) => {
    const actions = [
      {
        text: "Download",
        icon: Download,
        onClick: () => console.log("Download clicked"),
      },
      {
        text: "Share",
        icon: Share,
        onClick: () => console.log("Share clicked"),
      },
    ];

    const snippet = (
      <CodeSnippet
        {...args}
        data-rounded={args.useCard}
        actions={actions}
        overflow
      >
        <AILabel size="2xs" autoalign alignment="bottom" slot="decorator">
          <AILabelContent>
            <div>This code was generated. Review carefully before use.</div>
          </AILabelContent>
        </AILabel>
        {multilineCode}
      </CodeSnippet>
    );

    return args.useCard ? (
      <Card>
        <div slot="body">{snippet}</div>
      </Card>
    ) : (
      snippet
    );
  },
};

export const WithFixedActions = {
  args: {
    useCard: false,
    highlight: true,
    editable: false,
    disabled: false,
    hideCopyButton: false,
    wrapText: false,
  },
  render: (args) => {
    const actions = [
      {
        text: "Download",
        icon: Download,
        onClick: () => console.log("Download clicked"),
      },
    ];

    return (
      <CodeSnippet {...args} actions={actions}>
        <div slot="fixed-actions">
          <button
            onClick={() => console.log("Fixed action clicked")}
            style={{
              padding: "0.5rem",
              cursor: "pointer",
              border: "1px solid #ccc",
              background: "transparent",
            }}
          >
            Fixed Action
          </button>
        </div>
        {multilineCode}
      </CodeSnippet>
    );
  },
};

const sqlCode = `-- Order Analytics Report
-- Analyzes purchasing patterns and outstanding orders

WITH customer_orders AS (
  SELECT
    c.customer_id,
    c.customer_name,
    c.email,
    c.region,
    COUNT(DISTINCT o.order_id) as total_orders,
    SUM(o.total_amount) as total_spent,
    AVG(o.total_amount) as avg_order_value,
    MAX(o.order_date) as last_order_date
  FROM customers c
  LEFT JOIN orders o ON c.customer_id = o.customer_id
  WHERE o.order_status IN ('pending', 'processing', 'shipped')
    AND o.order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 90 DAY)
  GROUP BY c.customer_id, c.customer_name, c.email, c.region
),
product_performance AS (
  SELECT
    p.product_id,
    p.product_name,
    p.category,
    COUNT(DISTINCT oi.order_id) as times_ordered,
    SUM(oi.quantity) as total_quantity_sold,
    SUM(oi.quantity * oi.unit_price) as total_revenue,
    AVG(oi.unit_price) as avg_selling_price
  FROM products p
  INNER JOIN order_items oi ON p.product_id = oi.product_id
  INNER JOIN orders o ON oi.order_id = o.order_id
  WHERE o.order_status != 'cancelled'
    AND o.order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 90 DAY)
  GROUP BY p.product_id, p.product_name, p.category
),
inventory_status AS (
  SELECT
    i.product_id,
    i.warehouse_location,
    i.quantity_on_hand,
    i.reorder_level,
    i.reorder_quantity,
    CASE
      WHEN i.quantity_on_hand <= i.reorder_level THEN 'Low Stock'
      WHEN i.quantity_on_hand <= (i.reorder_level * 1.5) THEN 'Medium Stock'
      ELSE 'Adequate Stock'
    END as stock_status
  FROM inventory i
)

SELECT
  co.customer_name,
  co.email,
  co.region,
  co.total_orders,
  co.total_spent,
  co.avg_order_value,
  co.last_order_date,
  pp.product_name,
  pp.category,
  pp.times_ordered,
  pp.total_quantity_sold,
  pp.total_revenue,
  ist.warehouse_location,
  ist.quantity_on_hand,
  ist.stock_status
FROM customer_orders co
CROSS JOIN product_performance pp
LEFT JOIN inventory_status ist ON pp.product_id = ist.product_id
WHERE co.total_orders > 0
  AND pp.total_revenue > 1000
ORDER BY co.total_spent DESC, pp.total_revenue DESC
LIMIT 100;`;

export const FullHeightMode = {
  args: {
    useCard: false,
    highlight: true,
    editable: true,
    disabled: false,
    hideCopyButton: false,
    wrapText: false,
    maxCollapsedNumberOfRows: 0,
    maxExpandedNumberOfRows: 0,
  },
  render: (args) => {
    // Create a wrapper component to properly handle the height constraint
    const Wrapper = () => (
      <div
        style={{
          height: "500px",
          display: "flex",
          flexDirection: "column",
          border: "1px solid #ccc",
          padding: "1rem",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0" }}>SQL Editor (Full-Height Mode)</h3>
        <p style={{ margin: "0 0 1rem 0", color: "#666" }}>
          When both max-collapsed-number-of-rows and max-expanded-number-of-rows
          are set to 0, the component fills its container's height with a
          scrollbar. Perfect for edit mode scenarios.
        </p>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <CodeSnippet {...args} language="sql">
            {sqlCode}
          </CodeSnippet>
        </div>
      </div>
    );
    return <Wrapper />;
  },
};
