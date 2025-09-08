/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useMemo } from "react";
import { useIntl } from "react-intl";
import { useSelector } from "react-redux";

import { Markdown } from "../../../../react/components/markdown/Markdown";
import { useShouldSanitizeHTML } from "../../../hooks/useShouldSanitizeHTML";
import { CarbonTheme } from "../../../../../types/config/PublicConfig";
import { LocalizationOptions } from "../../../../../types/localization/LocalizationOptions";
import { AppState } from "../../../../../types/state/AppState";
import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { debugLog } from "../../../utils/miscUtils";

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

  /**
   * If we are actively streaming to this RichText component.
   */
  streaming?: boolean;
}

/**
 * This component will display some text as formatted HTML in the browser. It will process the provided text and use
 * markdownToHTML to link for links in the text to convert to anchors as well as looking for a limited set of
 * Markdown to format as HTML.
 *
 * Warning: This should only be used with trusted text. Do NOT use this with text that was entered by the end-user.
 */
function RichText(props: RichTextProps) {
  const {
    text,
    shouldRemoveHTMLBeforeMarkdownConversion,
    overrideSanitize,
    streaming,
  } = props;

  let doSanitize = useShouldSanitizeHTML();
  if (overrideSanitize !== undefined) {
    doSanitize = overrideSanitize;
  }

  // Get localization data for markdown components
  const languagePack = useLanguagePack();
  const intl = useIntl();
  const locale = useSelector((state: AppState) => state.locale);
  const config = useSelector((state: AppState) => state.config.public);
  const { debug } = config;
  const { carbonTheme } = config.themeConfig;

  // Determine if dark theme should be used based on carbonTheme
  const isDarkTheme =
    carbonTheme === CarbonTheme.G90 || carbonTheme === CarbonTheme.G100;

  // Memoize localization object to prevent unnecessary re-renders
  const localization: LocalizationOptions = useMemo(() => {
    // Create table localization functions
    const getTablePaginationSupplementalText = ({
      count,
    }: {
      count: number;
    }) => {
      return intl.formatMessage(
        { id: "table_paginationSupplementalText" },
        { pagesCount: count },
      );
    };

    const getTablePaginationStatusText = ({
      start,
      end,
      count,
    }: {
      start: number;
      end: number;
      count: number;
    }) => {
      return intl.formatMessage(
        { id: "table_paginationStatus" },
        { start, end, count },
      );
    };

    // Build localization options object
    return {
      table: {
        filterPlaceholderText: languagePack.table_filterPlaceholder,
        previousPageText: languagePack.table_previousPage,
        nextPageText: languagePack.table_nextPage,
        itemsPerPageText: languagePack.table_itemsPerPage,
        locale,
        getPaginationSupplementalText: getTablePaginationSupplementalText,
        getPaginationStatusText: getTablePaginationStatusText,
      },
    };
  }, [
    languagePack.table_filterPlaceholder,
    languagePack.table_previousPage,
    languagePack.table_nextPage,
    languagePack.table_itemsPerPage,
    locale,
    intl,
  ]);

  if (debug) {
    debugLog("Receiving markdown text", { text, streaming });
  }

  return (
    <Markdown
      debug={debug}
      markdown={text}
      sanitizeHTML={doSanitize}
      streaming={streaming}
      localization={localization}
      dark={isDarkTheme}
      shouldRemoveHTMLBeforeMarkdownConversion={
        shouldRemoveHTMLBeforeMarkdownConversion
      }
    />
  );
}

const RichTextExport = React.memo(RichText, (prevProps, nextProps) => {
  // Custom comparison to prevent re-render when only streaming changes but content is the same
  const textEqual = prevProps.text === nextProps.text;
  const htmlConversionEqual =
    prevProps.shouldRemoveHTMLBeforeMarkdownConversion ===
    nextProps.shouldRemoveHTMLBeforeMarkdownConversion;
  const sanitizeEqual =
    prevProps.overrideSanitize === nextProps.overrideSanitize;

  // If text content is identical, we don't need to re-render regardless of streaming state
  if (textEqual && htmlConversionEqual && sanitizeEqual) {
    return true; // Skip re-render
  }

  // If text content changed, check if streaming state is relevant
  const streamingEqual = prevProps.streaming === nextProps.streaming;

  return textEqual && htmlConversionEqual && sanitizeEqual && streamingEqual;
});

export { RichTextExport as RichText };
export default RichTextExport;
