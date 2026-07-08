/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Re-render evidence for the config-change audit. Renders independent probe
 * components — each subscribing to the store through the real `useSelector` with
 * a narrowed selector — then applies a runtime config change exactly the way
 * `applyConfigChangesDynamically` does (rebuild the AppConfig, reconcile
 * references, dispatch the wholesale `changeState({ config })`). It counts how
 * many times each probe renders to prove a single-field change produces a
 * minimal, targeted set of re-renders rather than a tree-wide one.
 *
 * This is the deterministic counterpart to a live browser render trace.
 */

import React, { ReactElement } from "react";
import { render, act } from "@testing-library/react";

import { StoreProvider } from "../../../src/chat/providers/StoreProvider";
import { useSelector } from "../../../src/chat/hooks/useSelector";
import { useShouldSanitizeHTML } from "../../../src/chat/hooks/useShouldSanitizeHTML";
import { selectMessagesState } from "../../../src/chat/components-legacy/MessagesComponent";
import {
  selectInputIsDisabled,
  selectInputUploadAndStreamingFields,
} from "../../../src/chat/store/selectors";
import actions from "../../../src/chat/store/actions";
import { shallowEqual } from "../../../src/chat/store/appStore";
import { AppState } from "../../../src/types/state/AppState";
import { PublicConfig } from "../../../src/types/config/PublicConfig";
import { makeConfigStore, applyConfigChange } from "../../test_helpers";

/** Build a store seeded from config, using the shared harness. */
const makeStore = makeConfigStore;

const BASE_CONFIG: PublicConfig = {
  header: { name: "Assistant" },
  layout: { showFrame: true },
  launcher: { isOn: true },
  input: { isDisabled: false },
  shouldSanitizeHTML: true,
} as PublicConfig;

describe("config-change re-render counts", () => {
  it("a single input.isDisabled toggle re-renders only the input-flag consumer", () => {
    const store = makeStore(BASE_CONFIG);
    const counts = {
      header: 0,
      languagePack: 0,
      sanitize: 0,
      inputDisabled: 0,
    };

    function HeaderProbe(): ReactElement {
      useSelector((s: AppState) => s.config.derived.header);
      counts.header += 1;
      return null;
    }
    function LanguagePackProbe(): ReactElement {
      useSelector((s: AppState) => s.languagePack);
      counts.languagePack += 1;
      return null;
    }
    function SanitizeProbe(): ReactElement {
      useShouldSanitizeHTML();
      counts.sanitize += 1;
      return null;
    }
    function InputDisabledProbe(): ReactElement {
      useSelector(selectInputIsDisabled);
      counts.inputDisabled += 1;
      return null;
    }

    render(
      <StoreProvider store={store}>
        <HeaderProbe />
        <LanguagePackProbe />
        <SanitizeProbe />
        <InputDisabledProbe />
      </StoreProvider>,
    );

    // Baseline: each probe rendered once on mount.
    expect(counts).toEqual({
      header: 1,
      languagePack: 1,
      sanitize: 1,
      inputDisabled: 1,
    });

    // Toggle ONLY input.isDisabled.
    applyConfigChange(store, {
      ...BASE_CONFIG,
      input: { isDisabled: true },
    });

    // Only the input-flag consumer re-rendered. Header / languagePack / sanitize
    // read sub-objects/primitives that did not change, so their references were
    // preserved by reconciliation and they did NOT re-render.
    expect(counts.inputDisabled).toBe(2);
    expect(counts.header).toBe(1);
    expect(counts.languagePack).toBe(1);
    expect(counts.sanitize).toBe(1);
  });

  it("a function-prop reference change re-renders nothing (churn immunity)", () => {
    const store = makeStore({ ...BASE_CONFIG, onError: () => undefined });
    const counts = {
      header: 0,
      languagePack: 0,
      sanitize: 0,
      inputDisabled: 0,
    };

    function HeaderProbe(): ReactElement {
      useSelector((s: AppState) => s.config.derived.header);
      counts.header += 1;
      return null;
    }
    function LanguagePackProbe(): ReactElement {
      useSelector((s: AppState) => s.languagePack);
      counts.languagePack += 1;
      return null;
    }
    function SanitizeProbe(): ReactElement {
      useShouldSanitizeHTML();
      counts.sanitize += 1;
      return null;
    }
    function InputDisabledProbe(): ReactElement {
      useSelector(selectInputIsDisabled);
      counts.inputDisabled += 1;
      return null;
    }

    render(
      <StoreProvider store={store}>
        <HeaderProbe />
        <LanguagePackProbe />
        <SanitizeProbe />
        <InputDisabledProbe />
      </StoreProvider>,
    );

    expect(counts).toEqual({
      header: 1,
      languagePack: 1,
      sanitize: 1,
      inputDisabled: 1,
    });

    // Re-supply an otherwise-identical config with only a NEW onError instance —
    // the classic inline-callback churn. Every value-equal sub-object keeps its
    // reference, so no probe re-renders.
    applyConfigChange(store, { ...BASE_CONFIG, onError: () => undefined });

    expect(counts).toEqual({
      header: 1,
      languagePack: 1,
      sanitize: 1,
      inputDisabled: 1,
    });
  });

  it("a header change re-renders the header consumer but not the others", () => {
    const store = makeStore(BASE_CONFIG);
    const counts = { header: 0, languagePack: 0, inputDisabled: 0 };

    function HeaderProbe(): ReactElement {
      useSelector((s: AppState) => s.config.derived.header);
      counts.header += 1;
      return null;
    }
    function LanguagePackProbe(): ReactElement {
      useSelector((s: AppState) => s.languagePack);
      counts.languagePack += 1;
      return null;
    }
    function InputDisabledProbe(): ReactElement {
      useSelector(selectInputIsDisabled);
      counts.inputDisabled += 1;
      return null;
    }

    render(
      <StoreProvider store={store}>
        <HeaderProbe />
        <LanguagePackProbe />
        <InputDisabledProbe />
      </StoreProvider>,
    );

    applyConfigChange(store, {
      ...BASE_CONFIG,
      header: { name: "Renamed" },
    });

    expect(counts.header).toBe(2);
    expect(counts.languagePack).toBe(1);
    expect(counts.inputDisabled).toBe(1);
  });

  // A component subscribes to a SINGLE language-pack string (the new pattern that
  // replaced the whole-pack `useLanguagePack()` context). It must NOT re-render on
  // an unrelated config change, and must re-render only when the string it reads
  // actually changes — not when some other string changes.
  it("a single-string languagePack subscriber re-renders only when that string changes", () => {
    const store = makeStore(BASE_CONFIG);
    let consumerRenders = 0;

    function SingleStringConsumer(): ReactElement {
      useSelector((s: AppState) => s.languagePack.ai_slug_label);
      consumerRenders += 1;
      return null;
    }

    render(
      <StoreProvider store={store}>
        <SingleStringConsumer />
      </StoreProvider>,
    );
    expect(consumerRenders).toBe(1);

    // Unrelated config change does NOT re-render it.
    applyConfigChange(store, { ...BASE_CONFIG, header: { name: "Renamed" } });
    expect(consumerRenders).toBe(1);

    // Changing a DIFFERENT string does NOT re-render it (granularity win).
    act(() => {
      store.dispatch(
        actions.setAppStateValue("languagePack", {
          ...store.getState().languagePack,
          ai_slug_title: "Other",
        }),
      );
    });
    expect(consumerRenders).toBe(1);

    // Changing the string it actually reads DOES re-render it.
    act(() => {
      store.dispatch(
        actions.setAppStateValue("languagePack", {
          ...store.getState().languagePack,
          ai_slug_label: "Custom",
        }),
      );
    });
    expect(consumerRenders).toBe(2);
  });

  // Regression: MessagesComponent's injected state (the bag built by its
  // module-level selector) used to pull in the whole `config` object, so every
  // config field change re-created the bag and re-rendered the component. The
  // narrowed bag selects only the specific config fields the component reads,
  // each of which stays referentially stable across unrelated config changes
  // (via reconciliation), so an unrelated config change must NOT re-render a
  // subscriber to the bag.
  it("an unrelated config change does NOT re-render MessagesComponent's narrowed injected-state subscriber", () => {
    const store = makeStore(BASE_CONFIG);
    let messagesBagRenders = 0;

    function MessagesBagProbe(): ReactElement {
      // Subscribe through the REAL selector MessagesComponent uses, so this
      // test catches a regression where the selector picks up a field whose
      // reference is not preserved by reconciliation.
      useSelector(selectMessagesState, shallowEqual);
      messagesBagRenders += 1;
      return null;
    }

    render(
      <StoreProvider store={store}>
        <MessagesBagProbe />
      </StoreProvider>,
    );
    expect(messagesBagRenders).toBe(1);

    // Unrelated config change: header rename. The narrow bag's fields are
    // untouched, so shallowEqual returns true and the probe does NOT re-render.
    applyConfigChange(store, {
      ...BASE_CONFIG,
      header: { name: "Renamed" },
    });
    expect(messagesBagRenders).toBe(1);

    // Sanity: when one of the tracked fields DOES change (persistFeedback),
    // the probe re-renders.
    applyConfigChange(store, {
      ...BASE_CONFIG,
      persistFeedback: true,
    } as PublicConfig);
    expect(messagesBagRenders).toBe(2);
  });

  // Regression: AppShell subscribes to the file-upload + streaming subset of
  // the active input slice (via selectInputUploadAndStreamingFields +
  // shallowEqual) rather than the whole slice. A `rawValue` / `displayValue`
  // update dispatched on every keystroke must NOT re-render that subscriber.
  it("a rawValue/displayValue update does NOT re-render selectInputUploadAndStreamingFields subscribers", () => {
    const store = makeStore(BASE_CONFIG);
    let uploadProbeRenders = 0;

    function UploadFieldsProbe(): ReactElement {
      useSelector(selectInputUploadAndStreamingFields, shallowEqual);
      uploadProbeRenders += 1;
      return null;
    }

    render(
      <StoreProvider store={store}>
        <UploadFieldsProbe />
      </StoreProvider>,
    );
    expect(uploadProbeRenders).toBe(1);

    // Simulate Input.tsx writing the value on each keystroke.
    act(() => {
      store.dispatch(
        actions.updateInputState({ rawValue: "h", displayValue: "h" }, false),
      );
    });
    act(() => {
      store.dispatch(
        actions.updateInputState({ rawValue: "hi", displayValue: "hi" }, false),
      );
    });

    // The probe's selected fields (allowFileUploads, files, pendingUploads,
    // stopStreamingButtonState, etc.) are untouched, so shallowEqual returns
    // true and no re-render fires.
    expect(uploadProbeRenders).toBe(1);

    // Sanity: when a tracked field DOES change, the probe re-renders.
    act(() => {
      store.dispatch(
        actions.updateInputState({ allowFileUploads: true }, false),
      );
    });
    expect(uploadProbeRenders).toBe(2);
  });
});
