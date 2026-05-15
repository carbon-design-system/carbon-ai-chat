/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

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
import {
  AILabel,
  AILabelContent,
  AILabelActions,
  Button,
  IconButton,
  Link,
  Tag,
} from "@carbon/react";
import { Folders, FolderOpen, Launch, View } from "@carbon/icons-react";
import Toolbar from "../../../react/toolbar";
import "./story-styles.scss";
import "@carbon/ai-chat/css/chat-explainability-popover.css";
import { action } from "storybook/actions";
import { previewCardFooterPresets, toolbarActions } from "./story-data";

const explainabilityPopoverBodyContent = (
  <div
    role="dialog"
    slot="body-text"
    className="cds-aichat-explainability-popover--content"
  >
    <header className="cds-aichat-explainability-popover--content__header">
      <div className="cds-aichat-explainability-popover--content__eyebrow-row">
        <span className="cds-aichat-explainability-popover--content__label">
          AI explained
        </span>
        <Tag
          className="cds-aichat--header__slug-confidence"
          size="sm"
          type="outline"
        >
          Confidence: 89%
        </Tag>
      </div>
      <h2 className="cds-aichat-explainability-popover--content__title">
        Name of feature
      </h2>
      <p className="cds-aichat-explainability-popover--content__description">
        High level 1-2 sentence description of how the AI is being used in the
        UI.
      </p>
    </header>
    <section className="cds-aichat-explainability-popover--content__section">
      <div>
        <h3>How it works</h3>
        <ol>
          <li>
            1. <strong>Key word.</strong> Description of key word.
          </li>
          <li>
            2. <strong>Key word.</strong> Description of key word.
          </li>
          <li>
            3. <strong>Key word.</strong> Description of key word.
          </li>
        </ol>
      </div>
      <div>
        <h3>Data types used</h3>
        <ul>
          <li>
            — <strong>Data type 1.</strong> Explain how it's used.
          </li>
          <li>
            — <strong>Data type 2.</strong> Explain how it's used.
          </li>
          <li>
            — <strong>Data type 3.</strong> Explain how it's used.
          </li>
        </ul>
      </div>
    </section>
    <section className="cds-aichat-explainability-popover--content__section">
      <div>
        <h3>AI model</h3>
        <Link
          href="https://example.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Launch slot="icon" size={16} /> granite.13b.v2.instruct
        </Link>
      </div>
      <div>
        <h4>Additional details</h4>
        <p>
          Additional information about data used to fine tune and/or train the
          model
        </p>
      </div>
    </section>
    <section className="cds-aichat-explainability-popover--content__section">
      <div>
        <h3>Training data set</h3>
        <Link
          href="https://example.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Launch slot="icon" size={16} /> IBM Security data piles
        </Link>
      </div>
    </section>
  </div>
);

const explainabilityPopoverActions = (
  <AILabelActions>
    <IconButton size="lg" kind="ghost" label="Folders">
      <Folders slot="icon" />
    </IconButton>
    <IconButton size="lg" kind="ghost" label="Open Folder">
      <FolderOpen slot="icon" />
    </IconButton>
    <IconButton size="lg" kind="ghost" label="View">
      <View slot="icon" />
    </IconButton>
    <Button>View details</Button>
  </AILabelActions>
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
    isFlush: true,
  },
  render: (args) => (
    <Card isLayered={args.isLayered} isFlush={args.isFlush}>
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
        <div slot="decorator">
          <AILabel size="mini" autoalign alignment="bottom-right">
            <AILabelContent>
              {explainabilityPopoverBodyContent}
              {explainabilityPopoverActions}
            </AILabelContent>
          </AILabel>
        </div>
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
    isFlush: true,
  },
  render: (args) => (
    <Card isLayered={args.isLayered} isFlush={args.isFlush}>
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
        <div slot="decorator">
          <AILabel size="mini" autoalign alignment="bottom-right">
            <AILabelContent>
              {explainabilityPopoverBodyContent}
              {explainabilityPopoverActions}
            </AILabelContent>
          </AILabel>
        </div>
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
    isFlush: true,
  },
  render: (args) => (
    <Card isLayered={args.isLayered} isFlush={args.isFlush}>
      <div slot="header" className="preview-card preview-card-toolbar">
        <Toolbar
          overflow
          actions={toolbarActions}
          onToolbarAction={(e) => action("toolbar-action")(e.detail)}
        >
          <div slot="title">
            <h4>
              <span className="truncated-text">Resource consumption</span>
            </h4>
          </div>

          {args.aiLabel && (
            <div slot="decorator">
              <AILabel size="2xs" autoalign alignment="bottom">
                <AILabelContent>
                  {explainabilityPopoverBodyContent}
                  {explainabilityPopoverActions}
                </AILabelContent>
              </AILabel>
            </div>
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
    isFlush: true,
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
      <Card isLayered={args.isLayered} isFlush={args.isFlush}>
        <div slot="header" className="preview-card">
          <Toolbar className="preview-card-toolbar">
            <div slot="title">
              <div className="title-container">
                <h4>Optimizing excess inventory</h4>
                <p>{status}</p>
              </div>
            </div>

            {args.aiLabel && (
              <div slot="decorator">
                <AILabel size="mini" autoalign alignment="bottom">
                  <AILabelContent>
                    {explainabilityPopoverBodyContent}
                    {explainabilityPopoverActions}
                  </AILabelContent>
                </AILabel>
              </div>
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
