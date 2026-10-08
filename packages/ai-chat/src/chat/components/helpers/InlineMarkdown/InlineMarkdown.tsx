/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { html, nothing, render, type RootPart } from 'lit';
import {
  InlineMarkdownError,
  renderInlineMarkdown,
  type InlineMarkdownOptions,
} from '@carbon/ai-chat-components/es/components/markdown/index.js';
import { markdownToTokenTree } from '@carbon/ai-chat-components/es/components/markdown/src/markdown-token-tree.js';
import { validateInlineTree } from '@carbon/ai-chat-components/es/components/markdown/src/utils/inline-validation.js';

import { useMarkdownSettings } from '../MarkdownWithDefaults/useMarkdownSettings';
import { consoleError } from '../../../utils/miscUtils';

const FALLBACK_CLASS = 'cds-aichat--inline-markdown-fallback';

interface InlineMarkdownProps {
  /** One run of sent message text. */
  text: string;
  /** Keep edge whitespace, rendering edge newlines as breaks. */
  preserveBoundaryWhitespace?: boolean;
  /** Drop a leading edge break, which sits at the start of its paragraph. */
  trimStartBreaks?: boolean;
  /** Drop a trailing edge break, which sits at the end of its paragraph. */
  trimEndBreaks?: boolean;
}

/**
 * Renders a run of sent message text with the shared inline renderer. React
 * owns the span; Lit owns its children. A run the renderer rejects shows its
 * complete source as text.
 */
function InlineMarkdown({
  text,
  preserveBoundaryWhitespace = false,
  trimStartBreaks = false,
  trimEndBreaks = false,
}: InlineMarkdownProps) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const reported = useRef<{ text: string; options: unknown }>(null);
  const { markdownItPlugins, customRenderers } = useMarkdownSettings(true);

  const options = useMemo<InlineMarkdownOptions>(
    () => ({
      markdownItPlugins,
      customRenderers,
      sanitizeHTML: true,
      removeHTML: true,
      projectPluginOutput: true,
    }),
    [markdownItPlugins, customRenderers]
  );

  useLayoutEffect(() => {
    const host = hostRef.current;
    let part: RootPart;
    try {
      const template = preserveBoundaryWhitespace
        ? renderWithBoundaries(text, options, trimStartBreaks, trimEndBreaks)
        : renderInlineMarkdown(text, options);
      host.classList.remove(FALLBACK_CLASS);
      part = render(template, host);
      reported.current = null;
      // Sent links have always carried this rel. Adding it through a link
      // callback would make sanitization drop the renderer's target default.
      host.querySelectorAll('a:not([rel])').forEach((link) => {
        link.setAttribute('rel', 'noopener noreferrer');
      });
    } catch (error) {
      host.classList.add(FALLBACK_CLASS);
      part = render(text, host);
      const last = reported.current;
      if (last?.text !== text || last?.options !== options) {
        reported.current = { text, options };
        consoleError(
          `Inline markdown could not render (${failureName(error)}), so the chat showed the full source as text. Check the source and the markdownConfig callbacks.`
        );
      }
    }
    part.setConnected(true);
    return () => {
      part.setConnected(false);
      render(nothing, host);
    };
  }, [
    text,
    options,
    preserveBoundaryWhitespace,
    trimStartBreaks,
    trimEndBreaks,
  ]);

  return <span ref={hostRef} />;
}

/**
 * Renders the run without its edge whitespace, then restores that whitespace
 * with each newline as a break. The untrimmed run is validated first, so
 * trimming cannot turn indented code or a blank line into inline text.
 */
function renderWithBoundaries(
  text: string,
  options: InlineMarkdownOptions,
  trimStartBreaks: boolean,
  trimEndBreaks: boolean
) {
  let leading = text.match(/^\s+/)?.[0] ?? '';
  const afterLeading = text.slice(leading.length);
  let trailing = afterLeading.match(/\s+$/)?.[0] ?? '';
  const trimmed = afterLeading.slice(0, afterLeading.length - trailing.length);
  if (trimmed !== text) {
    validateInlineTree(
      markdownToTokenTree(text, undefined, {
        removeHtml: options.removeHTML,
        markdownItPlugins: options.markdownItPlugins,
      }).tree
    );
  }
  if (trimStartBreaks && leading.includes('\n')) {
    leading = '';
  }
  if (trimEndBreaks && (trimmed ? trailing : leading).includes('\n')) {
    trailing = '';
    leading = trimmed ? leading : '';
  }
  return html`${boundaryWhitespace(leading)}${trimmed ? renderInlineMarkdown(trimmed, options) : nothing}${boundaryWhitespace(trailing)}`;
}

/** An error's code or type, which never carries message content. */
function failureName(error: unknown) {
  if (error instanceof InlineMarkdownError) {
    return error.code;
  }
  return error instanceof Error ? error.name : typeof error;
}

function boundaryWhitespace(whitespace: string) {
  return whitespace
    .split('\n')
    .map((segment, index) => html`${index ? html`<br />` : nothing}${segment}`);
}

const InlineMarkdownExport = React.memo(InlineMarkdown);
export { InlineMarkdownExport as InlineMarkdown };
