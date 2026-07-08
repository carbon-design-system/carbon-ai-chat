/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Thin React wrapper that mounts the `Table` React component with the right
 * properties. `headers` / `rows` are passed straight through as props.
 *
 * Used by `App.tsx` as the body of the inline card preview, and by
 * `WorkspaceTable.tsx` as the full-size workspace content. Identical
 * markup in both places keeps the inline → workspace transition seamless
 * for the user.
 */

import Table from "@carbon/ai-chat-components/es/react/table";
import React from "react";

interface InlineTablePreviewProps {
  headers: string[];
  rows: string[][];
}

function InlineTablePreview({ headers, rows }: InlineTablePreviewProps) {
  return (
    <Table
      headers={headers.map((text) => ({ text }))}
      rows={rows.map((cells) => ({ cells: cells.map((text) => ({ text })) }))}
    />
  );
}

export { InlineTablePreview };
