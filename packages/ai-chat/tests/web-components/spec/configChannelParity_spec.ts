/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Cross-surface parity guard.
 *
 * `strings` and `markdown` (and `serviceDesk` / `serviceDeskFactory`) are a
 * single consumer input each, but they reach the core through two wrappers: the
 * React `ChatContainer` and the `cds-aichat-container` web component. Both now
 * fold every flattened field into one effective `config` via the shared
 * `resolveFlattenedConfig`, then hand `ChatAppEntry` only that `config`. This
 * test pins that the *same* `strings` + `markdown` input lands identically in
 * the store through both surfaces, so the two reconstructions can never drift.
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";

import "../../../src/web-components/cds-aichat-container";
import { ChatContainer } from "../../../src/react/ChatContainer";
import { createBaseTestProps, createBaseConfig } from "../../test_helpers";
import { AppState } from "../../../src/types/state/AppState";

/** A sentinel markdown-it plugin; identity is asserted across both surfaces. */
const sharedMarkdownPlugin = () => {};
const strings = { input_placeholder: "Parity placeholder" };
const markdown = { markdownItPlugins: [sharedMarkdownPlugin] };

async function bootReact(): Promise<AppState> {
  let capturedInstance: any = null;
  render(
    React.createElement(ChatContainer, {
      ...createBaseTestProps(),
      strings,
      markdown,
      onBeforeRender: (instance: any) => {
        capturedInstance = instance;
      },
    }),
  );
  await waitFor(() => expect(capturedInstance).not.toBeNull(), {
    timeout: 5000,
  });
  return capturedInstance.serviceManager.store.getState();
}

async function bootWebComponent(): Promise<AppState> {
  let capturedInstance: any = null;
  const element = document.createElement("cds-aichat-container") as any;
  element.config = { ...createBaseConfig() };
  // The single consumer inputs arrive as flattened properties on the element.
  element.strings = strings;
  element.markdown = markdown;
  element.onBeforeRender = (instance: any) => {
    capturedInstance = instance;
  };
  document.body.appendChild(element);
  await waitFor(() => expect(capturedInstance).not.toBeNull(), {
    timeout: 5000,
  });
  return capturedInstance.serviceManager.store.getState();
}

describe("Config channel parity (React vs web component)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  it("lands the same strings + markdown input identically through both surfaces", async () => {
    const reactState = await bootReact();
    const wcState = await bootWebComponent();

    // strings -> languagePack: same override on both surfaces.
    expect(reactState.languagePack.input_placeholder).toBe(
      "Parity placeholder",
    );
    expect(wcState.languagePack.input_placeholder).toBe(
      reactState.languagePack.input_placeholder,
    );

    // markdown -> markdownConfig slice: same plugin reference on both surfaces.
    expect(reactState.markdownConfig?.markdownItPlugins?.[0]).toBe(
      sharedMarkdownPlugin,
    );
    expect(wcState.markdownConfig?.markdownItPlugins?.[0]).toBe(
      reactState.markdownConfig?.markdownItPlugins?.[0],
    );
  });
});
