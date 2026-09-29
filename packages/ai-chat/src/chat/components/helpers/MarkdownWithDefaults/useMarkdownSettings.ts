/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useMemo } from 'react';
import { useIntl } from '../../../hooks/useIntl';
import { useSelector } from '../../../hooks/useSelector';

import { useShouldSanitizeHTML } from '../../../hooks/useShouldSanitizeHTML';
import { AppState } from '../../../../types/state/AppState';
import { shallowEqual } from '../../../store/appStore';

export function useMarkdownSettings(overrideSanitize?: boolean) {
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
    shallowEqual
  );
  const { formatMessage } = useIntl();
  const locale = useSelector(
    (state: AppState) => state.config.public.locale || 'en'
  );
  // Host markdown config, read from its own store slice (set in ChatAppEntry)
  // rather than a global context provider.
  const markdownConfig = useSelector((state: AppState) => state.markdownConfig);

  const getPaginationSupplementalText = useMemo(
    () =>
      ({ count }: { count: number }) =>
        formatMessage(
          { id: 'table_paginationSupplementalText' },
          { pagesCount: count }
        ),
    [formatMessage]
  );

  const getPaginationStatusText = useMemo(
    () =>
      ({ start, end, count }: { start: number; end: number; count: number }) =>
        formatMessage({ id: 'table_paginationStatus' }, { start, end, count }),
    [formatMessage]
  );

  const getLineCountText = useMemo(
    () =>
      ({ count }: { count: number }) =>
        formatMessage({ id: 'codeSnippet_lineCount' }, { count }),
    [formatMessage]
  );

  return useMemo(
    () => ({
      sanitizeHTML: doSanitize,
      markdownItPlugins: markdownConfig?.markdownItPlugins,
      customRenderers: markdownConfig?.customRenderers,

      codeSnippetShowLessText: languagePack.codeSnippet_showLessText,
      codeSnippetShowMoreText: languagePack.codeSnippet_showMoreText,
      codeSnippetCopyButtonTooltipContent:
        languagePack.codeSnippet_tooltipContent,
      codeSnippetGetLineCountText: getLineCountText,
      codeSnippetAriaLabelReadOnly: languagePack.codeSnippet_ariaLabelReadOnly,
      codeSnippetAriaLabelEditable: languagePack.codeSnippet_ariaLabelEditable,
      tableFilterPlaceholderText: languagePack.table_filterPlaceholder,
      tablePreviousPageText: languagePack.table_previousPage,
      tableNextPageText: languagePack.table_nextPage,
      tableItemsPerPageText: languagePack.table_itemsPerPage,
      tableDownloadLabelText: languagePack.table_downloadButton,
      tableLocale: locale,
      tableGetPaginationSupplementalText: getPaginationSupplementalText,
      tableGetPaginationStatusText: getPaginationStatusText,
    }),
    [
      doSanitize,
      markdownConfig,
      languagePack,
      locale,
      getLineCountText,
      getPaginationStatusText,
      getPaginationSupplementalText,
    ]
  );
}
