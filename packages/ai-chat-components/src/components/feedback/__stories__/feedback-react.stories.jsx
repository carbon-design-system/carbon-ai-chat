/* eslint-disable */
import React from "react";

import Feedback from "../../../react/feedback";

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
    onSubmit: {
      action: "onSubmit",
      table: { category: "events" },
      description:
        "Fires when feedback is submitted. `event.detail` includes text and selectedCategories.",
    },
    onClose: {
      action: "onClose",
      table: { category: "events" },
      description: "Fires when the panel is closed without submitting.",
    },
  },
};

const renderFeedback = (args, options) => {
  const description = options?.description;
  const handleSubmit = options?.onSubmit ?? args.onSubmit;
  const handleClose = options?.onClose ?? args.onClose;

  return (
    <div style={{ padding: "1rem", maxWidth: "24rem" }}>
      {description ? (
        <p style={{ marginBottom: "1rem" }}>{description}</p>
      ) : null}
      <Feedback
        isOpen={args.isOpen}
        isReadonly={args.isReadonly}
        title={args.title}
        prompt={args.prompt}
        placeholder={args.placeholder}
        cancelLabel={args.cancelLabel}
        submitLabel={args.submitLabel}
        showTextArea={args.showTextArea}
        showPrompt={args.showPrompt}
        categories={options?.categories}
        disclaimer={options?.disclaimer}
        initialValues={options?.initialValues}
        onSubmit={(event) => {
          const details = event.detail;
          handleSubmit?.(details);
        }}
        onClose={() => {
          handleClose?.();
        }}
      />
    </div>
  );
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
    onSubmit: undefined,
    onClose: undefined,
  },
  render: (args) =>
    renderFeedback(args, {
      onSubmit: (details) => {
        console.log("Feedback submitted:", details);
        if (typeof window !== "undefined") {
          window.alert(
            `Feedback submitted!\nText: ${details.text || "(empty)"}\nCategories: ${details.selectedCategories?.join(", ") || "(none)"}`,
          );
        }
      },
      onClose: () => {
        console.log("Feedback closed");
      },
    }),
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
  render: (args) =>
    renderFeedback(args, {
      description:
        "Provide multiple categories when collecting specific negative feedback.",
      categories: negativeCategories,
      onSubmit: (details) => {
        console.log("Feedback submitted:", details);
        if (typeof window !== "undefined") {
          window.alert(
            `Feedback submitted!\nText: ${details.text || "(empty)"}\nCategories: ${details.selectedCategories?.join(", ") || "(none)"}`,
          );
        }
      },
      onClose: () => {
        console.log("Feedback closed");
      },
    }),
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
  render: (args) =>
    renderFeedback(args, {
      categories: positiveCategories,
      disclaimer:
        "By submitting feedback, you agree to our [Privacy Policy](https://example.com/privacy). Your feedback may be used to improve our services.",
      onSubmit: (details) => {
        console.log("Feedback submitted:", details);
        if (typeof window !== "undefined") {
          window.alert(
            `Feedback submitted!\nText: ${details.text || "(empty)"}\nCategories: ${details.selectedCategories?.join(", ") || "(none)"}`,
          );
        }
      },
      onClose: () => {
        console.log("Feedback closed");
      },
    }),
};

export const ReadOnly = {
  args: {
    isOpen: true,
    isReadonly: true,
    title: "Your feedback",
    showTextArea: true,
    showPrompt: false,
  },
  render: (args) =>
    renderFeedback(args, {
      categories: negativeCategories,
      initialValues: {
        text: "The response was inaccurate and didn't address my question properly. It also included irrelevant information.",
        selectedCategories: ["Inaccurate", "Not relevant"],
      },
    }),
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
  render: (args) =>
    renderFeedback(args, {
      description:
        "Collect quick sentiment using categories only, without a text field.",
      categories: positiveCategories,
      onSubmit: (details) => {
        console.log("Feedback submitted:", details);
        if (typeof window !== "undefined") {
          window.alert(
            `Feedback submitted!\nCategories: ${details.selectedCategories?.join(", ") || "(none)"}`,
          );
        }
      },
      onClose: () => {
        console.log("Feedback closed");
      },
    }),
};
