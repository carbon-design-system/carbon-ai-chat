/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import { render } from "@testing-library/react";

// Mock all hooks the component reads so the test doesn't need the full
// provider stack (store / intl / language pack).
jest.mock("../../../src/chat/hooks/useIntl", () => ({
  useIntl: () => ({ formatMessage: () => "" }),
}));
jest.mock("../../../src/chat/hooks/useSelector", () => ({
  useSelector: () => "en",
}));
jest.mock("../../../src/chat/hooks/useLanguagePack", () => ({
  useLanguagePack: () => ({
    codeSnippet_showLessText: "",
    codeSnippet_showMoreText: "",
    codeSnippet_tooltipContent: "",
    codeSnippet_ariaLabelReadOnly: "",
    codeSnippet_ariaLabelEditable: "",
    codeSnippet_lineCount: "",
    table_filterPlaceholder: "",
    table_previousPage: "",
    table_nextPage: "",
    table_itemsPerPage: "",
    table_downloadButton: "",
    table_paginationSupplementalText: "",
    table_paginationStatusText: "",
  }),
}));
jest.mock("../../../src/chat/hooks/useShouldSanitizeHTML", () => ({
  useShouldSanitizeHTML: () => false,
}));

// Capture props the bridge component receives so we can assert on the
// pass-through. `customRenderers` reaches the components-package's React
// `Markdown` (covered by web-component tests), this spec just verifies the
// chat-app wiring forwards the context value through.
const capturedProps: Array<Record<string, unknown>> = [];
jest.mock("@carbon/ai-chat-components/es/react/markdown.js", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>): null => {
    capturedProps.push(props);
    return null;
  },
}));

import { MarkdownConfigContext } from "../../../src/chat/contexts/MarkdownConfigContext";
import { MarkdownWithDefaults } from "../../../src/chat/components/util/MarkdownWithDefaults";

beforeEach(() => {
  capturedProps.length = 0;
});

describe("MarkdownWithDefaults", () => {
  it("forwards markdown source to the underlying Markdown component", () => {
    render(<MarkdownWithDefaults text="# Hello" />);
    expect(capturedProps).toHaveLength(1);
    expect(capturedProps[0].markdown).toBe("# Hello");
  });

  it("forwards customRenderers from MarkdownConfigContext", () => {
    const renderers = {
      table: () => <span>react override</span>,
      codeBlock: (): null => null,
    };
    render(
      <MarkdownConfigContext.Provider value={{ customRenderers: renderers }}>
        <MarkdownWithDefaults text="# Hello" />
      </MarkdownConfigContext.Provider>,
    );
    expect(capturedProps[0].customRenderers).toBe(renderers);
  });

  it("forwards markdownItPlugins from MarkdownConfigContext", () => {
    const plugins = [() => {}];
    render(
      <MarkdownConfigContext.Provider value={{ markdownItPlugins: plugins }}>
        <MarkdownWithDefaults text="# Hello" />
      </MarkdownConfigContext.Provider>,
    );
    expect(capturedProps[0].markdownItPlugins).toBe(plugins);
  });

  it("passes undefined customRenderers when no context provider is set", () => {
    render(<MarkdownWithDefaults text="# Hello" />);
    expect(capturedProps[0].customRenderers).toBeUndefined();
  });
});
