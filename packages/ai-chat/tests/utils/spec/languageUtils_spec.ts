/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import dayjs from "dayjs";
import {
  localeLoaders,
  loadDayjsLocale,
} from "../../../src/chat/utils/languageUtils";

describe("languageUtils", () => {
  it("exposes locale loaders", () => {
    expect(typeof localeLoaders.en).toBe("function");
    expect(typeof localeLoaders.fr).toBe("function");
  });

  it("loads a locale when requested", async () => {
    await loadDayjsLocale("fr");
    expect(dayjs.Ls.fr).toBeDefined();
  });

  it("falls back to language when region is unsupported", async () => {
    const locale = await loadDayjsLocale("en-zz");
    expect(locale).toBe("en");
  });

  it("throws for unknown locale code", async () => {
    await expect(loadDayjsLocale("zz")).rejects.toThrow(
      "Locale is not recognized.",
    );
  });
});
