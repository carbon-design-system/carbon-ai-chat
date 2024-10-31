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

import { ChatInstance } from "@carbon/ai-chat";

import { TABLE } from "./constants";
import { doText, doTextStreaming } from "./doText";

function doTable(instance: ChatInstance) {
  doText(instance, `A markdown table.\n\n${TABLE}`);
}

async function doTableStreaming(instance: ChatInstance) {
  await doTextStreaming(instance, `A markdown table.\n\n${TABLE}`);
}

export { doTable, doTableStreaming };
