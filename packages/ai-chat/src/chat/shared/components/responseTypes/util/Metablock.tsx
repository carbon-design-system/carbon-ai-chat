/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import Description from "./Description";

interface MetablockProps {
  title?: string;
  description?: string;
  id?: string;

  /**
   * Indicates if HTML should be removed from text before converting Markdown to HTML.
   * This is used to sanitize data coming from a human agent.
   */
  shouldRemoveHTMLBeforeMarkdownConversion?: boolean;
}

export default function Metablock({
  title = null,
  description = null,
  id = null,
  shouldRemoveHTMLBeforeMarkdownConversion = false,
}: MetablockProps) {
  return title || description ? (
    <div className="WAC__received--metablock" id={id}>
      {title && (
        <Description
          className="WAC__received--metablock-content WACMetablock__Title"
          text={title}
          shouldRemoveHTMLBeforeMarkdownConversion={
            shouldRemoveHTMLBeforeMarkdownConversion
          }
        />
      )}
      {description && (
        <Description
          className="WAC__received--metablock-content WACMetablock__Description"
          text={description}
          shouldRemoveHTMLBeforeMarkdownConversion={
            shouldRemoveHTMLBeforeMarkdownConversion
          }
        />
      )}
    </div>
  ) : null;
}
