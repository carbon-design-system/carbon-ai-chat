/*
 *  Copyright IBM Corp. 2025, 2026
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
    disclaimer: {
      control: "text",
      description: "Legal disclaimer text",
    },
    disclaimerCheckbox: {
      control: "text",
      description: "Label text to display with disclaimer checkbox",
    },
    categoriesLabel: {
      control: "text",
      description: "Accessible label for the categories listbox",
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
    maxLength: {
      control: "number",
      description:
        "The maximum number of characters allowed in the feedback text area.",
    },
  },
};

export const Default = {
  args: {
    isOpen: true,
    isReadonly: false,
    title: "Additional feedback",
    body: "Why did you choose this rating?",
    placeholder: "Add a comment",
    primaryLabel: "Submit",
    showTextArea: true,
    showBody: true,
    maxLength: 1000,
  },
  render: (args) => html`
    <div style="padding: 1rem; max-width: 24rem;">
      <cds-aichat-feedback
        ?is-open=${args.isOpen}
        ?is-readonly=${args.isReadonly}
        title=${args.title}
        body=${args.body}
        text-area-placeholder=${args.placeholder}
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
        max-length=${args.maxLength}
      >
      </cds-aichat-feedback>
    </div>
  `,
};

export const WithCategories = {
  args: {
    isOpen: true,
    isReadonly: false,
    title: "Additional feedback",
    body: "Why did you choose this rating?",
    placeholder: "Add a comment",
    categoriesLabel: "Feedback categories",
    primaryLabel: "Submit",
    showTextArea: true,
    showBody: true,
    maxLength: 1000,
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
        max-length=${args.maxLength}
      >
      </cds-aichat-feedback>
    </div>
  `,
};

export const WithDisclaimer = {
  args: {
    isOpen: true,
    isReadonly: false,
    title: "Additional feedback",
    body: "Why did you choose this rating?",
    placeholder: "Add a comment",
    primaryLabel: "Submit",
    showTextArea: true,
    showBody: true,
    disclaimer:
      "To better understand your feedback, a dedicated IBM team may review additional information (such as your prompt and the model output) to drive improvement of AI-powered features. Your content will not be used to train or enhance the AI model.",
    disclaimerCheckbox:
      "I agree to IBM collecting information related to my feedback.",
    maxLength: 1000,
  },
  render: (args) => html`
    <div style="padding: 1rem; max-width: 24rem;">
      <cds-aichat-feedback
        ?is-open=${args.isOpen}
        ?is-readonly=${args.isReadonly}
        title=${args.title}
        body=${args.body}
        text-area-placeholder=${args.placeholder}
        primary-label=${args.primaryLabel}
        .showTextArea=${args.showTextArea}
        ?show-body=${args.showBody}
        .categories=${positiveCategories}
        disclaimer=${args.disclaimer}
        disclaimer-checkbox=${args.disclaimerCheckbox}
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
        max-length=${args.maxLength}
      >
      </cds-aichat-feedback>
    </div>
  `,
};

export const ReadOnly = {
  args: {
    isOpen: true,
    isReadonly: true,
    title: "Additional feedback",
    showTextArea: true,
    showBody: false,
    maxLength: 1000,
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
        max-length=${args.maxLength}
      >
      </cds-aichat-feedback>
    </div>
  `,
};
