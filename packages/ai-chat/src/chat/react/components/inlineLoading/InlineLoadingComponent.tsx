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

import {
  CDSInlineLoadingElement,
  INLINE_LOADING_TAG_NAME,
} from "../../../web-components/components/inlineLoadingElement/cds-aichat-inline-loading";

const InlineLoadingComponent = createComponent({
  tagName: INLINE_LOADING_TAG_NAME,
  elementClass: CDSInlineLoadingElement,
  react: React,
});

export { InlineLoadingComponent };
