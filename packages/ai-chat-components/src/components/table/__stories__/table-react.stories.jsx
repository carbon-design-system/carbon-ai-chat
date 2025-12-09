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

const headers = [
  { text: "Name" },
  { text: "Role" },
  { text: "Location" },
  { text: "Status" },
];

const rows = [
  {
    cells: [
      { text: "Jordan Smith" },
      { text: "Conversation Designer" },
      { text: "Austin, TX" },
      { text: "Active" },
    ],
  },
  {
    cells: [
      { text: "Priya Patel" },
      { text: "Applied Scientist" },
      { text: "Bengaluru, IN" },
      { text: "Active" },
    ],
  },
  {
    cells: [
      { text: "Lee Chen" },
      { text: "Product Manager" },
      { text: "Singapore" },
      { text: "Paused" },
    ],
  },
  {
    cells: [
      { text: "Morgan Reyes" },
      { text: "Researcher" },
      { text: "Toronto, CA" },
      { text: "Active" },
    ],
  },
  {
    cells: [
      { text: "Samira Khan" },
      { text: "Engineer" },
      { text: "San Jose, CA" },
      { text: "Active" },
    ],
  },
  {
    cells: [
      { text: "Alex Kim" },
      { text: "Designer" },
      { text: "Seoul, KR" },
      { text: "Inactive" },
    ],
  },
];

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

export default {
  title: "Components/Table",
  argTypes: {
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
  render: (args) => (
    <Table
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
  ),
};

export const Loading = {
  args: {
    ...Default.args,
    loading: true,
  },
  render: Default.render,
};
