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
import { enLanguagePack } from "../../../src/types/config/PublicConfig";

describe("Config Strings", () => {
  const createBaseProps = (): Partial<ChatContainerProps> => ({
    ...createBaseTestProps(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("strings", () => {
    it("should apply partial string overrides to language pack in Redux state", async () => {
      const strings = {
        input_placeholder: "Ask me anything…",
      } as Partial<typeof enLanguagePack>;

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        strings,
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
      // Overridden key reflects custom string
      expect(state.languagePack.input_placeholder).toBe(
        strings.input_placeholder,
      );
      // Unspecified keys retain defaults
      expect(state.languagePack.launcher_isOpen).toBe(
        enLanguagePack.launcher_isOpen,
      );
    });

    it("should merge multiple overrides and keep other defaults", async () => {
      const strings = {
        input_placeholder: "Start here",
        launcher_isOpen: "Open chat",
      } as Partial<typeof enLanguagePack>;

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        strings,
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
      expect(state.languagePack.input_placeholder).toBe("Start here");
      expect(state.languagePack.launcher_isOpen).toBe("Open chat");
      // Another key not overridden remains default
      expect(state.languagePack.window_ariaWindowOpened).toBe(
        enLanguagePack.window_ariaWindowOpened,
      );
    });

    it("should update language pack when strings prop updates", async () => {
      const initialStrings = {
        input_placeholder: "First value",
      } as Partial<typeof enLanguagePack>;

      const updatedStrings = {
        input_placeholder: "Second value",
      } as Partial<typeof enLanguagePack>;

      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        strings: initialStrings,
      };

      let capturedInstance: any = null;
      const onBeforeRender = jest.fn((instance) => {
        capturedInstance = instance;
      });

      const { rerender } = render(
        React.createElement(ChatContainer, { ...props, onBeforeRender }),
      );

      await waitFor(
        () => {
          expect(capturedInstance).not.toBeNull();
        },
        { timeout: 5000 },
      );

      const store = (capturedInstance as any).serviceManager.store;

      // Verify initial override
      expect(store.getState().languagePack.input_placeholder).toBe(
        initialStrings.input_placeholder,
      );

      // Rerender with updated strings
      rerender(
        React.createElement(ChatContainer, {
          ...props,
          strings: updatedStrings,
          onBeforeRender,
        }),
      );

      await waitFor(
        () => {
          expect(store.getState().languagePack.input_placeholder).toBe(
            updatedStrings.input_placeholder,
          );
        },
        { timeout: 5000 },
      );
    });

    it("should use defaults when strings is undefined", async () => {
      const props: Partial<ChatContainerProps> = {
        ...createBaseProps(),
        // strings intentionally omitted
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
      // Spot check a known default value
      expect(state.languagePack.input_placeholder).toBe(
        enLanguagePack.input_placeholder,
      );
    });
  });
});
