/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/feedback-buttons";
import "../src/feedback";
import { LitElement, css, html, nothing } from "lit";

const positiveCategories = [
  "Accurate",
  "Helpful",
  "Clear explanation",
  "Comprehensive",
];

const negativeCategories = [
  "Inaccurate",
  "Unhelpful",
  "Inappropriate",
  "Too verbose",
];

class FeedbackButtonsDetailsDemo extends LitElement {
  static properties = {
    hasPositiveDetails: {
      type: Boolean,
      attribute: "has-positive-details",
    },
    hasNegativeDetails: {
      type: Boolean,
      attribute: "has-negative-details",
    },
    panelId: {
      type: String,
      attribute: "panel-id",
    },
    positiveLabel: {
      type: String,
      attribute: "positive-label",
    },
    negativeLabel: {
      type: String,
      attribute: "negative-label",
    },
  };

  static styles = css`
    :host {
      display: block;
    }

    .feedback-demo-panels {
      margin-block-start: 1rem;
      max-inline-size: 26rem;
    }

    .feedback-demo-note {
      margin-block-start: 0.5rem;
      font-size: 0.875rem;
      color: #525252;
    }
  `;

  constructor() {
    super();
    this.hasPositiveDetails = false;
    this.hasNegativeDetails = true;
    this.panelId = "feedback-panel-demo";
    this.positiveLabel = "Thumbs up";
    this.negativeLabel = "Thumbs down";

    this._isFeedbackSubmitted = false;
    this._isPositiveSelected = false;
    this._isNegativeSelected = false;
    this._isPositiveOpen = false;
    this._isNegativeOpen = false;
    this._lastSubmission = null;
  }

  render() {
    return html`
      <cds-aichat-feedback-buttons
        ?has-positive-details=${this.hasPositiveDetails}
        ?has-negative-details=${this.hasNegativeDetails}
        ?is-positive-open=${this._isPositiveOpen}
        ?is-negative-open=${this._isNegativeOpen}
        ?is-positive-selected=${this._isPositiveSelected}
        ?is-negative-selected=${this._isNegativeSelected}
        ?is-positive-disabled=${this._isNegativeSelected ||
        this._isFeedbackSubmitted}
        ?is-negative-disabled=${this._isPositiveSelected ||
        this._isFeedbackSubmitted}
        positive-label=${this.positiveLabel}
        negative-label=${this.negativeLabel}
        panel-id=${this.panelId}
        @feedback-buttons-click=${(event) =>
          this._handleFeedbackToggle(event.detail.isPositive)}
      ></cds-aichat-feedback-buttons>
      <div class="feedback-demo-panels">
        ${this.hasPositiveDetails ? this._renderFeedbackPanel(true) : nothing}
        ${this.hasNegativeDetails ? this._renderFeedbackPanel(false) : nothing}
      </div>
      ${this._lastSubmission
        ? html`<p class="feedback-demo-note">
            Last submission:
            <strong
              >${this._lastSubmission.isPositive
                ? "Positive"
                : "Negative"}</strong
            >
            ${this._lastSubmission.text
              ? html`— ${this._lastSubmission.text}`
              : nothing}
          </p>`
        : nothing}
    `;
  }

  _renderFeedbackPanel(isPositive) {
    const label = isPositive ? "positive" : "negative";
    const isOpen = isPositive ? this._isPositiveOpen : this._isNegativeOpen;
    const categories = isPositive ? positiveCategories : negativeCategories;
    const placeholder = isPositive
      ? "What worked well?"
      : "How could this be improved?";

    return html`
      <cds-aichat-feedback
        class="feedback-demo-panel"
        id="${this.panelId}-feedback-${label}"
        ?is-open=${isOpen}
        ?is-readonly=${this._isFeedbackSubmitted}
        .categories=${categories}
        .initialValues=${this._feedbackInitialValues(isPositive)}
        title=${isPositive ? "Tell us what worked" : "Tell us what went wrong"}
        prompt=${isPositive
          ? "Share what made this response helpful."
          : "Share what missed the mark so we can improve."}
        text-area-placeholder=${placeholder}
        cancel-label="Close"
        submit-label="Submit"
        show-text-area
        show-prompt
        @feedback-close=${() => this._handlePanelClose(isPositive)}
        @feedback-submit=${(event) =>
          this._handlePanelSubmit(isPositive, event.detail)}
      ></cds-aichat-feedback>
    `;
  }

  _feedbackInitialValues(isPositive) {
    if (
      this._lastSubmission &&
      this._lastSubmission.isPositive === isPositive
    ) {
      return {
        text: this._lastSubmission.text,
        selectedCategories: this._lastSubmission.selectedCategories,
      };
    }
    return null;
  }

  _handleFeedbackToggle(isPositive) {
    if (this._isFeedbackSubmitted) {
      return;
    }

    const currentlySelected = isPositive
      ? this._isPositiveSelected
      : this._isNegativeSelected;
    const toggleToSelected = !currentlySelected;
    const hasDetails = isPositive
      ? this.hasPositiveDetails
      : this.hasNegativeDetails;
    const openDetails = hasDetails && toggleToSelected;

    if (toggleToSelected && !hasDetails) {
      this._recordSubmission(isPositive, { text: "", selectedCategories: [] });
    } else {
      this._isPositiveOpen = openDetails && isPositive;
      this._isNegativeOpen = openDetails && !isPositive;
    }

    if (!toggleToSelected) {
      this._isPositiveOpen = false;
      this._isNegativeOpen = false;
    }

    this._isPositiveSelected = isPositive ? toggleToSelected : false;
    this._isNegativeSelected = isPositive ? false : toggleToSelected;

    this.requestUpdate();
  }

  _handlePanelClose(isPositive) {
    if (this._isFeedbackSubmitted) {
      return;
    }

    if (isPositive) {
      this._isPositiveSelected = false;
      this._isPositiveOpen = false;
    } else {
      this._isNegativeSelected = false;
      this._isNegativeOpen = false;
    }

    this.requestUpdate();
  }

  _handlePanelSubmit(isPositive, details) {
    this._recordSubmission(isPositive, details);
    this._isPositiveOpen = false;
    this._isNegativeOpen = false;
    this.requestUpdate();
  }

  _recordSubmission(isPositive, details) {
    this._isFeedbackSubmitted = true;
    this._isPositiveSelected = isPositive;
    this._isNegativeSelected = !isPositive;
    this._lastSubmission = {
      isPositive,
      text: details?.text || "",
      selectedCategories: details?.selectedCategories || [],
    };

    // eslint-disable-next-line no-console
    console.log(
      `[Feedback Demo] ${
        isPositive ? "Positive" : "Negative"
      } submission recorded`,
      this._lastSubmission,
    );
  }
}

if (
  typeof window !== "undefined" &&
  !customElements.get("cds-aichat-feedback-buttons-demo")
) {
  customElements.define(
    "cds-aichat-feedback-buttons-demo",
    FeedbackButtonsDetailsDemo,
  );
}

export default {
  title: "Components/Feedback/Buttons",
  component: "cds-aichat-feedback-buttons",
  argTypes: {
    isPositiveSelected: {
      control: "boolean",
      description: "Whether the positive button is selected",
    },
    isNegativeSelected: {
      control: "boolean",
      description: "Whether the negative button is selected",
    },
    isPositiveDisabled: {
      control: "boolean",
      description: "Whether the positive button is disabled",
    },
    isNegativeDisabled: {
      control: "boolean",
      description: "Whether the negative button is disabled",
    },
    hasPositiveDetails: {
      control: "boolean",
      description: "Whether positive button opens a details panel",
    },
    hasNegativeDetails: {
      control: "boolean",
      description: "Whether negative button opens a details panel",
    },
    isPositiveOpen: {
      control: "boolean",
      description: "Whether the positive details panel is open",
    },
    isNegativeOpen: {
      control: "boolean",
      description: "Whether the negative details panel is open",
    },
    positiveLabel: {
      control: "text",
      description: "Accessibility label for positive button",
    },
    negativeLabel: {
      control: "text",
      description: "Accessibility label for negative button",
    },
    panelID: {
      control: "text",
      description: "ID of the associated feedback panel",
    },
  },
};

export const Default = {
  args: {
    isPositiveSelected: false,
    isNegativeSelected: false,
    isPositiveDisabled: false,
    isNegativeDisabled: false,
    hasPositiveDetails: false,
    hasNegativeDetails: false,
    isPositiveOpen: false,
    isNegativeOpen: false,
    positiveLabel: "Thumbs up",
    negativeLabel: "Thumbs down",
  },
  render: (args) => html`
    <div style="padding: 2rem;">
      <p style="margin-bottom: 1rem;">
        Click the buttons to provide feedback on this message.
      </p>
      <cds-aichat-feedback-buttons
        ?is-positive-selected=${args.isPositiveSelected}
        ?is-negative-selected=${args.isNegativeSelected}
        ?is-positive-disabled=${args.isPositiveDisabled}
        ?is-negative-disabled=${args.isNegativeDisabled}
        ?has-positive-details=${args.hasPositiveDetails}
        ?has-negative-details=${args.hasNegativeDetails}
        ?is-positive-open=${args.isPositiveOpen}
        ?is-negative-open=${args.isNegativeOpen}
        positive-label=${args.positiveLabel}
        negative-label=${args.negativeLabel}
        panel-id=${args.panelID}
        @feedback-buttons-click=${(event) => {
          const { isPositive } = event.detail;
          console.log(`${isPositive ? "Positive" : "Negative"} button clicked`);
          alert(`${isPositive ? "Positive" : "Negative"} feedback recorded!`);
        }}
      >
      </cds-aichat-feedback-buttons>
    </div>
  `,
};

export const PositiveSelected = {
  args: {
    isPositiveSelected: true,
    isNegativeSelected: false,
    isPositiveDisabled: false,
    isNegativeDisabled: false,
    hasPositiveDetails: false,
    hasNegativeDetails: false,
    isPositiveOpen: false,
    isNegativeOpen: false,
    positiveLabel: "Thumbs up",
    negativeLabel: "Thumbs down",
  },
  render: (args) => html`
    <div style="padding: 2rem;">
      <p style="margin-bottom: 1rem;">Positive feedback has been provided.</p>
      <cds-aichat-feedback-buttons
        ?is-positive-selected=${args.isPositiveSelected}
        ?is-negative-selected=${args.isNegativeSelected}
        ?is-positive-disabled=${args.isPositiveDisabled}
        ?is-negative-disabled=${args.isNegativeDisabled}
        ?has-positive-details=${args.hasPositiveDetails}
        ?has-negative-details=${args.hasNegativeDetails}
        ?is-positive-open=${args.isPositiveOpen}
        ?is-negative-open=${args.isNegativeOpen}
        positive-label=${args.positiveLabel}
        negative-label=${args.negativeLabel}
        panel-id=${args.panelID}
        @feedback-buttons-click=${(event) => {
          const { isPositive } = event.detail;
          console.log(`${isPositive ? "Positive" : "Negative"} button clicked`);
        }}
      >
      </cds-aichat-feedback-buttons>
    </div>
  `,
};

export const NegativeSelected = {
  args: {
    isPositiveSelected: false,
    isNegativeSelected: true,
    isPositiveDisabled: false,
    isNegativeDisabled: false,
    hasPositiveDetails: false,
    hasNegativeDetails: false,
    isPositiveOpen: false,
    isNegativeOpen: false,
    positiveLabel: "Thumbs up",
    negativeLabel: "Thumbs down",
  },
  render: (args) => html`
    <div style="padding: 2rem;">
      <p style="margin-bottom: 1rem;">Negative feedback has been provided.</p>
      <cds-aichat-feedback-buttons
        ?is-positive-selected=${args.isPositiveSelected}
        ?is-negative-selected=${args.isNegativeSelected}
        ?is-positive-disabled=${args.isPositiveDisabled}
        ?is-negative-disabled=${args.isNegativeDisabled}
        ?has-positive-details=${args.hasPositiveDetails}
        ?has-negative-details=${args.hasNegativeDetails}
        ?is-positive-open=${args.isPositiveOpen}
        ?is-negative-open=${args.isNegativeOpen}
        positive-label=${args.positiveLabel}
        negative-label=${args.negativeLabel}
        panel-id=${args.panelID}
        @feedback-buttons-click=${(event) => {
          const { isPositive } = event.detail;
          console.log(`${isPositive ? "Positive" : "Negative"} button clicked`);
        }}
      >
      </cds-aichat-feedback-buttons>
    </div>
  `,
};

export const WithDetailsPanel = {
  args: {
    positiveLabel: "Thumbs up",
    negativeLabel: "Thumbs down",
    panelID: "feedback-panel-example",
  },
  render: (args) => html`
    <div style="padding: 2rem;">
      <p style="margin-bottom: 1rem;">
        Negative feedback opens a details panel for more information.
      </p>
      <cds-aichat-feedback-buttons-demo
        panel-id=${args.panelID}
        positive-label=${args.positiveLabel}
        negative-label=${args.negativeLabel}
        has-negative-details
      ></cds-aichat-feedback-buttons-demo>
    </div>
  `,
};

export const Disabled = {
  args: {
    isPositiveSelected: true,
    isNegativeSelected: false,
    isPositiveDisabled: true,
    isNegativeDisabled: true,
    hasPositiveDetails: false,
    hasNegativeDetails: false,
    isPositiveOpen: false,
    isNegativeOpen: false,
    positiveLabel: "Thumbs up",
    negativeLabel: "Thumbs down",
  },
  render: (args) => html`
    <div style="padding: 2rem;">
      <p style="margin-bottom: 1rem;">
        Feedback has been submitted and cannot be changed.
      </p>
      <cds-aichat-feedback-buttons
        ?is-positive-selected=${args.isPositiveSelected}
        ?is-negative-selected=${args.isNegativeSelected}
        ?is-positive-disabled=${args.isPositiveDisabled}
        ?is-negative-disabled=${args.isNegativeDisabled}
        ?has-positive-details=${args.hasPositiveDetails}
        ?has-negative-details=${args.hasNegativeDetails}
        ?is-positive-open=${args.isPositiveOpen}
        ?is-negative-open=${args.isNegativeOpen}
        positive-label=${args.positiveLabel}
        negative-label=${args.negativeLabel}
        panel-id=${args.panelID}
        @feedback-buttons-click=${() => {
          console.log("Buttons are disabled, should not fire");
        }}
      >
      </cds-aichat-feedback-buttons>
    </div>
  `,
};

export const BothDetails = {
  args: {
    positiveLabel: "Thumbs up",
    negativeLabel: "Thumbs down",
    panelID: "feedback-panel-both",
  },
  render: (args) => html`
    <div style="padding: 2rem;">
      <p style="margin-bottom: 1rem;">
        Both buttons open details panels for collecting more information.
      </p>
      <cds-aichat-feedback-buttons-demo
        panel-id=${args.panelID}
        positive-label=${args.positiveLabel}
        negative-label=${args.negativeLabel}
        has-positive-details
        has-negative-details
      ></cds-aichat-feedback-buttons-demo>
    </div>
  `,
};
