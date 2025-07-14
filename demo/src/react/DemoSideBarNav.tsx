/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import React from "react";

import DemoSideBarNav from "../framework/demo-side-bar-nav";

const SideBar = createComponent({
  tagName: "demo-side-bar-nav",
  elementClass: DemoSideBarNav,
  react: React,
});

export { SideBar };
