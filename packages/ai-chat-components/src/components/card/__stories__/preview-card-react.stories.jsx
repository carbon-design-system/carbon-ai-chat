/* eslint-disable */
import React, { useState, useEffect } from "react";
import { ICON_INDICATOR_KIND } from "@carbon/web-components/es/components/icon-indicator/defs.js";
import {
  Small as SmallWC,
  Default as DefaultWC,
  WithToolbar as WithToolbarWC,
  WithSteps as WithStepsWC,
  CardSteps as CardStepsWC,
} from "./preview-card.stories";
import { Card, CardFooter, CardSteps } from "../../../react/card";
import AILabel from "../../../react/ai-label";
import Toolbar from "../../../react/toolbar";
import "./story-styles.scss";
import { action } from "storybook/actions";
import { name } from "@carbon/icons/lib/caret--down";
import { previewCardFooterPresets, toolbarActions } from "./story-data";

const aiContent = (
  <div slot="body-text" class="ai-label-body">
    <h4>Powered by IBM watsonx</h4>
    <div>
      IBM watsonx is powered by the latest AI models to intelligently process
      conversations and provide help whenever and wherever you may need it.
    </div>
  </div>
);

const Wrapper = ({ width, children }) => {
  return width === "unset" ? (
    children
  ) : (
    <div style={{ maxWidth: width }}>{children}</div>
  );
};

export default {
  title: "Components/Card/Preview Card",
  decorators: [
    (Story, { args }) => (
      <Wrapper width={args.maxWidth}>
        <Story />
      </Wrapper>
    ),
  ],
};

export const Small = {
  argTypes: {
    ...SmallWC.argTypes,
  },
  args: {
    ...SmallWC.args,
  },
  render: (args) => (
    <Card isLayered={args.isLayered}>
      <div slot="body" class="preview-card preview-card-small">
        <h4>Document title</h4>
        <p>Subtitle</p>
      </div>
      <div slot="footer">
        <CardFooter
          size="md"
          actions={previewCardFooterPresets[args.footerActions]}
          onFooterAction={(e) => action("action")(e.detail)}
        />
      </div>
      {args.aiLabel && (
        <AILabel
          size="mini"
          autoalign
          alignment="bottom-right"
          slot="decorator"
        >
          {aiContent}
        </AILabel>
      )}
    </Card>
  ),
};

export const Default = {
  argTypes: {
    ...DefaultWC.argTypes,
  },
  args: {
    ...DefaultWC.args,
  },
  render: (args) => (
    <Card isLayered={args.isLayered}>
      <div slot="header" className="preview-card preview-card-default">
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

      {args.footerActions && (
        <CardFooter
          size="md"
          actions={previewCardFooterPresets[args.footerActions]}
          onFooterAction={(e) => action("action")(e.detail)}
        />
      )}

      {args.aiLabel && (
        <AILabel
          size="mini"
          autoalign
          alignment="bottom-right"
          slot="decorator"
        >
          {aiContent}
        </AILabel>
      )}
    </Card>
  ),
};

export const WithToolbar = {
  argTypes: {
    ...WithToolbarWC.argTypes,
  },
  args: {
    ...WithToolbarWC.args,
  },
  render: (args) => (
    <Card isLayered={args.isLayered}>
      <div slot="header" className="preview-card preview-card-toolbar">
        <Toolbar
          overflow
          actions={toolbarActions}
          onToolbarAction={(e) => action("toolbar-action")(e.detail)}
        >
          <div slot="title" data-fixed>
            <h4>
              <span className="truncated-text">Resource consumption</span>
            </h4>
          </div>

          {args.aiLabel && (
            <AILabel size="2xs" autoalign alignment="bottom" slot="decorator">
              {aiContent}
            </AILabel>
          )}
        </Toolbar>
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

      {args.footerActions && (
        <CardFooter
          size="md"
          actions={previewCardFooterPresets[args.footerActions]}
          onFooterAction={(e) => action("footer-action")(e.detail)}
        />
      )}
    </Card>
  ),
};

export const WithSteps = {
  argTypes: {
    ...WithStepsWC.argTypes,
  },
  args: {
    ...WithStepsWC.args,
  },
  render: (args) => {
    const initialSteps = [
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

    const [steps, setSteps] = useState(initialSteps);
    const [status, setStatus] = useState("Status: running");
    const [currentStep, setCurrentStep] = useState(0);
    const [showFooter, setShowFooter] = useState(false);

    useEffect(() => {
      if (currentStep >= steps.length) return;

      const timer = setTimeout(() => {
        setSteps((prev) => {
          const updated = [...prev];
          updated[currentStep].kind = ICON_INDICATOR_KIND.SUCCEEDED;
          updated[currentStep].description = "Completed successfully";

          if (updated[currentStep + 1]) {
            updated[currentStep + 1].kind = ICON_INDICATOR_KIND["IN-PROGRESS"];
            updated[currentStep + 1].description = "In progress...";
          }

          return updated;
        });

        if (currentStep + 1 < steps.length) {
          setCurrentStep(currentStep + 1);
        } else {
          setStatus("Status: completed");
          setShowFooter(true);
        }
      }, timeSteps[currentStep]);

      return () => clearTimeout(timer);
    }, [currentStep]);

    return (
      <Card isLayered={args.isLayered}>
        <div slot="header" className="preview-card preview-card-toolbar">
          <Toolbar className="preview-card-toolbar">
            <div slot="title" data-fixed>
              <div className="title-container">
                <h4>Optimizing excess inventory</h4>
                <p>{status}</p>
              </div>
            </div>

            {args.aiLabel && (
              <AILabel
                size="mini"
                autoalign
                alignment="bottom"
                slot="decorator"
              >
                {aiContent}
              </AILabel>
            )}
          </Toolbar>
        </div>

        <div slot="body" className="preview-card preview-card-steps">
          <CardSteps steps={steps} />
        </div>

        {showFooter && (
          <CardFooter
            size="md"
            actions={previewCardFooterPresets[args.footerActions]}
            onFooterAction={(e) => action("action")(e.detail)}
          />
        )}
      </Card>
    );
  },
};

export const CardStepsStory = {
  name: "Card Steps",
  argTypes: {
    ...CardStepsWC.argTypes,
  },

  args: {
    ...CardStepsWC.args,
  },

  render: (args) => {
    const steps = Array.from({ length: args.numberOfSteps }, (_, i) => ({
      label: `${args.label}`,
      kind:
        args.kind === "none"
          ? undefined
          : ICON_INDICATOR_KIND[args.kind] || args.kind,
      title: args.title,
      description: args.description,
    }));

    return <CardSteps steps={steps} />;
  },
};
