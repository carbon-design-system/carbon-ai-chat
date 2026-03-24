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
  title: "Preview/Feedback",
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
    secondaryLabel: {
      control: "text",
      description: "Label for the secondary button",
    },
    primaryLabel: {
      control: "text",
      description: "Label for the primary button",
    },
    showTextArea: {
      control: "boolean",
      description: "Show the text area (defaults to false)",
    },
    showBody: {
      control: "boolean",
      description: "Show the body text (defaults to false)",
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
        body={args.body}
        placeholder={args.placeholder}
        secondaryLabel={args.secondaryLabel}
        primaryLabel={args.primaryLabel}
        showTextArea={args.showTextArea}
        showBody={args.showBody}
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
    body: "Help us improve by sharing your thoughts",
    placeholder: "Tell us more...",
    secondaryLabel: "Cancel",
    primaryLabel: "Submit",
    showTextArea: true,
    showBody: true,
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
    body: "Select all that apply and provide details",
    placeholder: "Please describe the issue...",
    secondaryLabel: "Cancel",
    primaryLabel: "Submit feedback",
    showTextArea: true,
    showBody: true,
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
    body: "Help us improve by sharing your thoughts",
    placeholder: "Your feedback...",
    secondaryLabel: "Cancel",
    primaryLabel: "Submit",
    showTextArea: true,
    showBody: true,
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
    showBody: false,
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
