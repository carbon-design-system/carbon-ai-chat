/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Covers the config-driven input flags (isVisible/isDisabled/isReadonly) under
 * the "derive from config" model. A runtime config change is applied purely by
 * the wholesale config replace in applyConfigChangesDynamically; the effective
 * values are read through the selectInput* selectors and are NEVER mirrored into
 * `assistantInputState`. Guarantees:
 *  - an in-place `input.isDisabled` change is reflected by the selector without
 *    cancelling the in-flight request or clearing the session, and
 *  - an unrelated lightweight change does not replace `assistantInputState`.
 */

import { applyConfigChangesDynamically } from "../../../src/chat/utils/dynamicConfigUpdates";
import {
  selectInputIsDisabled,
  selectInputIsReadonly,
} from "../../../src/chat/store/selectors";
import { createAppStore } from "../../../src/chat/store/appStore";
import {
  createAppConfig,
  createInitialState,
} from "../../../src/chat/store/doCreateStore";
import { reducers } from "../../../src/chat/store/reducers";
import actions from "../../../src/chat/store/actions";
import { ServiceManager } from "../../../src/chat/services/ServiceManager";
import { AppState } from "../../../src/types/state/AppState";
import { PublicConfig } from "../../../src/types/config/PublicConfig";

function createStore(initialState: AppState) {
  return createAppStore(
    (
      state: AppState,
      action: { type: string; [key: string]: unknown } | undefined,
    ): AppState =>
      action && reducers[action.type]
        ? reducers[action.type](state, action)
        : state,
    initialState,
  );
}

function makeServiceManager(initialState: AppState): ServiceManager {
  return {
    store: createStore(initialState),
    namespace: { suffix: "" },
    messageService: { timeoutMS: 30000 },
  } as any;
}

function initialAppState(config: PublicConfig): AppState {
  return createInitialState(createAppConfig(config));
}

describe("config-driven input flags", () => {
  it("reflects an in-place input.isDisabled toggle through the effective selector", async () => {
    // A fresh customSendMessage reference models a non-memoized consumer config.
    const prev: PublicConfig = {
      input: { isDisabled: false },
      messaging: { customSendMessage: () => {} },
    };
    const next: PublicConfig = {
      input: { isDisabled: true },
      messaging: { customSendMessage: () => {} },
    };

    const sm = makeServiceManager(initialAppState(prev));
    await applyConfigChangesDynamically(
      sm.store.getState().config.public,
      next,
      sm,
    );

    const state = sm.store.getState();
    // Effective value follows config — selectInputIsDisabled reads it directly.
    expect(selectInputIsDisabled(state)).toBe(true);
    expect(selectInputIsReadonly(state)).toBe(false);
  });

  it("re-enables the input via config", async () => {
    const prev: PublicConfig = { input: { isDisabled: true } };
    const next: PublicConfig = { input: { isDisabled: false } };

    const sm = makeServiceManager(initialAppState(prev));
    await applyConfigChangesDynamically(
      sm.store.getState().config.public,
      next,
      sm,
    );

    expect(selectInputIsDisabled(sm.store.getState())).toBe(false);
  });

  it("does NOT replace assistantInputState when an unrelated lightweight field changes", async () => {
    // assistantName is part of the lightweight bucket but does not touch the
    // input state; the input components must keep their existing state object.
    const prev: PublicConfig = { assistantName: "Before" };
    const next: PublicConfig = { assistantName: "After" };

    const sm = makeServiceManager(initialAppState(prev));
    const before = sm.store.getState().assistantInputState;

    await applyConfigChangesDynamically(
      sm.store.getState().config.public,
      next,
      sm,
    );

    const after = sm.store.getState().assistantInputState;
    expect(after).toBe(before); // reference preserved — no avoidable re-render
  });

  it("keeps an imperative isReadonly override across a later lightweight config change", async () => {
    // Models a host that mixes the deprecated imperative setter with declarative
    // config: instance.updateInputIsDisabled writes a non-null isReadonly slice
    // override. Config keeps the chat editable (isReadonly:false) and a separate
    // lightweight field changes. The OLD model re-applied config.isReadonly into
    // the slice on every lightweight change, clearing the override; the new
    // model never writes the slice, so the override survives and wins.
    const sm = makeServiceManager(
      initialAppState({
        isReadonly: false,
        assistantName: "Before",
      }),
    );

    // Imperative override marks the chat read-only (same dispatch as
    // updateInputIsDisabled writes after the Part B revert).
    sm.store.dispatch(actions.updateInputState({ isReadonly: true }, false));
    expect(selectInputIsReadonly(sm.store.getState())).toBe(true);

    // A lightweight config change (assistantName) that, under the old model,
    // would have re-applied config.isReadonly=false and cleared the override.
    const next: PublicConfig = {
      isReadonly: false,
      assistantName: "After",
    };
    await applyConfigChangesDynamically(
      sm.store.getState().config.public,
      next,
      sm,
    );

    const state = sm.store.getState();
    // The override still wins, and it remains a real (non-null) slice value.
    expect(selectInputIsReadonly(state)).toBe(true);
    expect(state.assistantInputState.isReadonly).toBe(true);
  });
});
