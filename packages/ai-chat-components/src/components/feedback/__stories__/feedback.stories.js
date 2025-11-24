/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/cds-aichat-feedback";
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
  title: "Components/Feedback",
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
    prompt: {
      control: "text",
      description: "Prompt text for the user",
    },
    placeholder: {
      control: "text",
      description: "Placeholder for the text area",
    },
    cancelLabel: {
      control: "text",
      description: "Label for the cancel button",
    },
    submitLabel: {
      control: "text",
      description: "Label for the submit button",
    },
    showTextArea: {
      control: "boolean",
      description: "Show the text area",
    },
    showPrompt: {
      control: "boolean",
      description: "Show the prompt text",
    },
  },
};

export const Default = {
  args: {
    isOpen: true,
    isReadonly: false,
    title: "Provide feedback",
    prompt: "Help us improve by sharing your thoughts",
    placeholder: "Tell us more...",
    cancelLabel: "Cancel",
    submitLabel: "Submit",
    showTextArea: true,
    showPrompt: true,
  },
  render: (args) => html`
    <cds-aichat-feedback
      ?is-open=${args.isOpen}
      ?is-readonly=${args.isReadonly}
      title=${args.title}
      prompt=${args.prompt}
      text-area-placeholder=${args.placeholder}
      cancel-label=${args.cancelLabel}
      submit-label=${args.submitLabel}
      .showTextArea=${args.showTextArea}
      ?show-prompt=${args.showPrompt}
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
  `,
};

export const WithCategories = {
  args: {
    isOpen: true,
    isReadonly: false,
    title: "What went wrong?",
    prompt: "Select all that apply and provide details",
    placeholder: "Please describe the issue...",
    cancelLabel: "Cancel",
    submitLabel: "Submit feedback",
    showTextArea: true,
    showPrompt: true,
  },
  render: (args) => html`
    <cds-aichat-feedback
      ?is-open=${args.isOpen}
      ?is-readonly=${args.isReadonly}
      title=${args.title}
      prompt=${args.prompt}
      text-area-placeholder=${args.placeholder}
      cancel-label=${args.cancelLabel}
      submit-label=${args.submitLabel}
      .showTextArea=${args.showTextArea}
      ?show-prompt=${args.showPrompt}
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
  `,
};

export const WithDisclaimer = {
  args: {
    isOpen: true,
    isReadonly: false,
    title: "Share your feedback",
    prompt: "Help us improve by sharing your thoughts",
    placeholder: "Your feedback...",
    cancelLabel: "Cancel",
    submitLabel: "Submit",
    showTextArea: true,
    showPrompt: true,
  },
  render: (args) => html`
    <cds-aichat-feedback
      ?is-open=${args.isOpen}
      ?is-readonly=${args.isReadonly}
      title=${args.title}
      prompt=${args.prompt}
      text-area-placeholder=${args.placeholder}
      cancel-label=${args.cancelLabel}
      submit-label=${args.submitLabel}
      .showTextArea=${args.showTextArea}
      ?show-prompt=${args.showPrompt}
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
  `,
};

export const ReadOnly = {
  args: {
    isOpen: true,
    isReadonly: true,
    title: "Your feedback",
    showTextArea: true,
    showPrompt: false,
  },
  render: (args) => html`
    <cds-aichat-feedback
      ?is-open=${args.isOpen}
      ?is-readonly=${args.isReadonly}
      title=${args.title}
      .showTextArea=${args.showTextArea}
      ?show-prompt=${args.showPrompt}
      .categories=${negativeCategories}
      .initialValues=${{
        text: "The response was inaccurate and didn't address my question properly. It also included irrelevant information.",
        selectedCategories: ["Inaccurate", "Not relevant"],
      }}
    >
    </cds-aichat-feedback>
  `,
};

export const WithoutTextArea = {
  args: {
    isOpen: true,
    isReadonly: false,
    title: "Quick feedback",
    prompt: "Select all that apply",
    cancelLabel: "Cancel",
    submitLabel: "Submit",
    showTextArea: false,
    showPrompt: true,
  },
  render: (args) => html`
    <cds-aichat-feedback
      ?is-open=${args.isOpen}
      ?is-readonly=${args.isReadonly}
      title=${args.title}
      prompt=${args.prompt}
      cancel-label=${args.cancelLabel}
      submit-label=${args.submitLabel}
      .showTextArea=${args.showTextArea}
      ?show-prompt=${args.showPrompt}
      .categories=${positiveCategories}
      @feedback-submit=${(event) => {
        const details = event.detail;
        console.log("Feedback submitted:", details);
        alert(
          `Feedback submitted!\nCategories: ${details.selectedCategories?.join(", ") || "(none)"}`,
        );
      }}
      @feedback-close=${() => {
        console.log("Feedback closed");
      }}
    >
    </cds-aichat-feedback>
  `,
};
