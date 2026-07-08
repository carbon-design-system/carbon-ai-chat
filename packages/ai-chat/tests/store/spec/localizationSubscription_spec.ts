/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Coverage for `refreshLocalizationOnChange` — the store subscription that is the
 * single post-boot owner of `serviceManager.intl`. It rebuilds the i18n formatter
 * (and, on a locale change, the dayjs locale) from the `languagePack` slice and
 * `config.locale`, so `formatMessage`/`useIntl` consumers can never go stale after
 * a runtime strings or locale change — regardless of which channel carried it.
 *
 * These exercise the real serviceManager object directly (not the testing copy
 * exposed on `ChatInstance.serviceManager`, which snapshots `.intl` at boot).
 */

import { waitFor } from "@testing-library/react";

import { makeConfigStore, applyConfigChange } from "../../test_helpers";
import { refreshLocalizationOnChange } from "../../../src/chat/store/subscriptions";
import actions from "../../../src/chat/store/actions";
import { buildLanguagePack } from "../../../src/chat/store/doCreateStore";
import { ServiceManager } from "../../../src/chat/services/ServiceManager";
import { PublicConfig } from "../../../src/types/config/PublicConfig";

const BASE_CONFIG: PublicConfig = { locale: "en" };

describe("refreshLocalizationOnChange", () => {
  it("rebuilds the intl formatter when the languagePack slice changes", () => {
    const store = makeConfigStore(BASE_CONFIG);
    const serviceManager = { store } as unknown as ServiceManager;
    store.subscribe(refreshLocalizationOnChange(serviceManager));

    store.dispatch(
      actions.setAppStateValue(
        "languagePack",
        buildLanguagePack({ input_placeholder: "Custom placeholder" }),
      ),
    );

    // A strings-only change is applied synchronously (no locale reload).
    expect(serviceManager.intl.formatMessage({ id: "input_placeholder" })).toBe(
      "Custom placeholder",
    );
  });

  it("does not touch the formatter when an unrelated slice changes", () => {
    const store = makeConfigStore(BASE_CONFIG);
    const serviceManager = { store } as unknown as ServiceManager;
    store.subscribe(refreshLocalizationOnChange(serviceManager));

    store.dispatch(actions.changeState({ showNonHeaderBackgroundCover: true }));

    expect(serviceManager.intl).toBeUndefined();
  });

  it("switches the intl locale when config.locale changes at runtime", async () => {
    const store = makeConfigStore(BASE_CONFIG);
    const serviceManager = { store } as unknown as ServiceManager;
    store.subscribe(refreshLocalizationOnChange(serviceManager));

    applyConfigChange(store, { ...BASE_CONFIG, locale: "de" });

    // A locale change reloads the dayjs locale data (async) before rebuilding.
    await waitFor(() => {
      expect(serviceManager.intl?.locale).toBe("de");
    });
  });
});
