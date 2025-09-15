/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  CornersType,
  MinimizeButtonIconType,
  PublicConfig,
  ServiceDesk,
} from "@carbon/ai-chat";

import { customSendMessage } from "../customSendMessage/customSendMessage";
import { KeyPairs, Settings } from "./types";
import { MockServiceDesk } from "../mockServiceDesk/mockServiceDesk";

async function sleep(milliseconds: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function updateQueryParams(items: KeyPairs[]) {
  // Get the current URL's search params
  const urlParams = new URLSearchParams(window.location.search);

  // Set or update the query parameter
  items.forEach(({ key, value }) => {
    urlParams.set(key, value);
  });
  // Update the URL without refreshing the page
  window.location.search = urlParams.toString();
}

function getSettings() {
  const urlParams = new URLSearchParams(window.location.search);
  const settings: Partial<Settings> = urlParams.has("settings")
    ? JSON.parse(urlParams.get("settings") as string)
    : {};
  const config: Partial<PublicConfig> = urlParams.has("config")
    ? JSON.parse(urlParams.get("config") as string)
    : {};

  let defaultConfig: PublicConfig = {
    ...config,
    messaging: {
      customSendMessage,
      ...config.messaging,
    },
    serviceDeskFactory: (parameters) =>
      Promise.resolve(new MockServiceDesk(parameters) as ServiceDesk),
    debug: true,
  };

  const defaultSettings: Settings = {
    framework: "react",
    layout: "float",
    homescreen: "none",
    writeableElements: "false",
    ...settings,
  };

  // eslint-disable-next-line default-case
  switch (defaultSettings.layout) {
    case "float":
      defaultConfig = {
        ...defaultConfig,
        headerConfig: {
          ...defaultConfig.headerConfig,
          hideMinimizeButton: undefined,
          minimizeButtonIconType: undefined,
        },
        themeConfig: { ...defaultConfig.themeConfig, corners: undefined },
        layout: {
          ...defaultConfig.layout,
          showFrame: undefined,
          hasContentMaxWidth: undefined,
        },
        openChatByDefault: undefined,
      };
      delete defaultConfig.showLauncher;
      delete defaultConfig.headerConfig?.minimizeButtonIconType;
      delete defaultConfig.headerConfig?.hideMinimizeButton;
      delete defaultConfig.themeConfig?.corners;
      delete defaultConfig.layout?.showFrame;
      delete defaultConfig.openChatByDefault;
      break;
    case "sidebar":
      defaultConfig = {
        ...defaultConfig,
        headerConfig: {
          ...defaultConfig.headerConfig,
          hideMinimizeButton: undefined,
          minimizeButtonIconType: MinimizeButtonIconType.SIDE_PANEL_RIGHT,
        },
        themeConfig: {
          ...defaultConfig.themeConfig,
          corners: CornersType.SQUARE,
        },
        layout: {
          ...defaultConfig.layout,
          showFrame: undefined,
          hasContentMaxWidth: undefined,
        },
        showLauncher: false,
        openChatByDefault: undefined,
      };
      delete defaultConfig.layout?.showFrame;
      delete defaultConfig.openChatByDefault;
      break;
    case "fullscreen":
      defaultConfig = {
        ...defaultConfig,
        headerConfig: {
          ...defaultConfig.headerConfig,
          hideMinimizeButton: true,
          minimizeButtonIconType: undefined,
        },
        themeConfig: {
          ...defaultConfig.themeConfig,
          corners: CornersType.SQUARE,
        },
        layout: {
          ...defaultConfig.layout,
          showFrame: false,
          hasContentMaxWidth: undefined,
        },
        openChatByDefault: true,
      };
      delete defaultConfig.showLauncher;
      delete defaultConfig.headerConfig?.minimizeButtonIconType;
      break;
    case "fullscreen-no-gutter":
      defaultConfig = {
        ...defaultConfig,
        headerConfig: {
          ...defaultConfig.headerConfig,
          hideMinimizeButton: true,
          minimizeButtonIconType: undefined,
        },
        themeConfig: {
          ...defaultConfig.themeConfig,
          corners: CornersType.SQUARE,
        },
        layout: {
          ...defaultConfig.layout,
          showFrame: false,
          hasContentMaxWidth: false,
        },
        openChatByDefault: true,
      };
      delete defaultConfig.showLauncher;
      delete defaultConfig.headerConfig?.minimizeButtonIconType;
      break;
  }

  return { defaultConfig, defaultSettings };
}

/**
 * This function runs a for loop asynchornously for each item. This provides the ability to loop through a list
 * of items at a custom pace and stop at any point in the loop.
 *
 * @param list The list of items to loop over.
 * @param condition This function determines if the for loop should continue. Returning false will stop the for loop.
 * @param callback The function to call for each item in the list.
 */
async function asyncForEach<T>(
  list: T[],
  condition: (item: T, index: number) => boolean | Promise<boolean>,
  callback: (item: T, index: number) => Promise<void>,
) {
  for (let index = 0; index < list.length; index++) {
    if (await condition(list[index], index)) {
      await callback(list[index], index);
    } else {
      break;
    }
  }
}

export { updateQueryParams, getSettings, sleep, asyncForEach };
