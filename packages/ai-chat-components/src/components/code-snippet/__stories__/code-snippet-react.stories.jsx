/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
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
import { Download, Share, Launch, Folders, FolderOpen, View } from "@carbon/icons-react";
import { AILabel, AILabelContent, AILabelActions, Button, IconButton, Link, Tag } from "@carbon/react";
import { multilineCode } from "./sample-code.js";
import "@carbon/ai-chat/css/chat-explainability-popover.css";

const renderSnippet = (args, code) => {
  const {
    useCard,
    highlight,
    editable,
    disabled,
    hideCopyButton,
    maxCollapsedNumberOfRows,
    maxExpandedNumberOfRows,
    minCollapsedNumberOfRows,
    minExpandedNumberOfRows,
    showMoreText,
    showLessText,
    copyButtonTooltipContent,
    language,
    defaultLanguage,
    onChange,
  } = args;

  const commonProps = {
    code,
    highlight,
    editable,
    disabled,
    hideCopyButton,
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
  if (typeof copyButtonTooltipContent !== "undefined") {
    commonProps.copyButtonTooltipContent = copyButtonTooltipContent;
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

  const snippet = <CodeSnippet {...commonProps} />;

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
    language,
    defaultLanguage,
    maxCollapsedNumberOfRows,
    maxExpandedNumberOfRows,
    minCollapsedNumberOfRows,
    minExpandedNumberOfRows,
    showMoreText,
    showLessText,
    copyButtonTooltipContent,
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
    code: streamedContent,
    highlight,
    editable,
    disabled,
    hideCopyButton,
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
  if (typeof copyButtonTooltipContent !== "undefined") {
    commonProps.copyButtonTooltipContent = copyButtonTooltipContent;
  }

  const snippet = <CodeSnippet {...commonProps} />;

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
        <Card isFlush>
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
  component: CodeSnippet,
  argTypes: {
    // Story-specific control (not a component property)
    useCard: {
      control: "boolean",
      description: "Wrap in Card (story-only control)",
      table: {
        category: "Story",
      },
    },
    // Disable control for complex array property
    actions: {
      control: false,
      description:
        "Array of actions that can overflow into a menu when space is limited.",
    },
    // Event handler
    onChange: {
      action: "onChange",
      table: { category: "events" },
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
    maxCollapsedNumberOfRows: 15,
    showMoreText: "Show more",
    showLessText: "Show less",
  },
  render: (args) => renderSnippet(args, multilineCode),
};

export const Streaming = {
  args: {
    useCard: true,
    highlight: true,
    editable: false,
    disabled: false,
    hideCopyButton: false,
  },
  render: (args) => <StreamingDemo {...args} />,
};

export const WithHeaderSlotsFilled = {
  args: {
    useCard: true,
    highlight: true,
    editable: false,
    disabled: false,
    hideCopyButton: false,
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
        code={multilineCode}
        data-rounded={args.useCard}
        actions={actions}
        overflow
      >
        <AILabel size="2xs" autoalign alignment="bottom" slot="decorator">
          <AILabelContent>
            <div
              role="dialog"
              slot="body-text"
              className="cds-aichat-explainability-popover--content"
            >
              <header className="cds-aichat-explainability-popover--content__header">
                <div className="cds-aichat-explainability-popover--content__eyebrow-row">
                  <span className="cds-aichat-explainability-popover--content__label">
                    AI explained
                  </span>
                  <Tag
                    className="cds-aichat--header__slug-confidence"
                    size="sm"
                    type="outline"
                  >
                    Confidence: 89%
                  </Tag>
                </div>
                <h2 className="cds-aichat-explainability-popover--content__title">
                  Name of feature
                </h2>
                <p className="cds-aichat-explainability-popover--content__description">
                  High level 1-2 sentence description of how the AI is being used in the
                  UI.
                </p>
              </header>
              <section className="cds-aichat-explainability-popover--content__section">
                <div>
                  <h3>How it works</h3>
                  <ol>
                    <li>
                      1. <strong>Key word.</strong> Description of key word.
                    </li>
                    <li>
                      2. <strong>Key word.</strong> Description of key word.
                    </li>
                    <li>
                      3. <strong>Key word.</strong> Description of key word.
                    </li>
                  </ol>
                </div>
                <div>
                  <h3>Data types used</h3>
                  <ul>
                    <li>
                      — <strong>Data type 1.</strong> Explain how it&apos;s used.
                    </li>
                    <li>
                      — <strong>Data type 2.</strong> Explain how it&apos;s used.
                    </li>
                    <li>
                      — <strong>Data type 3.</strong> Explain how it&apos;s used.
                    </li>
                  </ul>
                </div>
              </section>
              <section className="cds-aichat-explainability-popover--content__section">
                <div>
                  <h3>AI model</h3>
                  <Link
                    href="https://example.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Launch size={16} /> granite.13b.v2.instruct
                  </Link>
                </div>
                <div>
                  <h4>Additional details</h4>
                  <p>
                    Additional information about data used to fine tune and/or train the
                    model
                  </p>
                </div>
              </section>
              <section className="cds-aichat-explainability-popover--content__section">
                <div>
                  <h3>Training data set</h3>
                  <Link
                    href="https://example.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Launch size={16} /> IBM Security data piles
                  </Link>
                </div>
              </section>
            </div>
            <AILabelActions>
              <IconButton size="lg" kind="ghost" label="Folders">
                <Folders />
              </IconButton>
              <IconButton size="lg" kind="ghost" label="Open Folder">
                <FolderOpen />
              </IconButton>
              <IconButton size="lg" kind="ghost" label="View">
                <View />
              </IconButton>
              <Button>View details</Button>
            </AILabelActions>
          </AILabelContent>
        </AILabel>
        <div slot="fixed-actions">
          <Button size="sm" onClick={() => console.log("Fixed action clicked")}>
            Action
          </Button>
        </div>
      </CodeSnippet>
    );

    return args.useCard ? (
      <Card isFlush>
        <div slot="body">{snippet}</div>
      </Card>
    ) : (
      snippet
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
    maxCollapsedNumberOfRows: 0,
    maxExpandedNumberOfRows: 0,
  },
  render: (args) => {
    const snippet = <CodeSnippet {...args} code={sqlCode} language="sql" />;

    const content = args.useCard ? (
      <Card isFlush>
        <div slot="body">{snippet}</div>
      </Card>
    ) : (
      snippet
    );

    return (
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
          {content}
        </div>
      </div>
    );
  },
};
