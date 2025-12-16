/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@carbon/web-components/es/components/button/index.js";
import { PanelType } from "@carbon/ai-chat";

@customElement("workspace-writeable-element-example")
class WorkspaceWriteableElementExample extends LitElement {
  static styles = css`
    .workspace-example-outer-wc {
      padding: 1rem;
      border-radius: 8px;
    }
    .workspace-example-inner-wc {
      /* border: 1px solid var(--cds-chat-bubble-border); */
      /* border-radius: 8px; */
      /* padding: 1rem; */
      font-family: var(--cds-font-family);
      background-color: var(--cds-background-contrast);
    }
    p {
      margin: 0;
    }
    [slot="workspacePanelElement"] {
      block-size: 100%;
    }
  `;

  @property({ type: String })
  accessor location: string = "";

  @property({ type: Object })
  accessor instance: any = null;

  @property({ type: String })
  accessor valueFromParent: string = "";

  handleClose() {
    const panel = this.instance?.customPanels?.getPanel(PanelType.WORKSPACE);

    console.log("handle close of panel", panel);

    panel?.close();
  }

  render() {
    return html`<div>
      <div class="workspace-example-outer-wc">
        <div class="workspace-example-inner-wc">
          <p>
            Location: ${this.location}. this whole component is rendered through
            workspacePanelElement writeable element. Some content from parent
            state: ${this.valueFromParent}
          </p>
          <cds-button kind="danger" @click=${this.handleClose}>
            close
          </cds-button>
        </div>
      </div>
    </div> `;
  }
}

export default WorkspaceWriteableElementExample;
