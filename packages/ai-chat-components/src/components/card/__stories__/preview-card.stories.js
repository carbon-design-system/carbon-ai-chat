/**
 * @license
 *
 * Copyright IBM Corp. 2025
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
import { ICON_INDICATOR_KIND } from "@carbon/web-components/es/components/icon-indicator/icon-indicator.js";
import styles from "./story-styles.scss?lit";
import { action } from "storybook/actions";
import { previewCardFooterPresets, toolbarActions } from "./story-data";

const aiContent = html`
  <div slot="body-text" class="ai-label-body">
    <h4>Powered by IBM watsonx</h4>
    <div>
      IBM watsonx is powered by the latest AI models to intelligently process
      conversations and provide help whenever and wherever you may need it.
    </div>
  </div>
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
                ${aiContent}
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
    aiLabel: true,
    footerActions: "1 ghost button with icon",
    maxWidth: "lg",
  },
  render: (args) =>
    maxWidthWrapper(
      args.maxWidth,
      () => html`
        <cds-aichat-card ?is-layered=${args.isLayered}>
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
                ${aiContent}
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
    maxWidth: "lg",
    footerActions: "none",
    aiLabel: true,
  },
  render: (args) =>
    maxWidthWrapper(
      args.maxWidth,
      () => html`
        <cds-aichat-card ?is-layered=${args.isLayered}>
          <div slot="header" class="preview-card preview-card-toolbar">
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
                    ${aiContent}
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
        <cds-aichat-card ?is-layered=${args.isLayered}>
          <div slot="header" class="preview-card preview-card-toolbar">
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
                      ${aiContent}
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
