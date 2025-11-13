/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ChevronDown16 from "@carbon/icons/es/chevron--down/16.js";
import ChevronUp16 from "@carbon/icons/es/chevron--up/16.js";
import { carbonIconToReact } from "../../../utils/carbonIcon";
import React, { useState } from "react";
import cx from "classnames";
import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { Markdown } from "../../../ai-chat-components/react/components/markdown/Markdown";

interface TranscriptComponentProps {
  /**
   * The transcript text, supports markdown.
   */
  text: string;

  /**
   * Optional label for the transcript.
   */
  label?: string;

  /**
   * Optional language code.
   */
  language?: string;
}

/**
 * Component for displaying text transcripts for audio content.
 * Renders as an expandable/collapsible section below the audio player.
 */
function TranscriptComponent({
  text,
  label,
  language,
}: TranscriptComponentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { media_transcript_label } = useLanguagePack();

  const ChevronDown = carbonIconToReact(ChevronDown16);
  const ChevronUp = carbonIconToReact(ChevronUp16);

  const displayLabel = label || media_transcript_label || "Transcript";

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="cds-aichat--media-transcript">
      <button
        className="cds-aichat--media-transcript__toggle"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        type="button"
      >
        <span className="cds-aichat--media-transcript__toggle-label">
          {displayLabel}&nbsp;
          {language && (
            <span className="cds-aichat--media-transcript__language">
              ({language})
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="cds-aichat--media-transcript__toggle-icon" />
        ) : (
          <ChevronDown className="cds-aichat--media-transcript__toggle-icon" />
        )}
      </button>
      {isExpanded && (
        <div
          className={cx("cds-aichat--media-transcript__content", {
            "cds-aichat--media-transcript__content--visible": isExpanded,
          })}
        >
          <Markdown sanitizeHTML markdown={text} />
        </div>
      )}
    </div>
  );
}

const TranscriptComponentExport = React.memo(TranscriptComponent);

export { TranscriptComponentExport as TranscriptComponent };
