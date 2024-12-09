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

import { createComponent } from "@lit/react";
import React from "react";

import DemoSideBarNav from "../framework/demo-side-bar-nav";

const SideBar = createComponent({
  tagName: "demo-side-bar-nav",
  elementClass: DemoSideBarNav,
  react: React,
});

export { SideBar };
