/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import React, { useState } from "react";
import {
  Tag,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Button,
} from "@carbon/react";
import CodeSnippet from "../../../react/code-snippet";
import { multilineCode } from "./story-data.js";
import {
  headers as tableHeaders,
  rows as tableRows,
} from "../../table/__stories__/story-data.js";

export function getHeaderDescription(type) {
  switch (type) {
    case "basic":
      return (
        <div slot="header-description">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco.
        </div>
      );
    case "withTags":
      return (
        <>
          <div slot="header-description">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco.
          </div>
          <div slot="header-description">
            <Tag size="sm" type="gray">
              Tag
            </Tag>
            <Tag size="sm" type="gray">
              Tag
            </Tag>
            <Tag size="sm" type="gray">
              Tag
            </Tag>
            <Tag size="sm" type="gray">
              Tag
            </Tag>
            <Tag size="sm" type="gray">
              Tag
            </Tag>
          </div>
        </>
      );
  }
}

export function getBodyContent(type) {
  switch (type) {
    case "short":
      return `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam, quis nostrud exercitation ullamco.
      `;
    case "long": {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [searchValue, setSearchValue] = useState("");

      const filteredRows = tableRows.filter((row) => {
        if (!searchValue) {
          return true;
        }
        const searchLower = searchValue.toLowerCase();
        return row.cells.some((cell) =>
          cell.text.toLowerCase().includes(searchLower),
        );
      });

      return (
        <div>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur
            et velit sed erat faucibus blandit non nec felis. Nulla facilisi.
            Pellentesque nec finibus lectus. Vestibulum vitae sem eget lacus
            aliquam congue vitae ut elit.
          </p>
          <br />
          <CodeSnippet language="typescript" highlight>
            {multilineCode}
          </CodeSnippet>
          <br />
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur
            et velit sed erat faucibus blandit non nec felis.
          </p>
          <br />
          <TableContainer
            title="Agent roster"
            description="Operational view of AI chat team members."
          >
            <TableToolbar>
              <TableToolbarContent>
                <TableToolbarSearch
                  expanded
                  persistent
                  placeholder="Filter table"
                  onChange={(e) => {
                    if (typeof e !== "string" && e.target) {
                      setSearchValue(e.target.value);
                    }
                  }}
                />
                <Button kind="primary">Add new</Button>
              </TableToolbarContent>
            </TableToolbar>
            <Table size="lg">
              <TableHead>
                <TableRow>
                  {tableHeaders.map((header, index) => (
                    <TableHeader key={index}>{header.text}</TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.cells.map((cell, cellIndex) => (
                      <TableCell key={cellIndex}>{cell.text}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <br />
          <p>
            Fusce egestas sapien id sem luctus, nec hendrerit velit elementum.
            In in justo a nunc accumsan vestibulum. Quisque ut interdum est.
            Proin id felis ac justo blandit dictum. Suspendisse in tellus a
            risus fermentum volutpat vel quis leo. Curabitur varius, libero at
            pulvinar suscipit, urna nisi volutpat felis, sed maximus diam eros
            non metus.
          </p>
        </div>
      );
    }
  }
}
