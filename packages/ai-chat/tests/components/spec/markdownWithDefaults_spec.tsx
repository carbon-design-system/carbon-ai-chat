/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { ReactElement } from "react";
import { render } from "@testing-library/react";

// Mock the hooks that need provider context (intl) or are orthogonal to this
// spec (sanitize). Language pack, locale, and the markdown config come from a
// REAL store via `useSelector` so this spec exercises the `markdownConfig` slice
// that replaced the old MarkdownConfigContext.
jest.mock("../../../src/chat/hooks/useIntl", () => ({
  useIntl: () => ({ formatMessage: () => "" }),
}));
jest.mock("../../../src/chat/hooks/useShouldSanitizeHTML", () => ({
  useShouldSanitizeHTML: () => false,
}));

// Capture props the bridge component receives so we can assert on the
// pass-through. `customRenderers` reaches the components-package's React
// `Markdown` (covered by web-component tests); this spec just verifies the
// chat-app wiring forwards the markdown config through.
const capturedProps: Array<Record<string, unknown>> = [];
jest.mock("@carbon/ai-chat-components/es/react/markdown.js", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>): null => {
    capturedProps.push(props);
    return null;
  },
}));

import { StoreProvider } from "../../../src/chat/providers/StoreProvider";
import actions from "../../../src/chat/store/actions";
import { MarkdownConfig } from "../../../src/types/config/MarkdownConfig";
import { MarkdownWithDefaults } from "../../../src/chat/components/util/MarkdownWithDefaults";
import { makeConfigStore } from "../../test_helpers";

function renderWithStore(ui: ReactElement, markdownConfig?: MarkdownConfig) {
  const store = makeConfigStore({});
  if (markdownConfig !== undefined) {
    store.dispatch(actions.setAppStateValue("markdownConfig", markdownConfig));
  }
  return render(<StoreProvider store={store}>{ui}</StoreProvider>);
}

beforeEach(() => {
  capturedProps.length = 0;
});

describe("MarkdownWithDefaults", () => {
  it("forwards markdown source to the underlying Markdown component", () => {
    renderWithStore(<MarkdownWithDefaults text="# Hello" />);
    expect(capturedProps).toHaveLength(1);
    expect(capturedProps[0].markdown).toBe("# Hello");
  });

  it("forwards customRenderers from the markdownConfig slice", () => {
    const renderers = {
      table: () => <span>react override</span>,
      codeBlock: (): null => null,
    };
    renderWithStore(<MarkdownWithDefaults text="# Hello" />, {
      customRenderers: renderers,
    });
    expect(capturedProps[0].customRenderers).toBe(renderers);
  });

  it("forwards markdownItPlugins from the markdownConfig slice", () => {
    const plugins = [() => {}];
    renderWithStore(<MarkdownWithDefaults text="# Hello" />, {
      markdownItPlugins: plugins,
    });
    expect(capturedProps[0].markdownItPlugins).toBe(plugins);
  });

  it("passes undefined customRenderers when no markdownConfig is set", () => {
    renderWithStore(<MarkdownWithDefaults text="# Hello" />);
    expect(capturedProps[0].customRenderers).toBeUndefined();
  });
});
