/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

interface ReasoningSummaryData {
  user_defined_type: "reasoning_summary";
  summary: string;
  citations?: string[];
}

interface ReasoningSummaryCardProps {
  data: ReasoningSummaryData;
}

function ReasoningSummaryCard({ data }: ReasoningSummaryCardProps) {
  return (
    <div className="reasoning-summary">
      <div className="reasoning-summary__eyebrow">Step summary</div>
      <div className="reasoning-summary__body">{data.summary}</div>
      {data.citations && data.citations.length > 0 && (
        <ul className="reasoning-summary__citations">
          {data.citations.map((citation) => (
            <li key={citation}>{citation}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { ReasoningSummaryCard };
export type { ReasoningSummaryData };
