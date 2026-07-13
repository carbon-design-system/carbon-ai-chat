/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Regression coverage for the web-component strings channel.
 *
 * To a consumer there is a single `strings` input. On the React surface it is a
 * top-level prop; on the web-component surface the flattened `strings` property
 * is folded into `config.strings` (`resolveFlattenedConfig`) and the element
 * passes only `.config` to `cds-aichat-internal` — never a separate `.strings`.
 *
 * The booted chat must honor strings supplied through that channel: a host
 * customizing `strings` on `cds-aichat-container` must see the override in the
 * `languagePack`, not have it reverted to the English defaults after mount.
 */

import { waitFor } from "@testing-library/react";

import "../../../src/web-components/cds-aichat-container";
import { createBaseConfig } from "../../test_helpers";
import { AppState } from "../../../src/types/state/AppState";
import { enLanguagePack } from "../../../src/types/config/PublicConfig";

describe("Web component: strings supplied through config", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  it("keeps config.strings overrides in the language pack and does not revert to defaults", async () => {
    let capturedInstance: any = null;

    const element = document.createElement("cds-aichat-container") as any;
    // The consumer's single `strings` input arrives here as config.strings (the
    // flattened web-component channel); no separate `.strings` property is set.
    element.config = {
      ...createBaseConfig(),
      strings: {
        input_placeholder: "Ask me anything…",
      },
    };
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

    const { serviceManager } = capturedInstance;
    const state: AppState = serviceManager.store.getState();
    // Overridden key reflects the custom string.
    expect(state.languagePack.input_placeholder).toBe("Ask me anything…");
    // Unspecified keys retain the English defaults.
    expect(state.languagePack.launcher_isOpen).toBe(
      enLanguagePack.launcher_isOpen,
    );
    // The intl formatter (formatMessage / useIntl consumers) reflects the same
    // override — both string sinks track the config.strings channel.
    expect(serviceManager.intl.formatMessage({ id: "input_placeholder" })).toBe(
      "Ask me anything…",
    );
  });
});
