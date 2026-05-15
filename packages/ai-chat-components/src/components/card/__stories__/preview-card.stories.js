/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// https://storybook.js.org/docs/essentials/controls#conditional-controls

import "../src/card";
import "../src/card-footer";
import "../src/card-steps";
import "../../toolbar/src/toolbar";
import { Default as CardDefault, WithActions } from "./card.stories";
import { html } from "lit";
import "@carbon/web-components/es/components/ai-label/ai-label.js";
import "@carbon/web-components/es/components/ai-label/ai-label-action-button.js";
import "@carbon/web-components/es/components/button/button.js";
import "@carbon/web-components/es/components/icon-button/icon-button.js";
import "@carbon/web-components/es/components/link/link.js";
import "@carbon/web-components/es/components/tag/tag.js";
import { ICON_INDICATOR_KIND } from "@carbon/web-components/es/components/icon-indicator/icon-indicator.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Launch16 from "@carbon/icons/es/launch/16.js";
import Folders16 from "@carbon/icons/es/folders/16.js";
import FolderOpen16 from "@carbon/icons/es/folder--open/16.js";
import View16 from "@carbon/icons/es/view/16.js";
import styles from "./story-styles.scss?lit";
import "@carbon/ai-chat/css/chat-explainability-popover.css";
import { action } from "storybook/actions";
import { previewCardFooterPresets, toolbarActions } from "./story-data";

const explainabilityPopoverContent = html`
  <div
    role="dialog"
    slot="body-text"
    class="cds-aichat-explainability-popover--content"
  >
    <header class="cds-aichat-explainability-popover--content__header">
      <div class="cds-aichat-explainability-popover--content__eyebrow-row">
        <span class="cds-aichat-explainability-popover--content__label">
          AI explained
        </span>
        <cds-tag
          class="cds-aichat--header__slug-confidence"
          size="sm"
          type="outline"
        >
          Confidence: 89%
        </cds-tag>
      </div>
      <h2 class="cds-aichat-explainability-popover--content__title">
        Name of feature
      </h2>
      <p class="cds-aichat-explainability-popover--content__description">
        High level 1-2 sentence description of how the AI is being used in the
        UI.
      </p>
    </header>
    <section class="cds-aichat-explainability-popover--content__section">
      <div>
        <h3>How it works</h3>
        <ol>
          <li>1. <strong>Key word.</strong> Description of key word.</li>
          <li>2. <strong>Key word.</strong> Description of key word.</li>
          <li>3. <strong>Key word.</strong> Description of key word.</li>
        </ol>
      </div>
      <div>
        <h3>Data types used</h3>
        <ul>
          <li>— <strong>Data type 1.</strong> Explain how it's used.</li>
          <li>— <strong>Data type 2.</strong> Explain how it's used.</li>
          <li>— <strong>Data type 3.</strong> Explain how it's used.</li>
        </ul>
      </div>
    </section>
    <section class="cds-aichat-explainability-popover--content__section">
      <div>
        <h3>AI model</h3>
        <cds-link
          href="https://example.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span slot="icon">${iconLoader(Launch16)}</span>
          granite.13b.v2.instruct
        </cds-link>
      </div>
      <div>
        <h4>Additional details</h4>
        <p>
          Additional information about data used to fine tune and/or train the
          model
        </p>
      </div>
    </section>
    <section class="cds-aichat-explainability-popover--content__section">
      <div>
        <h3>Training data set</h3>
        <cds-link
          href="https://example.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span slot="icon">${iconLoader(Launch16)}</span>
          IBM Security data piles
        </cds-link>
      </div>
    </section>
  </div>
  <cds-icon-button slot="actions" size="lg" kind="ghost">
    <span slot="icon">${iconLoader(Folders16)}</span>
    <span slot="tooltip-content">Folders</span>
  </cds-icon-button>
  <cds-icon-button slot="actions" size="lg" kind="ghost">
    <span slot="icon">${iconLoader(FolderOpen16)}</span>
    <span slot="tooltip-content">Open Folder</span>
  </cds-icon-button>
  <cds-icon-button slot="actions" size="lg" kind="ghost">
    <span slot="icon">${iconLoader(View16)}</span>
    <span slot="tooltip-content">View</span>
  </cds-icon-button>
  <cds-ai-label-action-button slot="actions"
    >View details</cds-ai-label-action-button
  >
`;

const maxWidthWrapper = (width, storyFn) => {
  return width === "unset"
    ? storyFn()
    : html`<div style="max-width: ${width}">${storyFn()}</div>`;
};

export default {
  title: "Components/Card/Preview Card",
  decorators: [
    (story) => html`
      <style>
        ${styles}
      </style>
      ${story()}
    `,
  ],
};

export const Small = {
  argTypes: {
    ...CardDefault.argTypes,
    footerActions: {
      control: "select",
      options: Object.keys(previewCardFooterPresets),
      description: WithActions.argTypes.footerActions.description,
    },
    aiLabel: {
      control: "boolean",
      description:
        "Toggles display of the AI label decorator, which shows AI-powered content.",
    },
  },
  args: {
    ...CardDefault.args,
    isFlush: true,
    footerActions: "2 ghost icon buttons",
    aiLabel: true,
  },
  render: (args) =>
    maxWidthWrapper(
      args.maxWidth,
      () => html`
        <cds-aichat-card
          ?is-layered=${args.isLayered}
          ?is-flush=${args.isFlush}
        >
          <div slot="body" class="preview-card preview-card-small">
            <h4>Document title</h4>
            <p>Subtitle</p>
          </div>
          ${args.footerActions
            ? html`
                <cds-aichat-card-footer
                  size="md"
                  .actions=${previewCardFooterPresets[args.footerActions]}
                  @cds-aichat-card-footer-action=${(e) =>
                    action("action")(e.detail)}
                ></cds-aichat-card-footer>
              `
            : ""}
          ${args.aiLabel
            ? html`<cds-ai-label
                size="mini"
                autoalign
                alignment="bottom-right"
                slot="decorator"
              >
                ${explainabilityPopoverContent}
              </cds-ai-label>`
            : ""}
        </cds-aichat-card>
      `,
    ),
};

export const Default = {
  argTypes: {
    ...Small.argTypes,
  },
  args: {
    ...Small.args,
    isFlush: true,
    aiLabel: true,
    footerActions: "1 ghost button with icon",
    maxWidth: "lg",
  },
  render: (args) =>
    maxWidthWrapper(
      args.maxWidth,
      () => html`
        <cds-aichat-card
          ?is-layered=${args.isLayered}
          ?is-flush=${args.isFlush}
        >
          <div slot="header" class="preview-card preview-card-default">
            <h4>Document title</h4>
            <p>Subtitle</p>
            <p>Subtitle</p>
          </div>
          <div slot="body">
            <br />
            <br />
            <br />
            <br />
            <br />
            <br />
            <br />
          </div>

          ${args.footerActions
            ? html`
                <cds-aichat-card-footer
                  size="md"
                  .actions=${previewCardFooterPresets[args.footerActions]}
                  @cds-aichat-card-footer-action=${(e) =>
                    action("action")(e.detail)}
                ></cds-aichat-card-footer>
              `
            : ""}
          ${args.aiLabel
            ? html`<cds-ai-label
                size="mini"
                autoalign
                alignment="bottom-right"
                slot="decorator"
              >
                ${explainabilityPopoverContent}
              </cds-ai-label>`
            : ""}
        </cds-aichat-card>
      `,
    ),
};

export const WithToolbar = {
  argTypes: {
    ...Default.argTypes,
    aiLabel: {
      control: "boolean",
      description: "Toggles display of the AI label in the toolbar area.",
    },
  },
  args: {
    isLayered: false,
    isFlush: true,
    maxWidth: "lg",
    footerActions: "none",
    aiLabel: true,
  },
  render: (args) =>
    maxWidthWrapper(
      args.maxWidth,
      () => html`
        <cds-aichat-card
          ?is-layered=${args.isLayered}
          ?is-flush=${args.isFlush}
        >
          <div slot="header" class="preview-card">
            <cds-aichat-toolbar
              class="preview-card-toolbar"
              overflow
              .actions=${toolbarActions}
            >
              <div slot="title">
                <h4>
                  <span class="truncated-text"> Resource consumption </span>
                </h4>
              </div>
              <!-- AI Label slot -->
              ${args.aiLabel
                ? html` <cds-ai-label
                    size="2xs"
                    autoalign
                    alignment="bottom"
                    slot="decorator"
                  >
                    ${explainabilityPopoverContent}
                  </cds-ai-label>`
                : ""}
            </cds-aichat-toolbar>
          </div>
          <div slot="body">
            <br />
            <br />
            <br />
            <br />
            <br />
            <br />
            <br />
          </div>

          ${args.footerActions
            ? html`
                <cds-aichat-card-footer
                  size="md"
                  .actions=${previewCardFooterPresets[args.footerActions]}
                  @cds-aichat-card-footer-action=${(e) =>
                    action("action")(e.detail)}
                ></cds-aichat-card-footer>
              `
            : ""}
        </cds-aichat-card>
      `,
    ),
};

export const WithSteps = {
  argTypes: {
    ...WithToolbar.argTypes,
  },
  args: {
    ...WithToolbar.args,
    isFlush: true,
    footerActions: "1 ghost button with icon",
  },
  render: (args) => {
    const steps = [
      {
        label: "Step 1",
        kind: ICON_INDICATOR_KIND["IN-PROGRESS"],
        title: "Estimate inventory needs in all locations",
        description: "In progress...",
      },
      {
        label: "Step 2",
        kind: ICON_INDICATOR_KIND["NOT-STARTED"],
        title: "Identify locations with excess inventory",
        description: "Not started",
      },
      {
        label: "Step 3",
        kind: ICON_INDICATOR_KIND["NOT-STARTED"],
        title: "Prepare multiple rebalancing scenarios",
        description: "Not started",
      },
      {
        label: "Step 4",
        kind: ICON_INDICATOR_KIND["NOT-STARTED"],
        title: "Rank rebalancing scenarios for speed and cost",
        description: "Not started",
      },
      {
        label: "Step 5",
        kind: ICON_INDICATOR_KIND["NOT-STARTED"],
        title: "Prepare recommendations",
        description: "Not started",
      },
    ];

    const timeSteps = [3000, 1000, 500, 4000, 2000];

    let currentStep = 0;
    let stepsEl, statusEl;

    const progressSteps = () => {
      const proceed = () => {
        steps[currentStep].kind = ICON_INDICATOR_KIND.SUCCEEDED;
        steps[currentStep].description = "Completed successfully";
        currentStep++;

        if (steps[currentStep]) {
          steps[currentStep].kind = ICON_INDICATOR_KIND["IN-PROGRESS"];
          steps[currentStep].description = "In progress...";
          stepsEl.steps = [...steps];
          setTimeout(proceed, timeSteps[currentStep]);
        } else {
          statusEl.textContent = "Status: completed";
          args.showFooter = true;
          stepsEl.steps = [...steps];
        }
      };

      setTimeout(proceed, timeSteps[currentStep]);
    };

    const onRendered = () => {
      stepsEl = document.querySelector("#steps-el");
      statusEl = document.querySelector("#status-label");

      if (stepsEl && statusEl) {
        progressSteps();
      }
    };

    setTimeout(onRendered);

    return maxWidthWrapper(
      args.maxWidth,
      () => html`
        <cds-aichat-card
          ?is-layered=${args.isLayered}
          ?is-flush=${args.isFlush}
        >
          <div slot="header" class="preview-card">
            <cds-aichat-toolbar class="preview-card-toolbar">
              <div slot="title">
                <div class="title-container">
                  <h4>Optimising excess inventory</h4>
                  <p id="status-label">Status: running</p>
                </div>
              </div>
              ${args.aiLabel
                ? html`
                    <cds-ai-label
                      size="mini"
                      autoalign
                      alignment="bottom"
                      slot="decorator"
                    >
                      ${explainabilityPopoverContent}
                    </cds-ai-label>
                  `
                : ""}
            </cds-aichat-toolbar>
          </div>

          <div slot="body" class="preview-card preview-card-steps">
            <cds-aichat-card-steps
              id="steps-el"
              .steps=${steps}
            ></cds-aichat-card-steps>
          </div>

          <cds-aichat-card-footer
            size="md"
            .actions=${previewCardFooterPresets[args.footerActions]}
            @cds-aichat-card-footer-action=${(e) => action("action")(e.detail)}
          ></cds-aichat-card-footer>
        </cds-aichat-card>
      `,
    );
  },
};

export const CardSteps = {
  argTypes: {
    numberOfSteps: {
      control: { type: "number", min: 1, max: 10 },
      name: "Number of Steps",
      description:
        "Number of steps to display in the card steps component. this is a storybook control. which multiplies the steps array passed to the component.",
    },
    maxWidth: {
      control: { type: "radio" },
      options: ["unset", "sm", "md", "lg"],
      mapping: { unset: "unset", sm: "291px", md: "438px", lg: "535px" },
      description: CardDefault.argTypes.maxWidth.description,
    },
    label: {
      control: { type: "text" },
      description: "Label for each step in the card steps component.",
    },
    kind: {
      control: { type: "select" },
      options: [...Object.keys(ICON_INDICATOR_KIND), "none"],
      mapping: {
        ...ICON_INDICATOR_KIND,
        none: "none",
      },
      description:
        "Kind of step indicator to display. Options include `ICON_INDICATOR_KIND` values.",
    },
    title: {
      control: { type: "text" },
      description: "Title for each step in the card steps component.",
    },
    description: {
      control: { type: "text" },
      description: "Description for each step in the card steps component.",
    },
  },

  args: {
    numberOfSteps: 1,
    maxWidth: "lg",
    label: "Step 1",
    kind: "IN-PROGRESS",
    title: "Estimate inventory needs in all locations",
    description: "In progress...",
  },

  render: (args) => {
    const steps = Array.from({ length: args.numberOfSteps }, (_) => ({
      label: `${args.label}`,
      kind: args.kind,
      title: `${args.title}`,
      description: args.description,
    }));

    return maxWidthWrapper(
      args.maxWidth,
      () => html`
        <cds-aichat-card-steps .steps=${steps}></cds-aichat-card-steps>
      `,
    );
  },
};
