/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { Suspense, useMemo } from "react";
import { useIntl } from "react-intl";
import { useSelector } from "../../../hooks/useSelector";

import { Table } from "../../../ai-chat-components/react/components/table/Table";
import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { AppState } from "../../../../types/state/AppState";
import { consoleError } from "../../../utils/miscUtils";
import InlineError from "../error/InlineError";
import { TableItem } from "../../../../types/messaging/Messages";

interface TableContainerProps {
  /**
   * The table item to display.
   */
  tableItem: TableItem;
}

/**
 * Renders a table response type. The table has a header, rows, and optionally a title and description.
 */
function TableContainer(props: TableContainerProps) {
  const { tableItem } = props;
  const { title, description, headers, rows } = tableItem;

  const locale = useSelector(
    (state: AppState) => state.config.public.locale || "en",
  );

  const languagePack = useLanguagePack();
  const intl = useIntl();

  const isValidTable = useMemo(() => {
    const columnCount = headers.length;
    // If the the number of cells in one of the rows is different than the number of cells in the header, then the table
    // is not valid.
    const isValid = !rows.some((row: any) => row.cells.length !== columnCount);

    if (!isValid) {
      consoleError(
        `Number of cells in the table header does not match the number of cells in one or more of the table rows. In order to render a table there needs to be the same number of columns in the table header and all of the table rows.`,
      );
    }
    return isValid;
  }, [rows, headers]);

  function getTablePaginationSupplementalText({ count }: { count: number }) {
    return intl.formatMessage(
      { id: "table_paginationSupplementalText" },
      { pagesCount: count },
    );
  }

  function getTablePaginationStatusText({
    start,
    end,
    count,
  }: {
    start: number;
    end: number;
    count: number;
  }) {
    return intl.formatMessage(
      { id: "table_paginationStatus" },
      { start, end, count },
    );
  }

  if (isValidTable) {
    return (
      <div className="cds-aichat--table-container">
        <Suspense fallback={null}>
          <Table
            tableTitle={title}
            tableDescription={description}
            headers={headers}
            rows={rows}
            filterPlaceholderText={languagePack.table_filterPlaceholder}
            previousPageText={languagePack.table_previousPage}
            nextPageText={languagePack.table_nextPage}
            itemsPerPageText={languagePack.table_itemsPerPage}
            getPaginationSupplementalText={getTablePaginationSupplementalText}
            getPaginationStatusText={getTablePaginationStatusText}
            locale={locale}
          />
        </Suspense>
      </div>
    );
  }

  return (
    // Use inlineError.tsx here if the table is not valid. In the future when we have a web component version of the
    // inlineError component the table web component can render that instead of the React container doing it here.
    <InlineError />
  );
}

const TableContainerExport = React.memo(TableContainer);
export default TableContainerExport;
