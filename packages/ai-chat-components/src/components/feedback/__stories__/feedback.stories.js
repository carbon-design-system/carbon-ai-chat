/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/feedback";
import { html } from "lit";

const negativeCategories = [
  "Inaccurate",
  "Unhelpful",
  "Inappropriate",
  "Not relevant",
  "Too verbose",
  "Missing information",
];

const positiveCategories = [
  "Accurate",
  "Helpful",
  "Well-formatted",
  "Clear explanation",
  "Comprehensive",
];

export default {
  title: "Preview/Feedback",
  component: "cds-aichat-feedback",
  argTypes: {
    isOpen: {
      control: "boolean",
      description: "Whether the feedback panel is open",
    },
    isReadonly: {
      control: "boolean",
      description: "Whether the feedback is in read-only mode",
    },
    title: {
      control: "text",
      description: "Title of the feedback panel",
    },
    body: {
      control: "text",
      description: "Body text for the user",
    },
    placeholder: {
      control: "text",
      description: "Placeholder for the text area",
    },
    categoriesLabel: {
      control: "text",
      description: "Accessible label for the categories listbox",
    },
    secondaryLabel: {
      control: "text",
      description: "Label for the secondary button",
    },
    primaryLabel: {
      control: "text",
      description: "Label for the primary button",
    },
    categories: {
      control: "object",
      description: "Array of category labels shown as chips",
    },
    showTextArea: {
      control: "boolean",
      description: "Show the text area (defaults to false)",
    },
    showBody: {
      control: "boolean",
      description: "Show the body text (defaults to false)",
    },
  },
};

export const Default = {
  args: {
    isOpen: true,
    isReadonly: false,
    title: "Provide feedback",
    body: "Help us improve by sharing your thoughts",
    placeholder: "Tell us more...",
    secondaryLabel: "Cancel",
    primaryLabel: "Submit",
    showTextArea: true,
    showBody: true,
  },
  render: (args) => html`
    <div style="padding: 1rem; max-width: 24rem;">
      <cds-aichat-feedback
        ?is-open=${args.isOpen}
        ?is-readonly=${args.isReadonly}
        title=${args.title}
        body=${args.body}
        text-area-placeholder=${args.placeholder}
        secondary-label=${args.secondaryLabel}
        primary-label=${args.primaryLabel}
        .showTextArea=${args.showTextArea}
        ?show-body=${args.showBody}
        @feedback-submit=${(event) => {
          const details = event.detail;
          console.log("Feedback submitted:", details);
          alert(
            `Feedback submitted!\nText: ${details.text || "(empty)"}\nCategories: ${details.selectedCategories?.join(", ") || "(none)"}`,
          );
        }}
        @feedback-close=${() => {
          console.log("Feedback closed");
        }}
      >
      </cds-aichat-feedback>
    </div>
  `,
};

export const WithCategories = {
  args: {
    isOpen: true,
    isReadonly: false,
    title: "What went wrong?",
    body: "Select all that apply and provide details",
    placeholder: "Please describe the issue...",
    categoriesLabel: "Feedback categories",
    secondaryLabel: "Cancel",
    primaryLabel: "Submit feedback",
    showTextArea: true,
    showBody: true,
  },
  render: (args) => html`
    <div style="padding: 1rem; max-width: 24rem;">
      <cds-aichat-feedback
        ?is-open=${args.isOpen}
        ?is-readonly=${args.isReadonly}
        title=${args.title}
        body=${args.body}
        text-area-placeholder=${args.placeholder}
        categories-label=${args.categoriesLabel}
        secondary-label=${args.secondaryLabel}
        primary-label=${args.primaryLabel}
        .showTextArea=${args.showTextArea}
        ?show-body=${args.showBody}
        .categories=${negativeCategories}
        @feedback-submit=${(event) => {
          const details = event.detail;
          console.log("Feedback submitted:", details);
          alert(
            `Feedback submitted!\nText: ${details.text || "(empty)"}\nCategories: ${details.selectedCategories?.join(", ") || "(none)"}`,
          );
        }}
        @feedback-close=${() => {
          console.log("Feedback closed");
        }}
      >
      </cds-aichat-feedback>
    </div>
  `,
};

export const WithDisclaimer = {
  args: {
    isOpen: true,
    isReadonly: false,
    title: "Share your feedback",
    body: "Help us improve by sharing your thoughts",
    placeholder: "Your feedback...",
    secondaryLabel: "Cancel",
    primaryLabel: "Submit",
    showTextArea: true,
    showBody: true,
  },
  render: (args) => html`
    <div style="padding: 1rem; max-width: 24rem;">
      <cds-aichat-feedback
        ?is-open=${args.isOpen}
        ?is-readonly=${args.isReadonly}
        title=${args.title}
        body=${args.body}
        text-area-placeholder=${args.placeholder}
        secondary-label=${args.secondaryLabel}
        primary-label=${args.primaryLabel}
        .showTextArea=${args.showTextArea}
        ?show-body=${args.showBody}
        .categories=${positiveCategories}
        disclaimer="By submitting feedback, you agree to our [Privacy Policy](https://example.com/privacy). Your feedback may be used to improve our services."
        @feedback-submit=${(event) => {
          const details = event.detail;
          console.log("Feedback submitted:", details);
          alert(
            `Feedback submitted!\nText: ${details.text || "(empty)"}\nCategories: ${details.selectedCategories?.join(", ") || "(none)"}`,
          );
        }}
        @feedback-close=${() => {
          console.log("Feedback closed");
        }}
      >
      </cds-aichat-feedback>
    </div>
  `,
};

export const ReadOnly = {
  args: {
    isOpen: true,
    isReadonly: true,
    title: "Your feedback",
    showTextArea: true,
    showBody: false,
  },
  render: (args) => html`
    <div style="padding: 1rem; max-width: 24rem;">
      <cds-aichat-feedback
        ?is-open=${args.isOpen}
        ?is-readonly=${args.isReadonly}
        title=${args.title}
        .showTextArea=${args.showTextArea}
        ?show-body=${args.showBody}
        .categories=${negativeCategories}
        .initialValues=${{
          text: "The response was inaccurate and didn't address my question properly. It also included irrelevant information.",
          selectedCategories: ["Inaccurate", "Not relevant"],
        }}
      >
      </cds-aichat-feedback>
    </div>
  `,
};
