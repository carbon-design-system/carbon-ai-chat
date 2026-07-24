/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Render-count regression guards for the re-render hardening work. Each test
 * mounts a probe subscribing through the REAL `useSelector` and asserts that a
 * given store change produces a minimal, targeted set of re-renders rather than
 * a tree-wide one. Deterministic counterpart to the live browser render trace.
 */

import React, { ReactElement } from "react";
import { render, act } from "@testing-library/react";

import { StoreProvider } from "../../../src/chat/providers/StoreProvider";
import { useSelector } from "../../../src/chat/hooks/useSelector";
import { selectMessagesState } from "../../../src/chat/components-legacy/MessagesComponent";
import { selectLanguagePack } from "../../../src/chat/store/selectors";
import actions from "../../../src/chat/store/actions";
import { shallowEqual } from "../../../src/chat/store/appStore";
import { AppState } from "../../../src/types/state/AppState";
import { PublicConfig } from "../../../src/types/config/PublicConfig";
import { makeConfigStore } from "../../test_helpers";

const makeStore = makeConfigStore;

const BASE_CONFIG: PublicConfig = {
  header: { name: "Assistant" },
  input: { isDisabled: false },
} as PublicConfig;

describe("render hardening", () => {
  // Regression for Fix 1: `selectMessagesState` used to map in the whole
  // `assistantInputState` slice (which it never read), so every keystroke —
  // an UPDATE_INPUT_STATE that replaces that slice — re-rendered the entire
  // message list. The dead field is gone, so a keystroke must NOT re-render a
  // subscriber to the bag.
  it("a keystroke does NOT re-render selectMessagesState subscribers", () => {
    const store = makeStore(BASE_CONFIG);
    let messageBagRenders = 0;

    function MessagesBagProbe(): ReactElement {
      useSelector(selectMessagesState, shallowEqual);
      messageBagRenders += 1;
      return null;
    }

    render(
      <StoreProvider store={store}>
        <MessagesBagProbe />
      </StoreProvider>,
    );
    expect(messageBagRenders).toBe(1);

    // Two keystrokes (rawValue/content updates), exactly what Input.tsx
    // dispatches as the user types.
    act(() => {
      store.dispatch(
        actions.updateInputState(
          { rawValue: "h", content: { type: "doc", content: [] } },
          false,
        ),
      );
    });
    act(() => {
      store.dispatch(
        actions.updateInputState(
          { rawValue: "hi", content: { type: "doc", content: [] } },
          false,
        ),
      );
    });
    expect(messageBagRenders).toBe(1);

    // Sanity: a field the bag actually reads (persisted storage) re-renders it.
    act(() => {
      store.dispatch(
        actions.setAppStateValue("persistedToBrowserStorage", {
          ...store.getState().persistedToBrowserStorage,
          hasSentNonWelcomeMessage: true,
        }),
      );
    });
    expect(messageBagRenders).toBe(2);
  });

  // Regression for Fix 5: the language pack lives in its own slice and is
  // updated via a shallow `setAppStateValue("languagePack", ...)`. Updating it
  // must re-render language-pack consumers WITHOUT touching config consumers.
  it("a languagePack update re-renders only languagePack consumers, not config consumers", () => {
    const store = makeStore(BASE_CONFIG);
    let languagePackRenders = 0;
    let headerRenders = 0;

    function LanguagePackProbe(): ReactElement {
      useSelector(selectLanguagePack);
      languagePackRenders += 1;
      return null;
    }
    function HeaderProbe(): ReactElement {
      useSelector((s: AppState) => s.config.derived.header);
      headerRenders += 1;
      return null;
    }

    render(
      <StoreProvider store={store}>
        <LanguagePackProbe />
        <HeaderProbe />
      </StoreProvider>,
    );
    expect(languagePackRenders).toBe(1);
    expect(headerRenders).toBe(1);

    act(() => {
      store.dispatch(
        actions.setAppStateValue("languagePack", {
          ...store.getState().languagePack,
          input_placeholder: "Custom",
        }),
      );
    });

    // Only the language-pack consumer re-renders; config consumers are untouched.
    expect(languagePackRenders).toBe(2);
    expect(headerRenders).toBe(1);
  });
});
