/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { render } from '@testing-library/react';

import { MarkdownWithDefaults } from '../MarkdownWithDefaults';
import {
  makeConfigStore,
  TestChatContext,
} from '../../../../__tests__/helpers/chat';

// The format callbacks return their message id and values, so the test can
// check what each callback asks the language pack for.
vi.mock('../../../../hooks/useIntl', () => ({
  useIntl: () => ({
    formatMessage: ({ id }: { id: string }, values: unknown) => ({
      id,
      values,
    }),
  }),
}));

// Capture the props the components package's `Markdown` receives. The element
// calls the table callbacks only when a table paginates, which needs a real
// browser, so the test calls them itself.
const { capturedProps } = vi.hoisted(() => ({
  capturedProps: [] as Array<Record<string, unknown>>,
}));
vi.mock('@carbon/ai-chat-components/es/react/markdown.js', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>): null => {
    capturedProps.push(props);
    return null;
  },
}));

type FormatCallback = (args: Record<string, number>) => unknown;

beforeEach(() => {
  capturedProps.length = 0;
});

it('preserves per-call options, locale, translations, and format callbacks', () => {
  const store = makeConfigStore({ locale: 'fr' });
  render(
    <TestChatContext store={store}>
      <MarkdownWithDefaults
        text="source"
        removeHTML
        overrideSanitize
        streaming
        highlight={false}
      />
    </TestChatContext>
  );
  const props = capturedProps[0];
  expect(props).toMatchObject({
    markdown: 'source',
    sanitizeHTML: true,
    removeHTML: true,
    streaming: true,
    codeSnippetHighlight: false,
    tableLocale: 'fr',
  });
  const pack = store.getState().languagePack;
  expect(props).toMatchObject({
    codeSnippetShowLessText: pack.codeSnippet_showLessText,
    codeSnippetShowMoreText: pack.codeSnippet_showMoreText,
    codeSnippetCopyButtonTooltipContent: pack.codeSnippet_tooltipContent,
    codeSnippetAriaLabelReadOnly: pack.codeSnippet_ariaLabelReadOnly,
    codeSnippetAriaLabelEditable: pack.codeSnippet_ariaLabelEditable,
    tableFilterPlaceholderText: pack.table_filterPlaceholder,
    tablePreviousPageText: pack.table_previousPage,
    tableNextPageText: pack.table_nextPage,
    tableItemsPerPageText: pack.table_itemsPerPage,
    tableDownloadLabelText: pack.table_downloadButton,
  });
  expect(
    (props.codeSnippetGetLineCountText as FormatCallback)({ count: 3 })
  ).toEqual({ id: 'codeSnippet_lineCount', values: { count: 3 } });
  expect(
    (props.tableGetPaginationSupplementalText as FormatCallback)({ count: 4 })
  ).toEqual({
    id: 'table_paginationSupplementalText',
    values: { pagesCount: 4 },
  });
  expect(
    (props.tableGetPaginationStatusText as FormatCallback)({
      start: 1,
      end: 2,
      count: 4,
    })
  ).toEqual({
    id: 'table_paginationStatus',
    values: { start: 1, end: 2, count: 4 },
  });
});
