/* eslint-disable */
import React from "react";
import TileContainer from "../../../react/tile-container";
import { Tile, ClickableTile } from "../../../react/tile";
import Button from "../../../react/button";
import cx from "classnames";
import { Launch, ArrowRight, Link } from "@carbon/icons-react";
import { action } from "storybook/actions";

export default {
  title: "Components/Tile Container",
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
      description:
        "Adds 'bg-layer' class on tile for visual layering (story-only)",
    },
    footerAction: {
      control: "select",
      options: [
        "primary danger buttons",
        "ghost button with icon",
        "secondary button",
        "3 ghost buttons vertical",
        "primary button",
        "primary button with icon",
        "danger button",
        "ghost button",
        "secondary primary buttons",
        "none",
      ],
    },
  },
  args: {
    layered: false,
    maxWidth: "sm",
    useWrapper: true,
    footerAction: "none",
  },
};

const tileContent = (
  <>
    <h5 className="heading-01 margin-bottom-04">
      AI Chat Tile styling wrapper
    </h5>
    <p className="body-01">
      The Carbon Design System provides a comprehensive library of components,
      tokens, and guidelines. Implement AI Chat components following Carbon's
      design principles and accessibility standards.
    </p>
  </>
);

const footerAction = ({ args }) => {
  const variants = {
    "primary danger buttons": (
      <>
        <Button onClick={action("onClick")} kind="primary">
          Primary
        </Button>
        <Button onClick={action("onClick")} kind="danger">
          Danger
        </Button>
      </>
    ),
    "ghost button with icon": (
      <Button onClick={action("onClick")} kind="ghost">
        View carbon docs
        <Launch slot="icon" />
      </Button>
    ),
    "secondary button": (
      <Button onClick={action("onClick")} kind="secondary">
        Secondary
        <Launch slot="icon" />
      </Button>
    ),
    "3 ghost buttons vertical": (
      <>
        <Button onClick={action("onClick")} kind="ghost">
          View carbon docs
          <Launch slot="icon" />
        </Button>
        <Button onClick={action("onClick")} kind="ghost">
          View carbon docs
          <Launch slot="icon" />
        </Button>
        <Button onClick={action("onClick")} kind="ghost">
          View carbon docs
          <Launch slot="icon" />
        </Button>
      </>
    ),
    "primary button": (
      <Button onClick={action("onClick")} kind="primary">
        Primary
      </Button>
    ),
    "primary button with icon": (
      <Button onClick={action("onClick")} kind="primary">
        Primary
        <ArrowRight slot="icon" />
      </Button>
    ),
    "danger button": (
      <Button onClick={action("onClick")} kind="danger">
        Danger
      </Button>
    ),
    "ghost button": (
      <Button onClick={action("onClick")} kind="ghost">
        Ghost
      </Button>
    ),
    "secondary primary buttons": (
      <>
        <Button onClick={action("onClick")} kind="secondary">
          Secondary
        </Button>
        <Button onClick={action("onClick")} kind="primary">
          Primary
        </Button>
      </>
    ),
    none: null,
  };
  return (
    args.footerAction !== "none" && (
      <div
        data-rounded="bottom"
        data-flush="bottom"
        data-stacked={
          args.footerAction === "3 ghost buttons vertical" ? true : undefined
        }
        className="cds-aichat--tile-container-footer margin-top-05"
      >
        {variants[args.footerAction]}
      </div>
    )
  );
};

const defaultImage =
  "https://live.staticflickr.com/540/18795217173_39e0b63304_c.jpg";

const renderWithWrapper = (content, args) => {
  return (
    <div style={{ maxWidth: args.maxWidth }}>
      {args.useWrapper ? <TileContainer>{content}</TileContainer> : content}
    </div>
  );
};

export const Default = {
  render: (args) =>
    renderWithWrapper(
      <Tile
        className={cx("default-class", { "bg-layer": args.layered })}
        data-rounded
      >
        {tileContent}
      </Tile>,
      args,
    ),
};

export const WithActions = {
  render: (args) =>
    renderWithWrapper(
      <Tile
        className={cx("default-class", { "bg-layer": args.layered })}
        data-rounded
      >
        {tileContent}
        {footerAction({ args })}
      </Tile>,
      args,
    ),
  args: { footerAction: "primary danger buttons" },
};

export const WithImage = {
  render: (args) =>
    renderWithWrapper(
      <Tile
        className={cx("default-class", { "bg-layer": args.layered })}
        data-rounded
      >
        <div className="margin-bottom-05" data-rounded="top" data-flush="top">
          <img src={defaultImage} alt="tile" className="tile-image" />
        </div>
        {tileContent}
        {footerAction({ args })}
      </Tile>,
      args,
    ),
  args: { footerAction: "primary button" },
};

export const OnlyImage = {
  render: (args) =>
    renderWithWrapper(
      <Tile className={cx({ "bg-layer": args.layered })} data-rounded>
        <div data-flush="">
          <img src={defaultImage} alt="image" data-rounded="" />
        </div>
      </Tile>,
      args,
    ),
};

export const OnlyImageClickable = {
  args: { disabled: false },
  argTypes: {
    disabled: { control: "boolean", description: "Disable clickable tile" },
  },
  render: (args) =>
    renderWithWrapper(
      <ClickableTile
        as="button"
        disabled={args.disabled}
        className={cx({ "bg-layer": args.layered })}
        data-rounded
        onclick={action("onClick")}
      >
        <div data-flush="">
          <img src={defaultImage} alt="image" data-rounded="" />
        </div>
      </ClickableTile>,
      args,
    ),
};

export const WithAudio = {
  name: "With Audio (iframe)",
  render: (args) =>
    renderWithWrapper(
      <Tile className={cx({ "bg-layer": args.layered })} data-rounded>
        <div className="margin-bottom-05" data-flush="top" data-rounded="top">
          <iframe
            className="full-width aspect-16-9"
            title="audio example"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src="https://w.soundcloud.com/player/?url=https://soundcloud.com/kelab-gklm/baby-shark-do-do-do&visual=true&buying=false&liking=false&download=false&sharing=false&show_comments=false&show_playcount=false"
          />
        </div>
        <h5 className="body-02">An audio clip from SoundCloud</h5>
        <p className="caption-01 text-secondary">
          This description and the title above are optional.
        </p>
      </Tile>,
      args,
    ),
};

export const OnlyVideo = {
  render: (args) =>
    renderWithWrapper(
      <Tile className={cx({ "bg-layer": args.layered })} data-rounded>
        <div data-rounded="" data-flush="">
          <iframe
            className="full-width aspect-16-9"
            src="https://www.youtube.com/embed/QuW4_bRHbUk?si=oSsaxYKCvO_gEuzN"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </Tile>,
      args,
    ),
};

export const Clickable = {
  render: (args) =>
    renderWithWrapper(
      <ClickableTile
        as="button"
        onclick={action("onClick")}
        className={cx({ "bg-layer": args.layered })}
        data-rounded
      >
        {tileContent}
        <br />
        <div
          className="link-secondary"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <span
            style={{
              display: "block",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            Lorem ipsum dolor sit amet consectetur adipisicing.
          </span>
          <Link style={{ flex: "none" }} />
        </div>
      </ClickableTile>,
      args,
    ),
};
