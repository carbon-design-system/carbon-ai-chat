/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { MarkdownItAttrsOptions, CurlyAttrsPattern } from "../types.js";
import {
  getAttrs,
  addAttrs,
  hasDelimiters,
  getMatchingOpeningToken,
} from "../core.js";
import { hidden } from "../utils.js";

/**
 * Pattern for table attributes.
 */
export function createTablePattern(
  options: Required<MarkdownItAttrsOptions>,
): CurlyAttrsPattern {
  return {
    name: "tables",
    tests: [
      {
        shift: 0,
        type: "table_close",
      },
      {
        shift: 1,
        type: "paragraph_open",
      },
      {
        shift: 2,
        type: "inline",
        content: hasDelimiters("only", options),
      },
    ],
    transform: (tokens, tokenIndex) => {
      const token = tokens[tokenIndex + 2];
      const tableOpen = getMatchingOpeningToken(tokens, tokenIndex);
      if (!tableOpen) {
        return;
      }
      const attrs = getAttrs(token.content, 0, options);
      addAttrs(attrs, tableOpen);
      tokens.splice(tokenIndex + 1, 3);
    },
  };
}

/**
 * Pattern for table header metadata calculation (used for colspan/rowspan).
 */
export function createTableTheadMetadataPattern(): CurlyAttrsPattern {
  return {
    name: "tables thead metadata",
    tests: [
      {
        shift: 0,
        type: "tr_close",
      },
      {
        shift: 1,
        type: "thead_close",
      },
      {
        shift: 2,
        type: "tbody_open",
      },
    ],
    transform: (tokens, tokenIndex) => {
      // Find the matching opening tr token
      const trOpen = getMatchingOpeningToken(tokens, tokenIndex);
      if (!trOpen) {
        return;
      }
      const thToken = tokens[tokenIndex - 1];
      let columnCount = 0;
      let currentIndex = tokenIndex;

      // Count the number of columns by walking backwards through table headers
      while (--currentIndex) {
        if (tokens[currentIndex] === trOpen) {
          // Store column count in metadata for use in tbody calculations
          tokens[currentIndex - 1].meta = Object.assign(
            {},
            tokens[currentIndex + 2].meta,
            {
              colsnum: columnCount,
            },
          );
          break;
        }
        columnCount +=
          ((tokens[currentIndex].level === thToken.level &&
          tokens[currentIndex].type === thToken.type
            ? 1
            : 0) as number) >> 0;
      }
      // Also store column count in tbody metadata
      tokens[tokenIndex + 2].meta = Object.assign(
        {},
        tokens[tokenIndex + 2].meta,
        {
          colsnum: columnCount,
        },
      );
    },
  };
}

/**
 * Pattern for table body calculation for handling colspan/rowspan.
 */
export function createTableTbodyCalculatePattern(): CurlyAttrsPattern {
  return {
    name: "tables tbody calculate",
    tests: [
      {
        shift: 0,
        type: "tbody_close",
        hidden: false,
      },
    ],
    transform: (tokens, tokenIndex) => {
      // Find the tbody_open token
      let tbodyOpenIndex = tokenIndex - 2;
      while (
        tbodyOpenIndex > 0 &&
        "tbody_open" !== tokens[--tbodyOpenIndex].type
      ) {
        // Continue searching backwards
      }

      // Get the calculated column count from metadata
      const totalColumns =
        (tokens[tbodyOpenIndex].meta as { colsnum?: number })?.colsnum ?? 0;
      if (totalColumns < 2) {
        return;
      }

      const targetLevel = tokens[tokenIndex].level + 2;
      // Process each token in the table body
      for (
        let currentTokenIndex = tbodyOpenIndex;
        currentTokenIndex < tokenIndex;
        currentTokenIndex++
      ) {
        if (tokens[currentTokenIndex].level > targetLevel) {
          continue;
        }

        const token = tokens[currentTokenIndex];
        const rowspan = token.hidden
          ? 0
          : Number(token.attrGet("rowspan")) || 0;
        const colspan = token.hidden
          ? 0
          : Number(token.attrGet("colspan")) || 0;

        // Handle rowspan > 1: update metadata for affected rows
        if (rowspan > 1) {
          let availableColumns = totalColumns - (colspan > 0 ? colspan : 1);
          for (
            let searchIndex = currentTokenIndex, remainingRows = rowspan;
            searchIndex < tokenIndex && remainingRows > 1;
            searchIndex++
          ) {
            if ("tr_open" == tokens[searchIndex].type) {
              tokens[searchIndex].meta = Object.assign(
                {},
                tokens[searchIndex].meta,
              );
              if (
                tokens[searchIndex].meta &&
                (tokens[searchIndex].meta as { colsnum?: number }).colsnum
              ) {
                availableColumns -= 1;
              }
              (tokens[searchIndex].meta as { colsnum: number }).colsnum =
                availableColumns;
              remainingRows--;
            }
          }
        }

        // Hide cells that exceed the column count in a row
        if (
          "tr_open" == token.type &&
          token.meta &&
          (token.meta as { colsnum?: number }).colsnum
        ) {
          const maxColumns = (token.meta as { colsnum: number }).colsnum;
          for (
            let searchIndex = currentTokenIndex, cellCount = 0;
            searchIndex < tokenIndex;
            searchIndex++
          ) {
            if ("td_open" == tokens[searchIndex].type) {
              cellCount += 1;
            } else if ("tr_close" == tokens[searchIndex].type) {
              break;
            }
            // Hide cells beyond the maximum column count
            if (cellCount > maxColumns) {
              tokens[searchIndex].hidden || hidden(tokens[searchIndex]);
            }
          }
        }

        // Handle colspan > 1: adjust colspan value and hide excess cells
        if (colspan > 1) {
          const cellIndices: number[] = [];
          let rowEndIndex = currentTokenIndex + 3;
          let columnsInRow = totalColumns;

          for (
            let searchIndex = currentTokenIndex;
            searchIndex > tbodyOpenIndex;
            searchIndex--
          ) {
            if ("tr_open" == tokens[searchIndex].type) {
              columnsInRow =
                (tokens[searchIndex].meta as { colsnum?: number })?.colsnum ??
                columnsInRow;
              break;
            } else if ("td_open" === tokens[searchIndex].type) {
              cellIndices.unshift(searchIndex);
            }
          }

          for (
            let searchIndex = currentTokenIndex + 2;
            searchIndex < tokenIndex;
            searchIndex++
          ) {
            if ("tr_close" == tokens[searchIndex].type) {
              rowEndIndex = searchIndex;
              break;
            } else if ("td_open" == tokens[searchIndex].type) {
              cellIndices.push(searchIndex);
            }
          }

          const cellOffset = cellIndices.indexOf(currentTokenIndex);
          let actualColspan = columnsInRow - cellOffset;
          actualColspan = actualColspan > colspan ? colspan : actualColspan;
          if (colspan > actualColspan) {
            token.attrSet("colspan", actualColspan + "");
          }

          for (
            let hideIndex = cellIndices.slice(
              columnsInRow + 1 - totalColumns - actualColspan,
            )[0];
            hideIndex < rowEndIndex;
            hideIndex++
          ) {
            tokens[hideIndex].hidden || hidden(tokens[hideIndex]);
          }
        }
      }
    },
  };
}
