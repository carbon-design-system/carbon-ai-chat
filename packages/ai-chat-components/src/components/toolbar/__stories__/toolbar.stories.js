/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../index";
import "@carbon/web-components/es/components/icon-button/icon-button.js";
import "@carbon/web-components/es/components/ai-label/ai-label.js";
import "@carbon/web-components/es/components/overflow-menu/overflow-menu.js";
import "@carbon/web-components/es/components/overflow-menu/overflow-menu-body.js";
import { createOverflowHandler } from "@carbon/utilities";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { html } from "lit";
import Copy16 from "@carbon/icons/es/copy/16.js";
import Download16 from "@carbon/icons/es/download/16.js";
import Share16 from "@carbon/icons/es/share/16.js";
import Launch16 from "@carbon/icons/es/launch/16.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import Close16 from "@carbon/icons/es/close/16.js";
import overflowMenuVertical16 from "@carbon/icons/es/overflow-menu--vertical/16.js";
import { useState } from "@storybook/preview-api";
import styles from "./story-styles.scss?lit";

export default {
  title: "Components/Toolbar",
  argTypes: {
    toolbarTitle: {
      control: "text",
      description:
        "Title text for the Toolbar component. This Storybook-only control populates the title slot.",
    },
    toolbarAction: {
      control: {
        type: "select",
      },
      options: {
        "Advanced list": "advanced",
        "Basic List": "basic",
        "AI Label and Close only": "ailabelClose",
        "AI Label only": "ailabel",
        "Close only": "close",
      },
      description: "Defines the type of action slot for the Toolbar Component",
    },
  },
  flush: {
    control: "boolean",
    type: { name: "boolean" },
    description:
      "When set to true, removes the default internal padding of the component, allowing its content to sit 'flush' against the component's edge.",
  },
  decorators: [
    (story) => html`
      <style>
        ${styles}
      </style>
      ${story()}
    `,
  ],
};

function getToolbarAction(type) {
  switch (type) {
    case "advanced":
      return html`
        <cds-ai-label autoalign="" slot="action" size="2xs">
          <div slot="body-text">
            <p class="secondary">
              Lorem ipsum dolor sit amet, di os consectetur adipiscing elit, sed
              do eiusmod tempor incididunt ut fsil labore et dolore magna
              aliqua.
            </p>
          </div>
        </cds-ai-label>
        <cds-icon-button kind="ghost" size="md" align="bottom" slot="action">
          ${iconLoader(Copy16, { slot: "icon" })}
          <span slot="tooltip-content">Copy</span>
        </cds-icon-button>
        <cds-icon-button kind="ghost" size="md" align="bottom" slot="action">
          ${iconLoader(Download16, { slot: "icon" })}
          <span slot="tooltip-content">Download</span>
        </cds-icon-button>
        <cds-icon-button kind="ghost" size="md" align="bottom" slot="action">
          ${iconLoader(Share16, { slot: "icon" })}
          <span slot="tooltip-content">Share</span>
        </cds-icon-button>
        <cds-icon-button kind="ghost" size="md" align="bottom" slot="action">
          ${iconLoader(Launch16, { slot: "icon" })}
          <span slot="tooltip-content">Launch</span>
        </cds-icon-button>
        <cds-icon-button kind="ghost" size="md" align="bottom" slot="action">
          ${iconLoader(Maximize16, { slot: "icon" })}
          <span slot="tooltip-content">Maximize</span>
        </cds-icon-button>
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="action"
          data-fixed
        >
          ${iconLoader(Close16, { slot: "icon" })}
          <span slot="tooltip-content">Close</span>
        </cds-icon-button>
      `;
    case "basic":
      return html`
        <cds-ai-label autoalign="" slot="action" size="2xs">
          <div slot="body-text">
            <p class="secondary">
              Lorem ipsum dolor sit amet, di os consectetur adipiscing elit, sed
              do eiusmod tempor incididunt ut fsil labore et dolore magna
              aliqua.
            </p>
          </div>
        </cds-ai-label>
        <cds-icon-button kind="ghost" size="md" align="bottom" slot="action">
          ${iconLoader(Launch16, { slot: "icon" })}
          <span slot="tooltip-content">Launch</span>
        </cds-icon-button>
        <cds-icon-button kind="ghost" size="md" align="bottom" slot="action">
          ${iconLoader(Maximize16, { slot: "icon" })}
          <span slot="tooltip-content">Maximize</span>
        </cds-icon-button>
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="action"
          data-fixed
        >
          ${iconLoader(Close16, { slot: "icon" })}
          <span slot="tooltip-content">Close</span>
        </cds-icon-button>
      `;
    case "ailabelClose":
      return html`
        <cds-ai-label autoalign="" slot="action" size="2xs">
          <div slot="body-text">
            <p class="secondary">
              Lorem ipsum dolor sit amet, di os consectetur adipiscing elit, sed
              do eiusmod tempor incididunt ut fsil labore et dolore magna
              aliqua.
            </p>
          </div>
        </cds-ai-label>
        <cds-icon-button
          kind="ghost"
          size="md"
          align="bottom"
          slot="action"
          data-fixed
        >
          ${iconLoader(Close16, { slot: "icon" })}
          <span slot="tooltip-content">Close</span>
        </cds-icon-button>
      `;
    case "ailabel":
      return html`
        <cds-ai-label autoalign="" slot="action" size="2xs">
          <div slot="body-text">
            <p class="secondary">
              Lorem ipsum dolor sit amet, di os consectetur adipiscing elit, sed
              do eiusmod tempor incididunt ut fsil labore et dolore magna
              aliqua.
            </p>
          </div>
        </cds-ai-label>
      `;
    case "close":
      return html`
        <cds-icon-button kind="ghost" size="md" align="bottom" slot="action">
          ${iconLoader(Close16, { slot: "icon" })}
          <span slot="tooltip-content">Close</span>
        </cds-icon-button>
      `;
  }
}

export const Default = {
  args: {
    toolbarTitle: "Title <span>text</span>",
    toolbarAction: "advanced",
    flush: false,
  },

  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [hiddenItems, setHiddenItems] = useState([]);
    let target;

    requestAnimationFrame(() => {
      target = document.querySelector("cds-aichat-toolbar");
      setupOverflowHandler();
    });
    const onResize = () => {
      cancelAnimationFrame(onResize._raf);
      onResize._raf = requestAnimationFrame(() => {
        setupOverflowHandler();
      });
    };
    window.addEventListener("resize", onResize);

    function setupOverflowHandler() {
      createOverflowHandler({
        container: target,
        onChange: (_, hidden) => {
          const clones = hidden.map((node) => {
            const clone = node.cloneNode(true);
            clone.removeAttribute("data-hidden");
            clone.removeAttribute("slot");
            return clone;
          });
          setHiddenItems(clones);
        },
        dimension: "width",
      });
    }

    return html`
      <cds-aichat-toolbar
        title-text="${args.toolbarTitle}"
        ?flush="${args.flush}"
      >
        <div slot="title" data-fixed class="story-toolbar-title">
          ${unsafeHTML(args.toolbarTitle)}
        </div>
        ${getToolbarAction(args.toolbarAction)}
        ${hiddenItems.length > 0 &&
        html`
          <div
            class="story-menu-container"
            data-offset
            data-floating-menu-container
            slot="action"
          >
            <cds-overflow-menu
              close-on-activation
              enter-delay-ms="0"
              leave-delay-ms="0"
              autoalign=""
            >
              ${iconLoader(overflowMenuVertical16, {
                class: "action-svg",
                slot: "icon",
              })}
              <span slot="tooltip-content">Options</span>
              <cds-overflow-menu-body flipped="${true}">
                ${hiddenItems.map((item) => {
                  item.removeAttribute("data-hidden");
                  item.removeAttribute("slot");
                  return html`${item}`;
                })}
              </cds-overflow-menu-body>
            </cds-overflow-menu>
          </div>
        `}
      </cds-aichat-toolbar>
    `;
  },
};
