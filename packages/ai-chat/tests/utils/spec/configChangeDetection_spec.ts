/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { detectConfigChanges } from "../../../src/chat/utils/configChangeDetection";
import { ChatContainerProps } from "../../../src/types/component/ChatContainer";

describe("configChangeDetection", () => {
  const baseConfig: Partial<ChatContainerProps> = {
    launcher: { isOn: true },
    aiEnabled: false,
    messaging: { skipWelcome: false },
    namespace: "test",
  };

  describe("detectConfigChanges", () => {
    it("should detect human agent config changes", () => {
      const newConfig: any = { ...baseConfig };
      newConfig.serviceDeskFactory = () => Promise.resolve({} as any);

      const changes = detectConfigChanges(baseConfig, newConfig);
      expect(changes.humanAgentFactoryChanged).toBe(true);
    });

    it("should detect theme changes", () => {
      const newConfig = {
        ...baseConfig,
        aiEnabled: true,
      };

      const changes = detectConfigChanges(baseConfig, newConfig);
      expect(changes.themingChanged).toBe(true);
    });

    it("should detect namespace changes", () => {
      const newConfig = {
        ...baseConfig,
        namespace: "different-namespace",
      };

      const changes = detectConfigChanges(baseConfig, newConfig);
      expect(changes.namespaceChanged).toBe(true);
    });

    it("should detect no changes when configs are identical", () => {
      const changes = detectConfigChanges(baseConfig, baseConfig);
      expect(changes.humanAgentFactoryChanged).toBe(false);
      expect(changes.themingChanged).toBe(false);
      expect(changes.namespaceChanged).toBe(false);
    });
  });

  // "requiresHardReboot" has been removed; dynamic updates handle changes instead.
});
