/* eslint-disable */
import React from "react";

import Feedback from "../../../react/feedback";
import FeedbackButtons from "../../../react/feedback-buttons";

export default {
  title: "Components/Feedback/Buttons",
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

const renderButtons = (args, options) => {
  const description = options?.description ?? "";
  const clickHandler = options?.onClick;

  return (
    <div style={{ padding: "2rem" }}>
      {description ? (
        <p style={{ marginBottom: "1rem" }}>{description}</p>
      ) : null}
      <FeedbackButtons
        isPositiveSelected={args.isPositiveSelected}
        isNegativeSelected={args.isNegativeSelected}
        isPositiveDisabled={args.isPositiveDisabled}
        isNegativeDisabled={args.isNegativeDisabled}
        hasPositiveDetails={args.hasPositiveDetails}
        hasNegativeDetails={args.hasNegativeDetails}
        isPositiveOpen={args.isPositiveOpen}
        isNegativeOpen={args.isNegativeOpen}
        positiveLabel={args.positiveLabel}
        negativeLabel={args.negativeLabel}
        panelID={args.panelID}
        onClick={(event) => {
          const { isPositive } = event.detail;
          clickHandler?.(isPositive);
        }}
      />
    </div>
  );
};

const reactPositiveCategories = [
  "Accurate",
  "Helpful",
  "Clear explanation",
  "Comprehensive",
];

const reactNegativeCategories = [
  "Inaccurate",
  "Unhelpful",
  "Inappropriate",
  "Too verbose",
];

const FeedbackButtonsWithDetailsDemo = ({
  hasPositiveDetails,
  hasNegativeDetails,
  panelID,
  positiveLabel,
  negativeLabel,
}) => {
  const [state, setState] = React.useState({
    isPositiveSelected: false,
    isNegativeSelected: false,
    isPositiveOpen: false,
    isNegativeOpen: false,
    isSubmitted: false,
    lastSubmission: null,
  });

  const recordSubmission = React.useCallback(
    (prevState, isPositive, details) => {
      const submission = {
        isPositive,
        text: details?.text || "",
        selectedCategories: details?.selectedCategories || [],
      };

      // eslint-disable-next-line no-console
      console.log(
        `[Feedback Demo] ${isPositive ? "Positive" : "Negative"} submission recorded`,
        submission,
      );

      return {
        ...prevState,
        isPositiveSelected: isPositive,
        isNegativeSelected: !isPositive,
        isPositiveOpen: false,
        isNegativeOpen: false,
        isSubmitted: true,
        lastSubmission: submission,
      };
    },
    [],
  );

  const handleButtonClick = React.useCallback(
    (isPositive) => {
      setState((prev) => {
        if (prev.isSubmitted) {
          return prev;
        }

        const currentlySelected = isPositive
          ? prev.isPositiveSelected
          : prev.isNegativeSelected;
        const toggleToSelected = !currentlySelected;
        const hasDetails = isPositive ? hasPositiveDetails : hasNegativeDetails;
        const openDetails = hasDetails && toggleToSelected;

        if (toggleToSelected && !hasDetails) {
          return recordSubmission(prev, isPositive, {
            text: "",
            selectedCategories: [],
          });
        }

        return {
          ...prev,
          isPositiveSelected: isPositive ? toggleToSelected : false,
          isNegativeSelected: isPositive ? false : toggleToSelected,
          isPositiveOpen: openDetails && isPositive,
          isNegativeOpen: openDetails && !isPositive,
        };
      });
    },
    [hasNegativeDetails, hasPositiveDetails, recordSubmission],
  );

  const handleSubmit = React.useCallback(
    (isPositive, details) => {
      setState((prev) => recordSubmission(prev, isPositive, details));
    },
    [recordSubmission],
  );

  const renderFeedbackPanel = (isPositive) => {
    const label = isPositive ? "positive" : "negative";
    const categories = isPositive
      ? reactPositiveCategories
      : reactNegativeCategories;
    const placeholder = isPositive
      ? "What worked well?"
      : "How could this be improved?";

    return (
      <Feedback
        key={label}
        className={`cds-aichat--feedback-details-${label}`}
        id={`${panelID}-feedback-${label}`}
        isOpen={isPositive ? state.isPositiveOpen : state.isNegativeOpen}
        isReadonly={state.isSubmitted}
        categories={categories}
        showTextArea
        showPrompt
        title={isPositive ? "Tell us what worked" : "Tell us what went wrong"}
        prompt={
          isPositive
            ? "Share what made this response helpful."
            : "Share what missed the mark so we can improve."
        }
        placeholder={placeholder}
        cancelLabel="Close"
        submitLabel="Submit"
        onClose={() => handleButtonClick(isPositive)}
        onSubmit={(event) => handleSubmit(isPositive, event.detail)}
      />
    );
  };

  return (
    <div style={{ padding: "2rem" }}>
      <p style={{ marginBottom: "1rem" }}>
        {hasPositiveDetails && hasNegativeDetails
          ? "Both buttons open details panels for collecting more information."
          : "Negative feedback opens a details panel for more information."}
      </p>
      <FeedbackButtons
        isPositiveSelected={state.isPositiveSelected}
        isNegativeSelected={state.isNegativeSelected}
        isPositiveDisabled={state.isNegativeSelected || state.isSubmitted}
        isNegativeDisabled={state.isPositiveSelected || state.isSubmitted}
        hasPositiveDetails={hasPositiveDetails}
        hasNegativeDetails={hasNegativeDetails}
        isPositiveOpen={state.isPositiveOpen}
        isNegativeOpen={state.isNegativeOpen}
        positiveLabel={positiveLabel}
        negativeLabel={negativeLabel}
        panelID={panelID}
        onClick={(event) => {
          handleButtonClick(event.detail.isPositive);
        }}
      />
      <div style={{ marginTop: "1rem", maxWidth: "26rem" }}>
        {hasPositiveDetails ? renderFeedbackPanel(true) : null}
        {hasNegativeDetails ? renderFeedbackPanel(false) : null}
      </div>
      {state.lastSubmission ? (
        <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
          Last submission:{" "}
          <strong>
            {state.lastSubmission.isPositive ? "Positive" : "Negative"}
          </strong>
          {state.lastSubmission.text ? ` — ${state.lastSubmission.text}` : null}
        </p>
      ) : null}
    </div>
  );
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
  render: (args) =>
    renderButtons(args, {
      description: "Click the buttons to provide feedback on this message.",
      onClick: (isPositive) => {
        console.log(`${isPositive ? "Positive" : "Negative"} button clicked`);
        if (typeof window !== "undefined") {
          window.alert(
            `${isPositive ? "Positive" : "Negative"} feedback recorded!`,
          );
        }
      },
    }),
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
  render: (args) =>
    renderButtons(args, {
      description: "Positive feedback has been provided.",
      onClick: (isPositive) => {
        console.log(`${isPositive ? "Positive" : "Negative"} button clicked`);
      },
    }),
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
  render: (args) =>
    renderButtons(args, {
      description: "Negative feedback has been provided.",
      onClick: (isPositive) => {
        console.log(`${isPositive ? "Positive" : "Negative"} button clicked`);
      },
    }),
};

export const WithDetailsPanel = {
  args: {
    positiveLabel: "Thumbs up",
    negativeLabel: "Thumbs down",
    panelID: "feedback-panel-example",
  },
  render: (args) => (
    <FeedbackButtonsWithDetailsDemo
      hasPositiveDetails={false}
      hasNegativeDetails={true}
      panelID={args.panelID}
      positiveLabel={args.positiveLabel}
      negativeLabel={args.negativeLabel}
    />
  ),
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
  render: (args) =>
    renderButtons(args, {
      description: "Feedback has been submitted and cannot be changed.",
      onClick: () => {
        console.log("Buttons are disabled, should not fire");
      },
    }),
};

export const BothDetails = {
  args: {
    positiveLabel: "Thumbs up",
    negativeLabel: "Thumbs down",
    panelID: "feedback-panel-both",
  },
  render: (args) => (
    <FeedbackButtonsWithDetailsDemo
      hasPositiveDetails={true}
      hasNegativeDetails={true}
      panelID={args.panelID}
      positiveLabel={args.positiveLabel}
      negativeLabel={args.negativeLabel}
    />
  ),
};
