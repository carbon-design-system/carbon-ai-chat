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
} from "@carbon/ai-chat";

import { customSendMessage } from "../customSendMessage/customSendMessage";
import { KeyPairs, Settings } from "./types";

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

  // Update the URL with a page refresh
  window.location.search = urlParams.toString();
}

function updateQueryParamsWithoutRefresh(items: KeyPairs[]) {
  // Get the current URL's search params
  const urlParams = new URLSearchParams(window.location.search);

  // Set or update the query parameter
  items.forEach(({ key, value }) => {
    urlParams.set(key, value);
  });

  // Update the URL without refreshing the page using History API
  const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

function updatePageTheme(theme: string) {
  // Get the current URL's search params
  const urlParams = new URLSearchParams(window.location.search);

  // Update only the pageTheme parameter
  urlParams.set("pageTheme", theme);

  // Update the URL without refreshing the page using History API
  const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
  window.history.replaceState({}, "", newUrl);
}

function getSettings() {
  const urlParams = new URLSearchParams(window.location.search);
  const settings: Partial<Settings> = urlParams.has("settings")
    ? JSON.parse(urlParams.get("settings") as string)
    : {};
  const config: any = urlParams.has("config")
    ? JSON.parse(urlParams.get("config") as string)
    : {};
  const pageTheme = urlParams.get("pageTheme") || "cds--white";

  let defaultConfig: PublicConfig = {
    ...config,
    // Default to AI theme enabled; prefer explicit top-level value, otherwise map legacy theme.theme
    aiEnabled:
      typeof config.aiEnabled === "boolean"
        ? config.aiEnabled
        : config.theme?.theme !== undefined
          ? config.theme.theme === "CarbonAI"
          : true,
    // Map legacy nested theme to top-level injectCarbonTheme; "inherit" => undefined
    injectCarbonTheme:
      config.injectCarbonTheme !== undefined
        ? config.injectCarbonTheme
        : config.theme?.injectCarbonTheme === "inherit"
          ? undefined
          : config.theme?.injectCarbonTheme,
    messaging: {
      customSendMessage,
      ...config.messaging,
    },
  };

  const defaultSettings: Settings = {
    framework: "react",
    layout: "float",
    writeableElements: "false",
    ...settings,
  };

  // eslint-disable-next-line default-case
  switch (defaultSettings.layout) {
    case "float":
      defaultConfig = {
        ...defaultConfig,
        header: {
          ...defaultConfig.header,
          hideMinimizeButton: undefined,
          minimizeButtonIconType: undefined,
        },
        layout: {
          ...defaultConfig.layout,
          showFrame: undefined,
          hasContentMaxWidth: undefined,
          corners: CornersType.SQUARE,
        },
        openChatByDefault: undefined,
      };
      delete defaultConfig.header?.minimizeButtonIconType;
      delete defaultConfig.header?.hideMinimizeButton;
      delete defaultConfig.layout?.corners;
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
        header: {
          ...defaultConfig.header,
          hideMinimizeButton: undefined,
          minimizeButtonIconType: MinimizeButtonIconType.SIDE_PANEL_RIGHT,
        },
        layout: {
          ...defaultConfig.layout,
          showFrame: undefined,
          hasContentMaxWidth: undefined,
          corners: CornersType.SQUARE,
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
        header: {
          ...defaultConfig.header,
          hideMinimizeButton: true,
          minimizeButtonIconType: undefined,
        },
        layout: {
          ...defaultConfig.layout,
          showFrame: false,
          hasContentMaxWidth: undefined,
        },
        openChatByDefault: true,
      };
      delete defaultConfig.header?.minimizeButtonIconType;
      delete defaultConfig.showLauncher;
      break;
    case "fullscreen-no-gutter":
      defaultConfig = {
        ...defaultConfig,
        header: {
          ...defaultConfig.header,
          hideMinimizeButton: true,
          minimizeButtonIconType: undefined,
        },
        layout: {
          ...defaultConfig.layout,
          showFrame: false,
          hasContentMaxWidth: false,
          corners: CornersType.SQUARE,
        },
        openChatByDefault: true,
      };
      delete defaultConfig.header?.minimizeButtonIconType;
      delete defaultConfig.launcher;
      break;
  }

  return { defaultConfig, defaultSettings, pageTheme };
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

export {
  updateQueryParams,
  updateQueryParamsWithoutRefresh,
  updatePageTheme,
  getSettings,
  sleep,
  asyncForEach,
};
