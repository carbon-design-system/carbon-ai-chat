/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Thin React wrapper that mounts `<cds-aichat-table>` with the right
 * properties. The web component takes `headers` / `rows` as JS properties
 * (not HTML attributes), so we set them via ref instead of JSX attributes.
 *
 * Used by `App.tsx` as the body of the inline card preview, and by
 * `WorkspaceTable.tsx` as the full-size workspace content. Identical
 * markup in both places keeps the inline → workspace transition seamless
 * for the user.
 */

import "@carbon/ai-chat-components/es/components/table/index.js";
import React, { useEffect, useRef } from "react";

interface InlineTablePreviewProps {
  headers: string[];
  rows: string[][];
}

function InlineTablePreview({ headers, rows }: InlineTablePreviewProps) {
  const tableRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!tableRef.current) {
      return;
    }
    const node = tableRef.current as unknown as {
      headers: { text: string }[];
      rows: { cells: { text: string }[] }[];
    };
    node.headers = headers.map((text) => ({ text }));
    node.rows = rows.map((cells) => ({
      cells: cells.map((text) => ({ text })),
    }));
  }, [headers, rows]);
  return (
    /* @ts-expect-error — cds-aichat-table is a web component, not a React type */
    <cds-aichat-table ref={tableRef} />
  );
}

export { InlineTablePreview };
