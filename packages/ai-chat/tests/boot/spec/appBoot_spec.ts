/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  applyBootContainerClasses,
  mergePublicConfig,
} from "../../../src/chat/boot/appBoot";
import { createBaseTestProps } from "../../test_helpers";

describe("mergePublicConfig", () => {
  it("merges defaults with provided config", () => {
    const base = createBaseTestProps();
    const publicConfig = mergePublicConfig(base);

    // Defaults applied
    expect(publicConfig.openChatByDefault).toBe(false);
    expect(publicConfig.launcher?.isOn).toBe(true);
    expect(publicConfig.shouldTakeFocusIfOpensAutomatically).toBe(true);

    // Provided fields preserved
    expect(publicConfig.messaging?.customSendMessage).toBe(
      base.messaging?.customSendMessage,
    );
    expect(publicConfig.exposeServiceManagerForTesting).toBe(true);
  });

  it("sets default assistantName to 'watsonx'", () => {
    const base = createBaseTestProps();
    const publicConfig = mergePublicConfig(base);

    expect(publicConfig.assistantName).toBe("watsonx");
  });

  it("preserves custom assistantName when provided", () => {
    const base = createBaseTestProps();
    base.assistantName = "Custom Assistant";
    const publicConfig = mergePublicConfig(base);

    expect(publicConfig.assistantName).toBe("Custom Assistant");
  });

  it("uses default assistantName when not provided", () => {
    const base = createBaseTestProps();
    delete (base as any).assistantName;
    const publicConfig = mergePublicConfig(base);

    expect(publicConfig.assistantName).toBe("watsonx");
  });

  it("allows empty string as assistantName", () => {
    const base = createBaseTestProps();
    base.assistantName = "";
    const publicConfig = mergePublicConfig(base);

    expect(publicConfig.assistantName).toBe("");
  });
});

describe("applyBootContainerClasses", () => {
  it("fills the container when a custom host element is present", () => {
    const container = document.createElement("div");

    applyBootContainerClasses(container, true);

    expect(container.classList.contains("cds-aichat--boot-container")).toBe(
      true,
    );
    expect(
      container.classList.contains("cds-aichat--boot-container--filled"),
    ).toBe(true);
    expect(
      container.classList.contains("cds-aichat--boot-container--collapsed"),
    ).toBe(false);
  });

  it("collapses the container when no custom host element is present", () => {
    const container = document.createElement("div");

    applyBootContainerClasses(container, false);

    expect(
      container.classList.contains("cds-aichat--boot-container--collapsed"),
    ).toBe(true);
    expect(
      container.classList.contains("cds-aichat--boot-container--filled"),
    ).toBe(false);
  });

  it("styles a second container on re-attach independently of the first", () => {
    const firstContainer = document.createElement("div");
    applyBootContainerClasses(firstContainer, true);

    const secondContainer = document.createElement("div");
    applyBootContainerClasses(secondContainer, false);

    expect(
      firstContainer.classList.contains("cds-aichat--boot-container--filled"),
    ).toBe(true);
    expect(
      secondContainer.classList.contains(
        "cds-aichat--boot-container--collapsed",
      ),
    ).toBe(true);
    expect(
      secondContainer.classList.contains("cds-aichat--boot-container--filled"),
    ).toBe(false);
  });
});
