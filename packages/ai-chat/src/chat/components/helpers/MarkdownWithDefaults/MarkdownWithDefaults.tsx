/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useMemo } from "react";

import { useIntl } from "../../../hooks/useIntl";
import { useSelector } from "../../../hooks/useSelector";

import Markdown from "@carbon/ai-chat-components/es/react/markdown.js";

import { useShouldSanitizeHTML } from "../../../hooks/useShouldSanitizeHTML";
import { AppState } from "../../../../types/state/AppState";
import { shallowEqual } from "../../../store/appStore";

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

  let doSanitize = useShouldSanitizeHTML();
  if (overrideSanitize !== undefined) {
    doSanitize = overrideSanitize;
  }

  const languagePack = useSelector(
    (state: AppState) => ({
      codeSnippet_showLessText: state.languagePack.codeSnippet_showLessText,
      codeSnippet_showMoreText: state.languagePack.codeSnippet_showMoreText,
      codeSnippet_tooltipContent: state.languagePack.codeSnippet_tooltipContent,
      codeSnippet_ariaLabelReadOnly:
        state.languagePack.codeSnippet_ariaLabelReadOnly,
      codeSnippet_ariaLabelEditable:
        state.languagePack.codeSnippet_ariaLabelEditable,
      table_filterPlaceholder: state.languagePack.table_filterPlaceholder,
      table_previousPage: state.languagePack.table_previousPage,
      table_nextPage: state.languagePack.table_nextPage,
      table_itemsPerPage: state.languagePack.table_itemsPerPage,
      table_downloadButton: state.languagePack.table_downloadButton,
    }),
    shallowEqual,
  );
  const { formatMessage } = useIntl();
  const locale = useSelector(
    (state: AppState) => state.config.public.locale || "en",
  );
  // Host markdown config, read from its own store slice (set in ChatAppEntry)
  // rather than a global context provider.
  const markdownConfig = useSelector((state: AppState) => state.markdownConfig);

  const getPaginationSupplementalText = useMemo(
    () =>
      ({ count }: { count: number }) =>
        formatMessage(
          { id: "table_paginationSupplementalText" },
          { pagesCount: count },
        ),
    [formatMessage],
  );

  const getPaginationStatusText = useMemo(
    () =>
      ({ start, end, count }: { start: number; end: number; count: number }) =>
        formatMessage({ id: "table_paginationStatus" }, { start, end, count }),
    [formatMessage],
  );

  const getLineCountText = useMemo(
    () =>
      ({ count }: { count: number }) =>
        formatMessage({ id: "codeSnippet_lineCount" }, { count }),
    [formatMessage],
  );

  return (
    <Markdown
      markdown={text}
      sanitizeHTML={doSanitize}
      streaming={streaming}
      removeHTML={removeHTML}
      markdownItPlugins={markdownConfig?.markdownItPlugins}
      customRenderers={markdownConfig?.customRenderers}
      // Code snippet properties
      codeSnippetHighlight={highlight}
      codeSnippetShowLessText={languagePack.codeSnippet_showLessText}
      codeSnippetShowMoreText={languagePack.codeSnippet_showMoreText}
      codeSnippetCopyButtonTooltipContent={
        languagePack.codeSnippet_tooltipContent
      }
      codeSnippetGetLineCountText={getLineCountText}
      codeSnippetAriaLabelReadOnly={languagePack.codeSnippet_ariaLabelReadOnly}
      codeSnippetAriaLabelEditable={languagePack.codeSnippet_ariaLabelEditable}
      // Table properties
      tableFilterPlaceholderText={languagePack.table_filterPlaceholder}
      tablePreviousPageText={languagePack.table_previousPage}
      tableNextPageText={languagePack.table_nextPage}
      tableItemsPerPageText={languagePack.table_itemsPerPage}
      tableDownloadLabelText={languagePack.table_downloadButton}
      tableLocale={locale}
      tableGetPaginationSupplementalText={getPaginationSupplementalText}
      tableGetPaginationStatusText={getPaginationStatusText}
    />
  );
}

const MarkdownWithDefaultsExport = React.memo(
  MarkdownWithDefaults,
  (prevProps, nextProps) => {
    // Custom comparison to prevent re-render when only streaming changes but content is the same
    const textEqual = prevProps.text === nextProps.text;
    const htmlConversionEqual = prevProps.removeHTML === nextProps.removeHTML;
    const sanitizeEqual =
      prevProps.overrideSanitize === nextProps.overrideSanitize;
    const highlightEqual = prevProps.highlight === nextProps.highlight;

    // If text content is identical, we don't need to re-render regardless of streaming state
    if (textEqual && htmlConversionEqual && sanitizeEqual && highlightEqual) {
      return true; // Skip re-render
    }

    // If text content changed, check if streaming state is relevant
    const streamingEqual = prevProps.streaming === nextProps.streaming;

    return (
      textEqual &&
      htmlConversionEqual &&
      sanitizeEqual &&
      highlightEqual &&
      streamingEqual
    );
  },
);

export { MarkdownWithDefaultsExport as MarkdownWithDefaults };
export default MarkdownWithDefaultsExport;
