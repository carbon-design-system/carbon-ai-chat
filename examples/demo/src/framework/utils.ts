/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
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
  // Update the URL without refreshing the page
  window.location.search = urlParams.toString();
}

function getSettings() {
  const urlParams = new URLSearchParams(window.location.search);
  const settings: Partial<Settings> = urlParams.has("settings")
    ? JSON.parse(urlParams.get("settings"))
    : {};
  const config: Partial<PublicConfig> = urlParams.has("config")
    ? JSON.parse(urlParams.get("config"))
    : {};

  // eslint-disable-next-line import/no-mutable-exports
  let defaultConfig: PublicConfig = {
    ...config,
    messaging: {
      customSendMessage,
      ...config.messaging,
    },
  };

  const defaultSettings: Settings = {
    framework: "react",
    layout: "float",
    homescreen: "none",
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
        },
        themeConfig: { ...defaultConfig.themeConfig, corners: undefined },
        layout: { ...defaultConfig.layout, showFrame: undefined },
        element: undefined,
        openChatByDefault: undefined,
      };
      delete defaultConfig.headerConfig.hideMinimizeButton;
      delete defaultConfig.themeConfig.corners;
      delete defaultConfig.layout.showFrame;
      delete defaultConfig.element;
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
        layout: { ...defaultConfig.layout, showFrame: undefined },
        openChatByDefault: undefined,
      };
      delete defaultConfig.layout.showFrame;
      delete defaultConfig.openChatByDefault;
      break;
    case "fullscreen":
      defaultConfig = {
        ...defaultConfig,
        headerConfig: {
          ...defaultConfig.headerConfig,
          hideMinimizeButton: true,
        },
        themeConfig: {
          ...defaultConfig.themeConfig,
          corners: CornersType.SQUARE,
        },
        layout: { ...defaultConfig.layout, showFrame: false },
        openChatByDefault: true,
      };
      break;
  }
  return { defaultConfig, defaultSettings };
}

export { updateQueryParams, getSettings, sleep };
