/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { ChatContainer } from "../../../src/react/ChatContainer";
import { PublicConfig } from "../../../src/types/config/PublicConfig";
import { createBaseTestConfig } from "../../utils/testHelpers";
import { AppState } from "../../../src/types/state/AppState";

describe("Config Miscellaneous", () => {
  const createBaseConfig = (): PublicConfig => ({
    ...createBaseTestConfig(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("boolean flags", () => {
    const booleanProperties = [
      "disableCustomElementMobileEnhancements",
      "shouldSanitizeHTML",
      "disableWindowTitleChanges",
      "isReadonly",
    ] as const;

    booleanProperties.forEach((property) => {
      describe(property, () => {
        it(`should store ${property}: true in Redux state`, async () => {
          const config: PublicConfig = {
            ...createBaseConfig(),
            [property]: true,
          };

          let capturedInstance: any = null;
          const onBeforeRender = jest.fn((instance) => {
            capturedInstance = instance;
          });

          render(
            React.createElement(ChatContainer, {
              config,
              onBeforeRender,
            }),
          );

          await waitFor(
            () => {
              expect(capturedInstance).not.toBeNull();
            },
            { timeout: 5000 },
          );

          const store = (capturedInstance as any).serviceManager.store;
          const state: AppState = store.getState();
          expect(state.config.public[property]).toBe(true);
        });

        it(`should store ${property}: false in Redux state`, async () => {
          const config: PublicConfig = {
            ...createBaseConfig(),
            [property]: false,
          };

          let capturedInstance: any = null;
          const onBeforeRender = jest.fn((instance) => {
            capturedInstance = instance;
          });

          render(
            React.createElement(ChatContainer, {
              config,
              onBeforeRender,
            }),
          );

          await waitFor(
            () => {
              expect(capturedInstance).not.toBeNull();
            },
            { timeout: 5000 },
          );

          const store = (capturedInstance as any).serviceManager.store;
          const state: AppState = store.getState();
          expect(state.config.public[property]).toBe(false);
        });

        it(`should handle undefined ${property} in Redux state`, async () => {
          const config: PublicConfig = {
            ...createBaseConfig(),
            // property intentionally omitted
          };

          let capturedInstance: any = null;
          const onBeforeRender = jest.fn((instance) => {
            capturedInstance = instance;
          });

          render(
            React.createElement(ChatContainer, {
              config,
              onBeforeRender,
            }),
          );

          await waitFor(
            () => {
              expect(capturedInstance).not.toBeNull();
            },
            { timeout: 5000 },
          );

          const store = (capturedInstance as any).serviceManager.store;
          const state: AppState = store.getState();
          expect(state.config.public[property]).toBeUndefined();
        });
      });
    });
  });

  describe("string", () => {
    it("should store botAvatarURL in Redux state", async () => {
      const botAvatarURL = "https://example.com/avatar.png";
      const config: PublicConfig = {
        ...createBaseConfig(),
        botAvatarURL,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(
        React.createElement(ChatContainer, {
          config,
          onBeforeRender,
        }),
      );

      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.botAvatarURL).toBe(botAvatarURL);
    });

    it("should store botName in Redux state", async () => {
      const botName = "Assistant Bot";
      const config: PublicConfig = {
        ...createBaseConfig(),
        botName,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(
        React.createElement(ChatContainer, {
          config,
          onBeforeRender,
        }),
      );

      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.botName).toBe(botName);
    });
  });

  describe("disclaimer", () => {
    it("should store disclaimer config in Redux state", async () => {
      const disclaimer = {
        is_on: true,
        disclaimerHTML: "<p>This is a disclaimer</p>",
      };

      const config: PublicConfig = {
        ...createBaseConfig(),
        disclaimer,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(
        React.createElement(ChatContainer, {
          config,
          onBeforeRender,
        }),
      );

      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.disclaimer).toEqual(disclaimer);
    });

    it("should store disclaimer with is_on false in Redux state", async () => {
      const disclaimer = {
        is_on: false,
        disclaimerHTML: "<p>Disabled disclaimer</p>",
      };

      const config: PublicConfig = {
        ...createBaseConfig(),
        disclaimer,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(
        React.createElement(ChatContainer, {
          config,
          onBeforeRender,
        }),
      );

      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.disclaimer).toEqual(disclaimer);
    });
  });
});
