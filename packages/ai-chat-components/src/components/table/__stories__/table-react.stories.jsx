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
  component: Table,
  argTypes: {
    // Story-specific control (not a component property)
    useCard: {
      control: "boolean",
      description: "Wrap in card wrapper (story-only control)",
      table: {
        category: "Story",
      },
    },
    // Disable controls for complex array/object properties
    headers: {
      control: false,
      table: { category: "Data" },
    },
    rows: {
      control: false,
      table: { category: "Data" },
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
