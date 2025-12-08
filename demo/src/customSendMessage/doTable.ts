/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ChatInstance, CustomSendMessageOptions } from "@carbon/ai-chat";

import { TABLE } from "./constants";
import { doText, doTextStreaming } from "./doText";

function doTable(instance: ChatInstance) {
  doText(instance, `A markdown table in the text response type.\n\n${TABLE}`);
}

async function doTableStreaming(
  instance: ChatInstance,
  requestOptions?: CustomSendMessageOptions,
) {
  await doTextStreaming(
    instance,
    `A periodic table in markdown format.\n\n${TABLE}`,
    true,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    requestOptions,
  );
}

export { doTable, doTableStreaming };
