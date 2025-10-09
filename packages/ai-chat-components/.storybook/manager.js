/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * @license
 *
 * Copyright IBM Corp. 2023
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "./_carbon-theme-storybook-ui.css";
import { addons } from "storybook/manager-api";
import storybookTheme from "./theme";

addons.setConfig({
  theme: storybookTheme,
});

let theme = localStorage.getItem("storybook-carbon-theme");

if (!theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  theme = prefersDark ? "g100" : "white";
}

document.documentElement.setAttribute("storybook-carbon-theme", theme);

localStorage.setItem("storybook-carbon-theme", theme);
