/* eslint-disable */
import React from "react";
import TileContainer from "../../es/react/TileContainer";
import { Tile } from "./Tile";
import Button from "./Button";
import cx from "classnames";
import { Launch } from "@carbon/icons-react";
import { fn } from "storybook/test";

export default {
  title: "Components/Tile Container",
  component: TileContainer,
  decorators: [
    (Story, { args }) =>
      args.useWrapper ? (
        <TileContainer
          className={cx("cds-aichat-tile-container", {
            "bg-layer": args.layered,
          })}
          style={{ maxWidth: args.maxWidth }}
        >
          <Story />
        </TileContainer>
      ) : (
        <Story />
      ),
  ],
  argTypes: {
    maxWidth: {
      control: "radio",
      options: ["unset", "sm", "md", "lg"],
      mapping: { unset: "unset", sm: "291px", md: "438px", lg: "535px" },
    },
    useWrapper: { control: "boolean", description: "Toggle wrapper" },
    layered: { control: "boolean", description: "Add bg-layer class" },
    footerActions: {
      control: "select",
      options: [
        "primary danger buttons",
        "ghost button with icon",
        "secondary button",
        "3 ghost buttons vertical",
        "primary button",
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
    footerActions: "none",
    onClick: fn(),
  },
};

const TileContent = () => (
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

const FooterActions = ({ type, onClick }) => {
  const variants = {
    "primary danger buttons": (
      <>
        <Button onClick={onClick} kind="primary">
          Primary
        </Button>
        <Button onClick={onClick} kind="danger">
          Danger
        </Button>
      </>
    ),
    "ghost button with icon": (
      <Button onClick={onClick} kind="ghost">
        View carbon docs
        <Launch slot="icon" />
      </Button>
    ),
    "secondary button": (
      <Button onClick={onClick} kind="secondary">
        Secondary
        <Launch slot="icon" />
      </Button>
    ),
    "3 ghost buttons vertical": (
      <>
        <Button onClick={onClick} kind="ghost">
          View carbon docs
          <Launch slot="icon" />
        </Button>
        <Button onClick={onClick} kind="ghost">
          View carbon docs
          <Launch slot="icon" />
        </Button>
        <Button onClick={onClick} kind="ghost">
          View carbon docs
          <Launch slot="icon" />
        </Button>
      </>
    ),
    "primary button": (
      <Button onClick={onClick} kind="primary">
        Primary
      </Button>
    ),
    "danger button": (
      <Button onClick={onClick} kind="danger">
        Danger
      </Button>
    ),
    "ghost button": (
      <Button onClick={onClick} kind="ghost">
        Ghost
      </Button>
    ),
    "secondary primary buttons": (
      <>
        <Button onClick={onClick} kind="secondary">
          Secondary
        </Button>
        <Button onClick={onClick} kind="primary">
          Primary
        </Button>
      </>
    ),
    none: null,
  };
  return (
    type !== "none" && (
      <div
        data-rounded="bottom"
        data-flush="bottom"
        data-stacked={type === "3 ghost buttons vertical" ? true : undefined}
        className="cds-aichat--tile-container-footer margin-top-05"
      >
        {variants[type]}
      </div>
    )
  );
};

const defaultImage =
  "https://live.staticflickr.com/540/18795217173_39e0b63304_c.jpg";

export const Default = {
  render: (args) => (
    <Tile
      className={cx("default-class", { "bg-layer": args.layered })}
      data-rounded
    >
      <TileContent />
    </Tile>
  ),
  args: {
    layered: false,
    maxWidth: "sm",
  },
};

export const WithActions = {
  render: (args) => (
    <Tile
      className={cx("default-class", { "bg-layer": args.layered })}
      data-rounded
    >
      <TileContent />
      <FooterActions type={args.footerActions} onClick={args.onClick} />
    </Tile>
  ),
  args: {
    layered: false,
    maxWidth: "sm",
    footerActions: "primary danger buttons",
  },
};

export const WithImage = {
  render: (args) => (
    <Tile
      className={cx("default-class", { "bg-layer": args.layered })}
      data-rounded
    >
      <div className="margin-bottom-05" data-rounded="top" data-flush="top">
        <img src={defaultImage} alt="tile" className="tile-image" />
      </div>
      <TileContent />
      <div
        className={cx("cds-aichat--tile-container-footer", "margin-top-05")}
        data-rounded="bottom"
        data-flush="bottom"
      >
        {args.footerActions(args)}
      </div>
    </Tile>
  ),
  argTypes: {
    footerActions: {
      control: "select",
      options: ["primary button", "ghost button", "none"],
      mapping: {
        "primary button": (args) => (
          <Button onClick={args.onClick} kind="primary">
            Primary
            <Launch slot="icon" />
          </Button>
        ),

        "ghost button": (args) => (
          <Button onClick={args.onClick} kind="ghost">
            Ghost
            <Launch slot="icon" />
          </Button>
        ),
        none: () => "",
      },
      description: "Footer button variations",
    },
  },
  args: {
    footerActions: "primary button",
  },
};
