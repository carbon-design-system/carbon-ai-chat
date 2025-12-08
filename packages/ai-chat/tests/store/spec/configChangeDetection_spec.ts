/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { detectConfigChanges } from "../../../src/chat/utils/configChangeDetection";
import {
  PublicConfig,
  HeaderConfig,
  MinimizeButtonIconType,
  CarbonTheme,
} from "../../../src/types/config/PublicConfig";

describe("Config Change Detection", () => {
  describe("detectConfigChanges", () => {
    it("should detect no changes when configs are identical", () => {
      const config: PublicConfig = {
        debug: true,
        namespace: "test",
        header: {
          title: "Test Chat",
          showRestartButton: true,
        },
      };

      const changes = detectConfigChanges(config, config);

      expect(changes.headerChanged).toBe(false);
      expect(changes.themingChanged).toBe(false);
      expect(changes.messagingChanged).toBe(false);
      expect(changes.namespaceChanged).toBe(false);
      expect(changes.disclaimerChanged).toBe(false);
      expect(changes.layoutChanged).toBe(false);
      expect(changes.homescreenChanged).toBe(false);
      expect(changes.lightweightUIChanged).toBe(false);
      expect(changes.humanAgentFactoryChanged).toBe(false);
    });

    it("should detect all changes when previous config is null (first load)", () => {
      const config: PublicConfig = {
        debug: true,
        namespace: "test",
        aiEnabled: true,
        header: {
          title: "Test Chat",
          showRestartButton: true,
        },
        messaging: {
          messageTimeoutSecs: 30,
        },
        disclaimer: {
          isOn: true,
          disclaimerHTML: "<p>Test disclaimer</p>",
        },
        layout: {
          showFrame: true,
        },
        homescreen: {
          isOn: true,
          greeting: "Hello",
        },
        serviceDeskFactory: () => Promise.resolve({} as any),
      };

      const changes = detectConfigChanges(null, config);

      expect(changes.headerChanged).toBe(true);
      expect(changes.themingChanged).toBe(true);
      expect(changes.messagingChanged).toBe(true);
      expect(changes.namespaceChanged).toBe(true);
      expect(changes.disclaimerChanged).toBe(true);
      expect(changes.layoutChanged).toBe(true);
      expect(changes.homescreenChanged).toBe(true);
      expect(changes.lightweightUIChanged).toBe(true);
      expect(changes.humanAgentFactoryChanged).toBe(true);
    });

    describe("header changes", () => {
      it("should detect header property changes", () => {
        const oldConfig: PublicConfig = {
          header: {
            title: "Old Title",
            showRestartButton: true,
            minimizeButtonIconType: MinimizeButtonIconType.MINIMIZE,
          },
        };

        const newConfig: PublicConfig = {
          header: {
            title: "New Title",
            showRestartButton: true,
            minimizeButtonIconType: MinimizeButtonIconType.MINIMIZE,
          },
        };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.headerChanged).toBe(true);
      });

      it("should detect header property deletion", () => {
        const oldConfig: PublicConfig = {
          header: {
            title: "Test Title",
            showRestartButton: true,
            hideMinimizeButton: false,
          },
        };

        const newConfig: PublicConfig = {
          header: {
            title: "Test Title",
            // showRestartButton and hideMinimizeButton deleted
          },
        };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.headerChanged).toBe(true);
      });

      it("should detect header property addition", () => {
        const oldConfig: PublicConfig = {
          header: {
            title: "Test Title",
          },
        };

        const newConfig: PublicConfig = {
          header: {
            title: "Test Title",
            showRestartButton: true,
            menuOptions: [{ text: "Help", handler: () => {} }],
          },
        };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.headerChanged).toBe(true);
      });

      it("should not detect changes when header is functionally identical", () => {
        const menuHandler = () => {};
        const header: HeaderConfig = {
          title: "Test Title",
          name: "Assistant",
          showRestartButton: false,
          hideMinimizeButton: true,
          minimizeButtonIconType: MinimizeButtonIconType.CLOSE,
          menuOptions: [{ text: "Help", handler: menuHandler }],
        };

        const oldConfig: PublicConfig = { header };
        const newConfig: PublicConfig = { header };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.headerChanged).toBe(false);
      });

      it("should handle undefined header correctly", () => {
        const oldConfig: PublicConfig = {
          header: {
            title: "Test Title",
          },
        };

        const newConfig: PublicConfig = {
          header: undefined,
        };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.headerChanged).toBe(true);
      });

      it("should handle header being added from undefined", () => {
        const oldConfig: PublicConfig = {
          header: undefined,
        };

        const newConfig: PublicConfig = {
          header: {
            title: "New Title",
          },
        };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.headerChanged).toBe(true);
      });
    });

    describe("theming changes", () => {
      it("should detect aiEnabled changes", () => {
        const oldConfig: PublicConfig = { aiEnabled: true };
        const newConfig: PublicConfig = { aiEnabled: false };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.themingChanged).toBe(true);
      });

      it("should detect injectCarbonTheme changes", () => {
        const oldConfig: PublicConfig = {
          injectCarbonTheme: CarbonTheme.WHITE,
        };
        const newConfig: PublicConfig = { injectCarbonTheme: CarbonTheme.G10 };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.themingChanged).toBe(true);
      });

      it("should not detect theming changes when both undefined", () => {
        const oldConfig: PublicConfig = {};
        const newConfig: PublicConfig = {};

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.themingChanged).toBe(false);
      });
    });

    describe("namespace changes", () => {
      it("should detect namespace changes", () => {
        const oldConfig: PublicConfig = { namespace: "old-namespace" };
        const newConfig: PublicConfig = { namespace: "new-namespace" };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.namespaceChanged).toBe(true);
      });

      it("should detect namespace being added", () => {
        const oldConfig: PublicConfig = {};
        const newConfig: PublicConfig = { namespace: "new-namespace" };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.namespaceChanged).toBe(true);
      });

      it("should detect namespace being removed", () => {
        const oldConfig: PublicConfig = { namespace: "old-namespace" };
        const newConfig: PublicConfig = {};

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.namespaceChanged).toBe(true);
      });
    });

    describe("messaging changes", () => {
      it("should detect messaging property changes", () => {
        const oldConfig: PublicConfig = {
          messaging: {
            messageTimeoutSecs: 30,
            skipWelcome: false,
          },
        };

        const newConfig: PublicConfig = {
          messaging: {
            messageTimeoutSecs: 60,
            skipWelcome: false,
          },
        };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.messagingChanged).toBe(true);
      });

      it("should detect messaging being added", () => {
        const oldConfig: PublicConfig = {};
        const newConfig: PublicConfig = {
          messaging: {
            messageTimeoutSecs: 30,
          },
        };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.messagingChanged).toBe(true);
      });

      it("should detect messaging being removed", () => {
        const oldConfig: PublicConfig = {
          messaging: {
            messageTimeoutSecs: 30,
          },
        };
        const newConfig: PublicConfig = {};

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.messagingChanged).toBe(true);
      });
    });

    describe("lightweightUIChanged detection", () => {
      it("should detect launcher changes", () => {
        const oldConfig: PublicConfig = {
          launcher: { isOn: true },
        };
        const newConfig: PublicConfig = {
          launcher: { isOn: false },
        };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.lightweightUIChanged).toBe(true);
      });

      it("should detect openChatByDefault changes", () => {
        const oldConfig: PublicConfig = { openChatByDefault: true };
        const newConfig: PublicConfig = { openChatByDefault: false };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.lightweightUIChanged).toBe(true);
      });

      it("should detect debug changes", () => {
        const oldConfig: PublicConfig = { debug: false };
        const newConfig: PublicConfig = { debug: true };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.lightweightUIChanged).toBe(true);
      });

      it("should detect multiple lightweight UI changes", () => {
        const oldConfig: PublicConfig = {
          debug: false,
          assistantName: "Old Assistant",
          isReadonly: false,
        };

        const newConfig: PublicConfig = {
          debug: true,
          assistantName: "New Assistant",
          isReadonly: true,
        };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.lightweightUIChanged).toBe(true);
      });
    });

    describe("complex scenarios", () => {
      it("should detect multiple types of changes simultaneously", () => {
        const oldConfig: PublicConfig = {
          debug: false,
          aiEnabled: true,
          namespace: "old",
          header: {
            title: "Old Title",
            showRestartButton: true,
          },
          messaging: {
            messageTimeoutSecs: 30,
          },
        };

        const newConfig: PublicConfig = {
          debug: true,
          aiEnabled: false,
          namespace: "new",
          header: {
            title: "New Title",
            showRestartButton: false,
          },
          messaging: {
            messageTimeoutSecs: 60,
            skipWelcome: true,
          },
        };

        const changes = detectConfigChanges(oldConfig, newConfig);

        expect(changes.lightweightUIChanged).toBe(true);
        expect(changes.themingChanged).toBe(true);
        expect(changes.namespaceChanged).toBe(true);
        expect(changes.headerChanged).toBe(true);
        expect(changes.messagingChanged).toBe(true);
      });

      it("should handle deeply nested changes correctly", () => {
        const oldConfig: PublicConfig = {
          homescreen: {
            isOn: true,
            greeting: "Hello",
            starters: {
              isOn: true,
              buttons: [{ label: "Button 1" }, { label: "Button 2" }],
            },
          },
        };

        const newConfig: PublicConfig = {
          homescreen: {
            isOn: true,
            greeting: "Hello",
            starters: {
              isOn: true,
              buttons: [
                { label: "Button 1" },
                { label: "Button 3" }, // Changed button label
              ],
            },
          },
        };

        const changes = detectConfigChanges(oldConfig, newConfig);
        expect(changes.homescreenChanged).toBe(true);
      });
    });
  });
});
