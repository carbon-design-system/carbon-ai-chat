/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/code-snippet";
import "../../card/index.js";
import "@carbon/web-components/es/components/ai-label/ai-label.js";
import "@carbon/web-components/es/components/button/button.js";
import { html, LitElement } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import Download16 from "@carbon/icons/es/download/16.js";
import Share16 from "@carbon/icons/es/share/16.js";
import { multilineCode } from "./sample-code.js";

// Helper function to render with or without card wrapper
const renderSnippet = (args, code) => {
  const snippet = html`
    <cds-aichat-code-snippet
      ?data-rounded=${args.useCard}
      .code=${code}
      ?editable=${args.editable}
      ?highlight=${args.highlight}
      ?disabled=${args.disabled}
      ?hide-copy-button=${args.hideCopyButton}
      ?hide-header=${args.hideHeader}
      max-collapsed-number-of-rows=${ifDefined(args.maxCollapsedNumberOfRows)}
      max-expanded-number-of-rows=${ifDefined(args.maxExpandedNumberOfRows)}
      min-collapsed-number-of-rows=${ifDefined(args.minCollapsedNumberOfRows)}
      min-expanded-number-of-rows=${ifDefined(args.minExpandedNumberOfRows)}
      show-more-text=${ifDefined(args.showMoreText)}
      show-less-text=${ifDefined(args.showLessText)}
      copy-button-tooltip-content=${ifDefined(args.copyButtonTooltipContent)}
    >
    </cds-aichat-code-snippet>
  `;

  if (args.useCard) {
    return html`
      <cds-aichat-card is-flush>
        <div slot="body">${snippet}</div>
      </cds-aichat-card>
    `;
  }

  return snippet;
};

export default {
  title: "Components/Code snippet",
  component: "cds-aichat-code-snippet",
  argTypes: {
    // Story-specific control (not a component property)
    useCard: {
      control: "boolean",
      description: "Wrap in card wrapper (story-only control)",
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

class StreamingDemo extends LitElement {
  static properties = {
    useCard: { type: Boolean },
    language: { type: String },
    editable: { type: Boolean },
    highlight: { type: Boolean },
    disabled: { type: Boolean },
    hideCopyButton: { type: Boolean },
    streamedContent: { type: String },
  };

  constructor() {
    super();
    this.useCard = true;
    this.editable = false;
    this.highlight = true;
    this.disabled = false;
    this.hideCopyButton = false;
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
    const snippet = html`
      <cds-aichat-code-snippet
        ?data-rounded=${this.useCard}
        .code=${this.streamedContent}
        language=${this.language}
        ?editable=${this.editable}
        ?highlight=${this.highlight}
        ?disabled=${this.disabled}
        ?hide-copy-button=${this.hideCopyButton}
      >
      </cds-aichat-code-snippet>
    `;

    const snippetContent = this.useCard
      ? html`
          <cds-aichat-card is-flush>
            <div slot="body">${snippet}</div>
          </cds-aichat-card>
        `
      : snippet;

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

export const Streaming = {
  args: {
    useCard: true,
    highlight: true,
    editable: false,
    disabled: false,
    hideCopyButton: false,
  },
  render: (args) => html`
    <streaming-demo
      ?use-card=${args.useCard}
      language=${args.language}
      ?editable=${args.editable}
      ?highlight=${args.highlight}
      ?disabled=${args.disabled}
      ?hide-copy-button=${args.hideCopyButton}
    ></streaming-demo>
  `,
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
        icon: Download16,
        onClick: () => console.log("Download clicked"),
      },
      {
        text: "Share",
        icon: Share16,
        onClick: () => console.log("Share clicked"),
      },
    ];

    const snippet = html`
      <cds-aichat-code-snippet
        ?data-rounded=${args.useCard}
        .code=${multilineCode}
        ?editable=${args.editable}
        ?highlight=${args.highlight}
        ?disabled=${args.disabled}
        ?hide-copy-button=${args.hideCopyButton}
        ?overflow=${true}
        .actions=${actions}
        max-collapsed-number-of-rows=${ifDefined(args.maxCollapsedNumberOfRows)}
      >
        <cds-ai-label size="2xs" autoalign alignment="bottom" slot="decorator">
          <div slot="body-text">
            <div>
              This code was generated by IBM watsonx AI. Review carefully before
              use.
            </div>
          </div>
        </cds-ai-label>
        <div slot="fixed-actions">
          <cds-button
            size="sm"
            @click=${() => console.log("Fixed action clicked")}>
            Button
          </button>
        </div>
      </cds-aichat-code-snippet>
    `;

    return args.useCard
      ? html`
          <cds-aichat-card is-flush>
            <div slot="body">${snippet}</div>
          </cds-aichat-card>
        `
      : snippet;
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
    const snippet = html`
      <cds-aichat-code-snippet
        ?data-rounded=${args.useCard}
        language="sql"
        .code=${sqlCode}
        ?editable=${args.editable}
        ?highlight=${args.highlight}
        ?disabled=${args.disabled}
        ?hide-copy-button=${args.hideCopyButton}
        max-collapsed-number-of-rows=${args.maxCollapsedNumberOfRows}
        max-expanded-number-of-rows=${args.maxExpandedNumberOfRows}
      >
      </cds-aichat-code-snippet>
    `;

    const content = args.useCard
      ? html`
          <cds-aichat-card is-flush>
            <div slot="body">${snippet}</div>
          </cds-aichat-card>
        `
      : snippet;

    return html`
      <div
        style="height: 500px; display: flex; flex-direction: column; border: 1px solid #ccc; padding: 1rem;"
      >
        <h3 style="margin: 0 0 1rem 0;">SQL Editor (Full-Height Mode)</h3>
        <p style="margin: 0 0 1rem 0; color: #666;">
          When both max-collapsed-number-of-rows and max-expanded-number-of-rows
          are set to 0, the component fills its container's height with a
          scrollbar. Perfect for edit mode scenarios.
        </p>
        <div style="flex: 1; min-height: 0;">${content}</div>
      </div>
    `;
  },
};
