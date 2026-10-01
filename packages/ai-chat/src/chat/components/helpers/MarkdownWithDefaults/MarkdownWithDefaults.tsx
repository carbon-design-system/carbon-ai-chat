/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import Markdown from '@carbon/ai-chat-components/es/react/markdown.js';
import { useMarkdownSettings } from './useMarkdownSettings';

interface MarkdownWithDefaultsProps {
  /**
   * The text (possibly containing HTML or Markdown) to display in this component.
   */
  text: string;

  /**
   * Indicates if HTML should be removed from text before converting Markdown to HTML.
   * This is used to sanitize data coming from a human agent.
   */
  removeHTML?: boolean;

  /**
   * If defined, this value indicates if this component should override the default sanitization setting.
   */
  overrideSanitize?: boolean;

  /**
   * If we are actively streaming to this MarkdownWithDefaults component.
   */
  streaming?: boolean;

  /**
   * Whether to enable syntax highlighting in code blocks.
   */
  highlight?: boolean;
}

/**
 * This component will display some text as formatted HTML in the browser. It will process the provided text and use
 * markdownToHTML to link for links in the text to convert to anchors as well as looking for a limited set of
 * Markdown to format as HTML.
 *
 * Warning: This should only be used with trusted text. Do NOT use this with text that was entered by the end-user.
 */
function MarkdownWithDefaults(props: MarkdownWithDefaultsProps) {
  const {
    text,
    removeHTML,
    overrideSanitize,
    streaming,
    highlight = true,
  } = props;

  const settings = useMarkdownSettings(overrideSanitize);
  return (
    <Markdown
      {...settings}
      markdown={text}
      streaming={streaming}
      removeHTML={removeHTML}
      codeSnippetHighlight={highlight}
    />
  );
}

const MarkdownWithDefaultsExport = React.memo(MarkdownWithDefaults);
export { MarkdownWithDefaultsExport as MarkdownWithDefaults };
