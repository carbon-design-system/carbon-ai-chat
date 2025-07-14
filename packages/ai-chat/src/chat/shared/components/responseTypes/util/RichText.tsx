/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { MarkdownText } from "../../../../react/components/markdownText/MarkdownText";
import { useShouldSanitizeHTML } from "../../../hooks/useShouldSanitizeHTML";
import { removeHTML } from "../../../utils/htmlUtils";

interface RichTextProps {
  /**
   * The text (possibly containing HTML or Markdown) to display in this component.
   */
  text: string;

  /**
   * Indicates if HTML should be removed from text before converting Markdown to HTML.
   * This is used to sanitize data coming from a human agent.
   */
  shouldRemoveHTMLBeforeMarkdownConversion?: boolean;

  /**
   * If defined, this value indicates if this component should override the default sanitization setting.
   */
  overrideSanitize?: boolean;
}

/**
 * This component will display some text as formatted HTML in the browser. It will process the provided text and use
 * {@link processMarkdown} to link for links in the text to convert to anchors as well as looking for a limited set of
 * Markdown to format as HTML.
 *
 * Warning: This should only be used with trusted text. Do NOT use this with text that was entered by the end-user.
 */
function RichText(props: RichTextProps) {
  const { text, shouldRemoveHTMLBeforeMarkdownConversion, overrideSanitize } =
    props;
  const preformattedText = shouldRemoveHTMLBeforeMarkdownConversion
    ? removeHTML(text)
    : text;
  let doSanitize = useShouldSanitizeHTML();
  if (overrideSanitize !== undefined) {
    doSanitize = overrideSanitize;
  }

  return <MarkdownText markdown={preformattedText} sanitizeHTML={doSanitize} />;
}

const RichTextExport = React.memo(RichText);

export { RichTextExport as RichText };
export default RichTextExport;
