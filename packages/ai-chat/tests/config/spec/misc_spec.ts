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
import { ChatContainerProps } from "../../../src/types/component/ChatContainer";
import { createBaseTestProps } from "../../utils/testHelpers";
import { AppState } from "../../../src/types/state/AppState";
import { applyConfigChangesDynamically } from "../../../src/chat/utils/dynamicConfigUpdates";
import { detectConfigChanges } from "../../../src/chat/utils/configChangeDetection";
import { doCreateStore } from "../../../src/chat/store/doCreateStore";
import { ServiceManager } from "../../../src/chat/services/ServiceManager";
import { NamespaceService } from "../../../src/chat/services/NamespaceService";
import { PublicConfig } from "../../../src/types/config/PublicConfig";

describe("Config Miscellaneous", () => {
  const createBaseProps = (): Partial<ChatContainerProps> => ({
    ...createBaseTestProps(),
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
      "isReadonly",
    ] as const;

    booleanProperties.forEach((property) => {
      describe(property, () => {
        it(`should store ${property}: true in Redux state`, async () => {
          const props: Partial<ChatContainerProps> = {
            ...createBaseProps(),
            [property]: true,
          };

          let capturedInstance: any = null;
          const onBeforeRender = jest.fn((instance) => {
            capturedInstance = instance;
          });

          render(
            React.createElement(ChatContainer, {
              ...props,
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
          const props: Partial<ChatContainerProps> = {
            ...createBaseProps(),
            [property]: false,
          };

          let capturedInstance: any = null;
          const onBeforeRender = jest.fn((instance) => {
            capturedInstance = instance;
          });

          render(
            React.createElement(ChatContainer, {
              ...props,
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
          const props: Partial<ChatContainerProps> = {
            ...createBaseProps(),
            // property intentionally omitted
          };

          let capturedInstance: any = null;
          const onBeforeRender = jest.fn((instance) => {
            capturedInstance = instance;
          });

          render(
            React.createElement(ChatContainer, {
              ...props,
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
    it("should store assistantName in Redux state", async () => {
      const assistantName = "My Assistant";
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        assistantName,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(React.createElement(ChatContainer, { ...props, onBeforeRender }));

      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const store = (capturedInstance as any).serviceManager.store;
      const state: AppState = store.getState();
      expect(state.config.public.assistantName).toBe(assistantName);
    });
  });

  describe("disclaimer", () => {
    it("should store disclaimer config in Redux state", async () => {
      const disclaimer = {
        isOn: true,
        disclaimerHTML: "<p>This is a disclaimer</p>",
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        disclaimer,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(React.createElement(ChatContainer, { ...props, onBeforeRender }));

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

    it("should store disclaimer with isOn false in Redux state", async () => {
      const disclaimer = {
        isOn: false,
        disclaimerHTML: "<p>Disabled disclaimer</p>",
      };

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        disclaimer,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      render(React.createElement(ChatContainer, { ...props, onBeforeRender }));

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

    describe("Dynamic Disclaimer Config Updates", () => {
      let serviceManager: ServiceManager;

      beforeEach(() => {
        const initialConfig: PublicConfig = {
          assistantName: "Test Assistant",
        };

        const store = doCreateStore(initialConfig, {} as ServiceManager);
        serviceManager = {
          store,
          namespace: new NamespaceService("test"),
          messageService: { timeoutMS: 30000 } as any,
          humanAgentService: null,
        } as ServiceManager;
      });

      it("should handle disclaimer config changes dynamically", async () => {
        const previousConfig: PublicConfig = {
          disclaimer: {
            disclaimerHTML: "<p>Old disclaimer</p>",
            isOn: true,
          },
        };

        const newConfig: PublicConfig = {
          disclaimer: {
            disclaimerHTML: "<p>New disclaimer</p>",
            isOn: false,
          },
        };

        const changes = detectConfigChanges(previousConfig, newConfig);
        expect(changes.disclaimerChanged).toBe(true);

        await applyConfigChangesDynamically(changes, newConfig, serviceManager);

        const state: AppState = serviceManager.store.getState();
        expect(state.config.public.disclaimer?.disclaimerHTML).toBe(
          "<p>New disclaimer</p>",
        );
        expect(state.config.public.disclaimer?.isOn).toBe(false);
      });
    });
  });
});
