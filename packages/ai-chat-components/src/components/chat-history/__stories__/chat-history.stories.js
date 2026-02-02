/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import "../index";
import { html } from "lit";
import styles from "./story-styles.scss?lit";
import prefix from "../../../globals/settings.js";

import PinFilled16 from "@carbon/icons/es/pin--filled/16.js";
import Time16 from "@carbon/icons/es/time/16.js";
import OverflowMenuVertical16 from "@carbon/icons/es/overflow-menu--vertical/16.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import "@carbon/web-components/es/components/overflow-menu/index.js";

export default {
  title: "Unstable/Chat History",
  component: "cds-aichat-history-shell",
  decorators: [
    (story) => html`
      <style>
        ${styles}
      </style>
      <cds-aichat-history-shell>${story()}</cds-aichat-history-shell>
    `,
  ],
};

export const Default = {
  argTypes: {
    HeaderTitle: {
      control: "text",
      description: "Header title text of the chat history shell",
    },
  },
  args: {
    HeaderTitle: "Conversations",
  },
  render: (args) => {
    return html` <cds-aichat-history-header
        title="${args.HeaderTitle}"
      ></cds-aichat-history-header>
      <cds-aichat-history-toolbar></cds-aichat-history-toolbar>
      <cds-aichat-history-content>
        <cds-aichat-history-panel aria-label="Chat history">
          <cds-aichat-history-panel-items>
            <cds-aichat-history-panel-menu expanded title="Pinned">
              ${iconLoader(PinFilled16, {
                slot: "title-icon",
              })}
              <cds-aichat-history-panel-item>
                Here's the onboarding doc that includes all the information to
                get started.
                <cds-overflow-menu slot="actions">
                  ${iconLoader(OverflowMenuVertical16, {
                    class: `${prefix}--overflow-menu__icon`,
                    slot: "icon",
                  })}
                  <cds-overflow-menu-body>
                    <cds-overflow-menu-item>Stop app</cds-overflow-menu-item>
                    <cds-overflow-menu-item>Restart app</cds-overflow-menu-item>
                    <cds-overflow-menu-item>Rename app</cds-overflow-menu-item>
                  </cds-overflow-menu-body>
                </cds-overflow-menu>
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item>
                Here's the onboarding doc that includes all the information to
                get started.
                <cds-overflow-menu slot="actions">
                  ${iconLoader(OverflowMenuVertical16, {
                    class: `${prefix}--overflow-menu__icon`,
                    slot: "icon",
                  })}
                  <cds-overflow-menu-body>
                    <cds-overflow-menu-item>Stop app</cds-overflow-menu-item>
                    <cds-overflow-menu-item>Restart app</cds-overflow-menu-item>
                    <cds-overflow-menu-item>Rename app</cds-overflow-menu-item>
                  </cds-overflow-menu-body>
                </cds-overflow-menu>
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item>
                Here's the onboarding doc that includes all the information to
                get started.
                <cds-overflow-menu slot="actions">
                  ${iconLoader(OverflowMenuVertical16, {
                    class: `${prefix}--overflow-menu__icon`,
                    slot: "icon",
                  })}
                  <cds-overflow-menu-body>
                    <cds-overflow-menu-item>Stop app</cds-overflow-menu-item>
                    <cds-overflow-menu-item>Restart app</cds-overflow-menu-item>
                    <cds-overflow-menu-item>Rename app</cds-overflow-menu-item>
                  </cds-overflow-menu-body>
                </cds-overflow-menu>
              </cds-aichat-history-panel-item>
            </cds-aichat-history-panel-menu>
            <cds-aichat-history-panel-menu expanded title="Yesterday">
              ${iconLoader(Time16, {
                slot: "title-icon",
              })}
              <cds-aichat-history-panel-item>
                Here's the onboarding doc that includes all the information to
                get started.
                <cds-overflow-menu slot="actions">
                  ${iconLoader(OverflowMenuVertical16, {
                    class: `${prefix}--overflow-menu__icon`,
                    slot: "icon",
                  })}
                  <cds-overflow-menu-body>
                    <cds-overflow-menu-item>Stop app</cds-overflow-menu-item>
                    <cds-overflow-menu-item>Restart app</cds-overflow-menu-item>
                    <cds-overflow-menu-item>Rename app</cds-overflow-menu-item>
                  </cds-overflow-menu-body>
                </cds-overflow-menu>
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item active>
                Here's the onboarding doc that includes all the information to
                get started.
                <cds-overflow-menu slot="actions">
                  ${iconLoader(OverflowMenuVertical16, {
                    class: `${prefix}--overflow-menu__icon`,
                    slot: "icon",
                  })}
                  <cds-overflow-menu-body>
                    <cds-overflow-menu-item>Stop app</cds-overflow-menu-item>
                    <cds-overflow-menu-item>Restart app</cds-overflow-menu-item>
                    <cds-overflow-menu-item>Rename app</cds-overflow-menu-item>
                  </cds-overflow-menu-body>
                </cds-overflow-menu>
              </cds-aichat-history-panel-item>
              <cds-aichat-history-panel-item>
                Here's the onboarding doc that includes all the information to
                get started.
                <cds-overflow-menu slot="actions">
                  ${iconLoader(OverflowMenuVertical16, {
                    class: `${prefix}--overflow-menu__icon`,
                    slot: "icon",
                  })}
                  <cds-overflow-menu-body>
                    <cds-overflow-menu-item>Stop app</cds-overflow-menu-item>
                    <cds-overflow-menu-item>Restart app</cds-overflow-menu-item>
                    <cds-overflow-menu-item>Rename app</cds-overflow-menu-item>
                  </cds-overflow-menu-body>
                </cds-overflow-menu>
              </cds-aichat-history-panel-item>
            </cds-aichat-history-panel-menu>
          </cds-aichat-history-panel-items>
        </cds-aichat-history-panel>
      </cds-aichat-history-content>`;
  },
};
