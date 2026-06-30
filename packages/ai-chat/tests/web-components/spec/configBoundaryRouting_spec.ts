/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Cross-surface re-render guard: a prop update driven through the public
 * web-component boundary (`cds-aichat-container` -> `cds-aichat-internal` ->
 * `root.render` -> `ChatAppEntry`) must reach the store as a single, reconciled
 * change. Reference reconciliation is what lets the narrowed selectors that drive
 * `AppShell` and the message list skip re-rendering on an unrelated update — so
 * we assert that changing one field leaves unrelated slice/sub-object references
 * identical.
 *
 * (A true React render-count assertion across the surface needs a Profiler in a
 * real browser; that is a follow-up Playwright test. Reference stability is the
 * proxy that actually determines whether those selectors re-render.)
 */

import { waitFor } from "@testing-library/react";

import "../../../src/web-components/cds-aichat-container";
import { createBaseConfig } from "../../test_helpers";
import { AppState } from "../../../src/types/state/AppState";

describe("Web component: prop-update boundary routing", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  it("reconciles a single-field update so unrelated references stay stable", async () => {
    let capturedInstance: any = null;

    const element = document.createElement("cds-aichat-container") as any;
    element.config = { ...createBaseConfig() };
    element.header = { title: "Title A" };
    element.onBeforeRender = (instance: any) => {
      capturedInstance = instance;
    };
    document.body.appendChild(element);

    await waitFor(
      () => {
        expect(capturedInstance).not.toBeNull();
      },
      { timeout: 5000 },
    );

    const store = capturedInstance.serviceManager.store;
    const before = store.getState() as AppState;
    const beforeLanguagePack = before.languagePack;
    const beforeTheme = before.config.derived.themeWithDefaults;
    expect(before.config.derived.header?.title).toBe("Title A");

    // Update only the header through the flattened web-component surface.
    element.header = { title: "Title B" };
    await element.updated();

    await waitFor(
      () => {
        expect(
          (store.getState() as AppState).config.derived.header?.title,
        ).toBe("Title B");
      },
      { timeout: 5000 },
    );

    const after = store.getState() as AppState;
    // The unrelated language-pack slice was not touched at all.
    expect(after.languagePack).toBe(beforeLanguagePack);
    // The unrelated derived sub-object kept its reference via reconciliation, so
    // selectors reading it (and the memoized AppShell) do not re-render.
    expect(after.config.derived.themeWithDefaults).toBe(beforeTheme);
  });
});
