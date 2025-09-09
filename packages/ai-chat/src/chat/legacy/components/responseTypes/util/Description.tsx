/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { HasClassName } from "../../../../../types/utilities/HasClassName";
import { RichText } from "./RichText";

interface DescriptionProps extends HasClassName {
  text: string;

  /**
   * Indicates if HTML should be removed from text before converting Markdown to HTML.
   * This is used to sanitize data coming from a human agent.
   */
  shouldRemoveHTMLBeforeMarkdownConversion?: boolean;
}

export default function Description({
  className,
  text,
  shouldRemoveHTMLBeforeMarkdownConversion = false,
}: DescriptionProps) {
  return (
    <div className={`cds-aichat--description ${className}`}>
      <RichText
        text={text}
        shouldRemoveHTMLBeforeMarkdownConversion={
          shouldRemoveHTMLBeforeMarkdownConversion
        }
      />
    </div>
  );
}
