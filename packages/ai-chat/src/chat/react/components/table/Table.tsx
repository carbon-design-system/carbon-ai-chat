/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This file creates React bindings for the Table web component and registers the web component in the DOM.
 */

import { createComponent } from "@lit/react";
import React from "react";

import {
  TABLE_COMPONENT_TAG_NAME,
  TableElement,
} from "../../../web-components/components/table/cds-aichat-table";

const Table = createComponent({
  tagName: TABLE_COMPONENT_TAG_NAME,
  elementClass: TableElement,
  react: React,
});

export { Table };
