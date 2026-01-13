import "@carbon/web-components/es-custom/components/pagination/index.js";
import "@carbon/web-components/es-custom/components/select/index.js";
import { TableRowContent } from "./table.js";
interface TablePaginationProps {
    _currentPageSize: number;
    _currentPageNumber: number;
    _filterVisibleRowIDs: Set<string>;
    rows: TableRowContent[];
    previousPageText: string;
    nextPageText: string;
    itemsPerPageText: string;
    getPaginationSupplementalText?: ({ count }: {
        count: number;
    }) => string;
    getPaginationStatusText?: ({ start, end, count, }: {
        start: number;
        end: number;
        count: number;
    }) => string;
    _handlePageChangeEvent: (event: any) => void;
    _handlePageSizeChangeEvent: (event: any) => void;
}
/**
 * Table pagination view logic.
 */
declare function tablePaginationTemplate(props: TablePaginationProps): import("lit-html").TemplateResult<1>;
export { tablePaginationTemplate };
