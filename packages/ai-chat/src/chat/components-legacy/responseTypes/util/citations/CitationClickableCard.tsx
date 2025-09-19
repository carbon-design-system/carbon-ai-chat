/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { HasChildren } from "../../../../../types/utilities/HasChildren";

interface CitationClickableCardProps extends HasChildren {
  title: string;
  onClick: () => void;
  onSelectCitation?: () => void;
  className: string;
}

function CitationClickableCard({
  title,
  onClick,
  onSelectCitation,
  children,
  className,
}: CitationClickableCardProps) {
  return (
    <button
      type="button"
      className={`${className} cds-aichat--citation-card--clickable`}
      aria-label={title}
      onClick={() => {
        onClick();
        onSelectCitation?.();
      }}
      onFocus={onSelectCitation}
    >
      {children}
    </button>
  );
}

export { CitationClickableCard };
