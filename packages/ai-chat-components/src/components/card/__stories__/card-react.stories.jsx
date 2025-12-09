/* eslint-disable */
import React from "react";
import { Card, CardFooter } from "../../../react/card";
import {
  Default as DefaultWC,
  WithActions as WithActionsWC,
  WithImage as WithImageWC,
  OnlyImage as OnlyImageWC,
  WithAudio as WithAudioWC,
  OnlyVideo as OnlyVideoWC,
  CardFooter as CardFooterWC,
} from "./card.stories";
import "./story-styles.scss";
import { action } from "storybook/actions";
import { cardFooterPresets, previewCardFooterPresets } from "./story-data";

const cardContent = (
  <div slot="body" className="standard-card">
    <h4>AI Chat Card</h4>
    <p>
      The Carbon Design System provides a comprehensive library of components,
      tokens, and guidelines. We need to implement the new AI Chat component
      following Carbon's design principles and accessibility standards.
    </p>
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
  title: "Components/Card",
  decorators: [
    (Story, { args }) => (
      <Wrapper width={args.maxWidth}>
        <Story />
      </Wrapper>
    ),
  ],
};

export const Default = {
  argTypes: {
    ...DefaultWC.argTypes,
  },
  args: {
    ...DefaultWC.args,
  },
  render: (args) => <Card isLayered={args.isLayered}>{cardContent}</Card>,
};
export const WithActions = {
  argTypes: {
    ...WithActionsWC.argTypes,
  },
  args: {
    ...WithActionsWC.args,
  },
  render: (args) => (
    <Card isLayered={args.isLayered}>
      {cardContent}
      <CardFooter
        size={args.footerSize}
        actions={cardFooterPresets[args.footerActions]}
        onFooterAction={(e) => action("action")(e.detail)}
      />
    </Card>
  ),
};

export const WithImage = {
  argTypes: {
    ...WithImageWC.argTypes,
  },
  args: {
    ...WithImageWC.args,
  },
  render: (args) => (
    <Card isLayered={args.isLayered}>
      <div slot="media" data-rounded="top">
        <img src={args.image} alt="Card media" />
      </div>
      {cardContent}
      <CardFooter
        size={args.footerSize}
        actions={cardFooterPresets[args.footerActions]}
        onFooterAction={(e) => action("action")(e.detail)}
      />
    </Card>
  ),
};

export const OnlyImage = {
  argTypes: {
    ...OnlyImageWC.argTypes,
  },
  args: {
    ...OnlyImageWC.args,
  },
  render: (args) => (
    <Card isLayered={args.isLayered}>
      <div slot="media" data-rounded="">
        <img src={args.image} alt="Card image" />
      </div>
    </Card>
  ),
};

export const WithAudio = {
  argTypes: {
    ...WithAudioWC.argTypes,
  },
  args: {
    ...WithAudioWC.args,
  },
  render: (args) => (
    <Card isLayered={args.isLayered}>
      <div slot="media" data-rounded="top">
        <iframe
          title="audio example"
          scrolling="no"
          frameBorder="no"
          allow="autoplay"
          src={args.audio}
        />
      </div>
      <div slot="body" className="iframe-body">
        <h4>An audio clip from SoundCloud</h4>
        <p>This description and the title above are optional.</p>
      </div>
    </Card>
  ),
};

export const OnlyVideo = {
  argTypes: {
    ...OnlyVideoWC.argTypes,
  },
  args: {
    ...OnlyVideoWC.args,
  },
  render: (args) => (
    <Card isLayered={args.isLayered}>
      <div slot="media" data-rounded="">
        <iframe
          title="video example"
          src={args.video}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </Card>
  ),
};
export const CardFooterStory = {
  name: "Card Footer",
  argTypes: {
    ...(() => {
      const { "@cds-aichat-card-footer-action": _, ...rest } =
        CardFooterWC.argTypes;
      return rest;
    })(),
    onFooterAction: {
      action: "action",
      description:
        CardFooterWC.argTypes["@cds-aichat-card-footer-action"].description,
      control: "none",
      table: { category: "events" },
    },
  },
  args: {
    ...CardFooterWC.args,
  },
  render: (args) => (
    <CardFooter
      style={
        args["--cds-aichat-rounded-modifier-radius"]
          ? { "--cds-aichat-rounded-modifier-radius": "8px" }
          : undefined
      }
      size={args.footerSize}
      actions={
        { ...cardFooterPresets, ...previewCardFooterPresets }[
          args.footerActions
        ]
      }
      onFooterAction={(e) => action("action")(e.detail)}
    />
  ),
};
