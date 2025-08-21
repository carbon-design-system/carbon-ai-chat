/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Table-specific localization options
 */
export interface TableLocalization {
  /** Placeholder text for table filter input */
  filterPlaceholderText?: string;
  /** Text for previous page button tooltip */
  previousPageText?: string;
  /** Text for next page button tooltip */
  nextPageText?: string;
  /** Text for items per page label */
  itemsPerPageText?: string;
  /** Locale for table sorting and formatting */
  locale?: string;
  /** Function to get supplemental pagination text */
  getPaginationSupplementalText?: ({ count }: { count: number }) => string;
  /** Function to get pagination status text */
  getPaginationStatusText?: ({
    start,
    end,
    count,
  }: {
    start: number;
    end: number;
    count: number;
  }) => string;
}

/**
 * Comprehensive localization options for markdown components
 */
export interface LocalizationOptions {
  /** Table-specific localization */
  table?: TableLocalization;
}
