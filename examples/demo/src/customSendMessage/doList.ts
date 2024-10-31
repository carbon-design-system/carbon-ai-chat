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

import { UNORDERED_LIST } from "./constants";
import { doText } from "./doText";

function doList(instance: ChatInstance) {
  doText(instance, UNORDERED_LIST);
}

export { doList };
