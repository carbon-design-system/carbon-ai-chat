/* eslint-disable */
import React from "react";
import TileContainer from "../../../react/tile-container";
import { Tile } from "../../../react/tile";
import AILabel from "../../../react/ai-label";
import Button from "../../../react/button";
import IconButton from "../../../react/icon-button";
import { Download, Maximize, View, Share, Version } from "@carbon/icons-react";
import cx from "classnames";
import { action } from "storybook/actions";

export default {
  title: "Components/Tile Container/Preview Card",
  component: TileContainer,
  argTypes: {
    maxWidth: {
      control: "radio",
      options: ["unset", "sm", "md", "lg"],
      mapping: { unset: "unset", sm: "291px", md: "438px", lg: "535px" },
      description: "Sets max width for story wrapper",
    },
    useWrapper: { control: "boolean", description: "Toggle wrapper" },
    layered: {
      control: "boolean",
      description: "Adds 'bg-layer' class on tile for layering",
    },
    footerActions: {
      control: "select",
      options: [
        "2 ghost icon buttons",
        "1 ghost button with icon",
        "1 ghost button with viewing state",
        "none",
      ],
    },
    stepVariation: {
      control: "select",
      options: ["with label", "title only", "wrapping content"],
    },
    onClick: { action: "onClick" },
    aiLabel: { control: "boolean" },
  },
  args: {
    layered: false,
    useWrapper: true,
    footerActions: "2 ghost icon buttons",
    stepVariation: "with label",
    aiLabel: true,
    maxWidth: "sm",
  },
};

const aiContent = (
  <div slot="body-text">
    <h4 className="margin-bottom-05">Powered by IBM watsonx</h4>
    <div>
      IBM watsonx is powered by the latest AI models to intelligently process
      conversations and provide help whenever and wherever you may need it.
    </div>
  </div>
);

const footerAction = (args) => {
  const variants = {
    "2 ghost icon buttons": (
      <div className="display-flex" data-rounded="bottom-right">
        <IconButton size="md" kind="ghost" onClick={action("onClick")}>
          <Download slot="icon" />
          <span slot="tooltip-content">Icon Description</span>
        </IconButton>
        <IconButton size="md" kind="ghost" onClick={action("onClick")}>
          <Maximize slot="icon" />
          <span slot="tooltip-content">Icon Description</span>
        </IconButton>
      </div>
    ),
    "1 ghost button with icon": (
      <Button
        kind="ghost"
        size="md"
        onClick={action("onClick")}
        className="text-primary"
      >
        View details <Maximize slot="icon" />
      </Button>
    ),
    "1 ghost button with viewing state": (
      <Button
        kind="ghost"
        size="md"
        disabled
        data-viewing
        onClick={action("onClick")}
        className="text-primary"
      >
        <View /> Viewing
      </Button>
    ),
    none: null,
  };
  return (
    args.footerActions !== "none" && (
      <div
        className="cds-aichat--tile-container-footer margin-top-05"
        data-flush="bottom"
        data-rounded="bottom"
      >
        {variants[args.footerActions]}
      </div>
    )
  );
};

const StepVariations = {
  "with label": () => (
    <>
      {["Step 1", "Step 2", "Step 3"].map((step, i) => (
        <div
          key={i}
          className={`display-flex padding-inline gap-05 padding-block-04 ${i < 2 ? "border-bottom" : ""}`}
        >
          <p className="body-compact-01 text-primary no-wrap">{step}</p>
          <div>
            <p className="body-compact-01 text-secondary margin-bottom-02">
              Step title
            </p>
            <p className="label-01 text-secondary">Tool: Tool name</p>
          </div>
        </div>
      ))}
    </>
  ),
  "title only": () => (
    <>
      {["Step 1", "Step 2", "Step 3"].map((step, i) => (
        <div
          key={i}
          className={`display-flex padding-inline gap-05 padding-block-04 ${i < 2 ? "border-bottom" : ""}`}
        >
          <p className="body-compact-01 text-primary no-wrap">{step}</p>
          <div>
            <p className="body-compact-01 text-secondary">Step title</p>
          </div>
        </div>
      ))}
    </>
  ),
  "wrapping content": () => (
    <>
      {[
        "Lorem, ipsum.",
        "Lorem ipsum dolor sit, amet consectetur adipisicing elit.",
        "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quod dignissimos distinctio minus placeat dicta dolores, rerum perspiciatis officia laudantium. Quasi!",
      ].map((text, i) => (
        <div
          key={i}
          className={`display-flex padding-inline gap-05 padding-block-04 ${i < 2 ? "border-bottom" : ""}`}
        >
          <p className="body-compact-01 text-primary no-wrap">Step {i + 1}</p>
          <div>
            <p className="body-compact-01 text-secondary">{text}</p>
          </div>
        </div>
      ))}
    </>
  ),
};

const renderWithWrapper = (content, args) => (
  <div style={{ maxWidth: args.maxWidth }}>
    {args.useWrapper ? (
      <TileContainer
        className={cx("cds-aichat-tile-container", {
          "bg-layer": args.layered,
        })}
      >
        {content}
      </TileContainer>
    ) : (
      content
    )}
  </div>
);

export const Small = {
  render: (args) =>
    renderWithWrapper(
      <Tile data-rounded className={cx({ "bg-layer": args.layered })}>
        <h5 className="body-compact-02 margin-bottom-01">Document title</h5>
        <p className="helper-text-01 text-secondary">Subtitle</p>
        {args.aiLabel && (
          <AILabel size="mini" autoalign alignment="bottom-left" slot="">
            {aiContent}
          </AILabel>
        )}
        {footerAction(args)}
      </Tile>,
      args,
    ),
  args: { maxWidth: "sm" },
};

export const Default = {
  render: (args) =>
    renderWithWrapper(
      <Tile data-rounded className={cx({ "bg-layer": args.layered })}>
        <h5 className="body-compact-02 margin-bottom-01">Document title</h5>
        <p className="helper-text-01 text-secondary margin-bottom-03">
          Subtitle
        </p>
        <p className="helper-text-01 text-secondary">Subtitle</p>
        {args.aiLabel && aiContent}
        <div
          data-flush=""
          className="border-top margin-bottom-04 margin-top-04 padding-inline"
        >
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
        </div>
        {args.aiLabel && (
          <AILabel size="mini" autoalign alignment="bottom-left" slot="">
            {aiContent}
          </AILabel>
        )}
        {footerAction(args)}
      </Tile>,
      args,
    ),
  args: {
    footerActions: "1 ghost button with icon",
    maxWidth: "lg",
    aiLabel: true,
  },
};

export const DefaultWithToolbar = {
  render: (args) =>
    renderWithWrapper(
      <Tile data-rounded className={cx({ "bg-layer": args.layered })}>
        <div
          data-rounded="top"
          data-flush=""
          className="cds-aichat--tile-container-toolbar"
        >
          <h5 className="flex-1 body-compact-02 padding-inline align-content-center">
            Resource comsumption
          </h5>
          <div data-rounded="top-right" className="display-flex">
            {args.aiLabel && (
              <AILabel
                className="inline-size-08"
                size="mini"
                autoalign
                alignment="bottom-left"
                slot=""
              >
                {aiContent}
              </AILabel>
            )}
            {[Version, Download, Share, Maximize].map((Icon, i) => (
              <IconButton key={i} onClick={action("onClick")} kind="ghost">
                <Icon slot="icon" />
                <span slot="tooltip-content">Icon Description</span>
              </IconButton>
            ))}
          </div>
        </div>
        <div data-flush="" className="border-top margin-top-05 padding-inline">
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
        </div>
        {footerAction(args)}
      </Tile>,
      args,
    ),
  args: { footerActions: "none", maxWidth: "lg", aiLabel: true },
};

export const WithSteps = {
  render: (args) =>
    renderWithWrapper(
      <Tile data-rounded className={cx({ "bg-layer": args.layered })}>
        <div
          data-rounded="top"
          data-flush=""
          className="cds-aichat--tile-container-toolbar"
        >
          <h5 className="flex-1 body-compact-02 padding-inline align-content-center block-size-08">
            Plan Title
          </h5>
          <div data-rounded="top-right" className="display-flex">
            {args.aiLabel && (
              <AILabel
                className="inline-size-08"
                size="mini"
                autoalign
                alignment="bottom-left"
                slot=""
              >
                {aiContent}
              </AILabel>
            )}
          </div>
        </div>
        <div data-flush="" className="border-top margin-top-05">
          {StepVariations[args.stepVariation]()}
        </div>
        {footerAction(args)}
      </Tile>,
      args,
    ),
  args: {
    footerActions: "1 ghost button with icon",
    maxWidth: "lg",
    aiLabel: true,
  },
};
