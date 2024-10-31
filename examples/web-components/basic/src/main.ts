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

import "./styles.css";

import "@carbon/ai-chat/dist/web-components/cds-aichat-container/index.js";

import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

const config = {
  messaging: {
    customSendMessage,
  },
  debug: true,
};

@customElement("my-app")
export class Demo extends LitElement {
  render() {
    return html`
      <h1>Welcome!</h1>
      <cds-aichat-container .config=${config}></cds-aichat-container>
    `;
  }
}
