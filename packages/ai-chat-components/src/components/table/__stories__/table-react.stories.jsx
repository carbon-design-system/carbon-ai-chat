/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import { createComponent } from "@lit/react";
import "../index";
import { CDSAIChatTable } from "../src/table";
import { headers, rows } from "./story-data";
import Card from "../../../react/card";

const Table = createComponent({
  tagName: "cds-aichat-table",
  elementClass: CDSAIChatTable,
  react: React,
  events: {
    "cds-table-filtered": "onFilter",
    "cds-pagination-changed-current": "onPageChange",
    "cds-pagination-changed-page-size": "onPageSizeChange",
  },
});

// Helper function to render with or without card wrapper
const renderTable = (args) => {
  const table = (
    <Table
      data-rounded={args.useCard}
      table-title={args.tableTitle}
      table-description={args.tableDescription}
      filter-placeholder-text={args.filterPlaceholderText}
      previous-page-text={args.previousPageText}
      next-page-text={args.nextPageText}
      items-per-page-text={args.itemsPerPageText}
      locale={args.locale}
      default-page-size={args.defaultPageSize}
      headers={args.headers}
      rows={args.rows}
      loading={args.loading}
    />
  );

  return args.useCard ? (
    <Card isFlush>
      <div slot="body">{table}</div>
    </Card>
  ) : (
    table
  );
};

export default {
  title: "Components/Table",
  argTypes: {
    useCard: {
      control: "boolean",
      description: "Wrap in card wrapper",
      table: {
        category: "Wrapper",
      },
    },
    tableTitle: {
      control: "text",
      description: "Optional heading displayed above the table.",
    },
    tableDescription: {
      control: "text",
      description: "Optional helper text under the title.",
    },
    headers: {
      control: false,
      description: "Header cells for the table.",
      table: { category: "data" },
    },
    rows: {
      control: false,
      description: "Row data for the table.",
      table: { category: "data" },
    },
    loading: {
      control: "boolean",
      description:
        "Show a skeleton state while data loads. Filters and pagination are disabled when loading.",
    },
    filterPlaceholderText: {
      control: "text",
      description: "Placeholder text for the filter search input.",
    },
    previousPageText: {
      control: "text",
      description: "Tooltip text for the pagination previous button.",
    },
    nextPageText: {
      control: "text",
      description: "Tooltip text for the pagination next button.",
    },
    itemsPerPageText: {
      control: "text",
      description: "Label text for the items-per-page selector.",
    },
    locale: {
      control: "text",
      description: "Locale used for sorting and pagination formatting.",
    },
    defaultPageSize: {
      control: "number",
      description:
        "Initial page size. Defaults to 5 on narrow containers and 10 on wide containers.",
    },
  },
};

export const Default = {
  args: {
    useCard: true,
    tableTitle: "Agent roster",
    tableDescription: "Operational view of AI chat team members.",
    headers,
    rows,
    loading: false,
    filterPlaceholderText: "Filter rows",
    previousPageText: "Previous page",
    nextPageText: "Next page",
    itemsPerPageText: "Items per page",
    locale: "en",
    defaultPageSize: 5,
  },
  render: (args) => renderTable(args),
};

export const Loading = {
  args: {
    ...Default.args,
    loading: true,
  },
  render: (args) => renderTable(args),
};

export const WithPagination = {
  args: {
    ...Default.args,
    defaultPageSize: 2, // 6 rows with page size 2 = 3 pages
  },
  render: (args) => renderTable(args),
};
