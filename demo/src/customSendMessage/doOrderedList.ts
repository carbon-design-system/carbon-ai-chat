/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance } from "@carbon/ai-chat";

import { ORDERED_LIST } from "./constants";
import { doText } from "./doText";

function doOrderedList(instance: ChatInstance) {
  doText(instance, ORDERED_LIST);
}

export { doOrderedList };
