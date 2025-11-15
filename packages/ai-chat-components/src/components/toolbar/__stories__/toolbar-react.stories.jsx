/* eslint-disable */
import React from "react";
import Toolbar from "../../../react/toolbar";
import Button from "../../../react/button";
import {
  OverflowMenu,
  OverflowMenuBody,
  OverflowMenuItem,
} from "../../../react/overflow-menu";
import {
  ContentSwitcher,
  ContentSwitcherItem,
} from "../../../react/content-switcher";
import Icon from "../../../react/icon";
import IconButton from "../../../react/icon-button";
import AILabel from "../../../react/ai-label";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Version16 from "@carbon/icons/es/version/16.js";
import Download16 from "@carbon/icons/es/download/16.js";
import Share16 from "@carbon/icons/es/share/16.js";
import Launch16 from "@carbon/icons/es/launch/16.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import Close16 from "@carbon/icons/es/close/16.js";
import Home16 from "@carbon/icons/es/home/16.js";
import ArrowLeft16 from "@carbon/icons/es/arrow--left/16.js";
import OverflowMenuVertical16 from "@carbon/icons/es/overflow-menu--vertical/16.js";
import "./story-styles.scss";

import { action } from "storybook/actions";

const actionLists = {
  "Advanced list": [
    {
      text: "Version",
      icon: iconLoader(Version16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Download",
      icon: iconLoader(Download16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Share",
      icon: iconLoader(Share16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Launch",
      icon: iconLoader(Launch16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Maximize",
      icon: iconLoader(Maximize16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Close",
      fixed: true,
      icon: iconLoader(Close16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
  ],
  "Basic list": [
    {
      text: "Launch",
      icon: iconLoader(Launch16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Maximize",
      icon: iconLoader(Maximize16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
    {
      text: "Close",
      fixed: true,
      icon: iconLoader(Close16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
  ],
  "Close only": [
    {
      text: "Close",
      fixed: true,
      icon: iconLoader(Close16, { slot: "icon" }),
      size: "md",
      onClick: action("onClick"),
    },
  ],
  None: [],
};

export default {
  title: "Components/Toolbar",
  component: Toolbar,
  argTypes: {
    title: {
      control: "select",
      table: { category: "slot" },
      options: ["default", "with truncation", "none"],
      mapping: {
        default: (
          <div slot="title" data-fixed>
            Title <span class="bold">text</span>
          </div>
        ),
        "with truncation": (
          <div slot="title" data-fixed>
            <span class="truncated-text">
              Lorem ipsum dolor sit amet <span class="bold">consectetur</span>
            </span>
          </div>
        ),
        none: undefined,
      },
      description:
        "Title text for the Toolbar component. This Storybook-only control populates the title slot. `slot='title'`",
    },
    navigation: {
      control: "select",
      options: ["home", "back", "custom 1", "custom 2", "none"],
      mapping: {
        home: (
          <div slot="navigation" data-fixed data-rounded="top-left">
            <IconButton
              size="md"
              kind="ghost"
              align="bottom-start"
              enterDelayMs={0}
              leaveDelayMs={0}
              onclick={action("onClick")}
            >
              <Icon icon={Home16} slot="icon" />
              <span slot="tooltip-content">Home</span>
            </IconButton>
          </div>
        ),
        back: (
          <div slot="navigation" data-fixed data-rounded="top-left">
            <IconButton
              size="md"
              kind="ghost"
              align="bottom-start"
              enterDelayMs={0}
              leaveDelayMs={0}
              onclick={action("onClick")}
            >
              <Icon icon={ArrowLeft16} slot="icon" />
              <span slot="tooltip-content">Back</span>
            </IconButton>
          </div>
        ),
        "custom 1": (
          <div slot="navigation" data-fixed data-rounded="top-left">
            <OverflowMenu
              size="md"
              index="1"
              kind="ghost"
              align="bottom-start"
              enter-delay-ms="0"
              leave-delay-ms="0"
            >
              <Icon
                icon={OverflowMenuVertical16}
                slot="icon"
                style={{
                  color: "var(--cds-icon-primary)",
                }}
              />
              <span slot="tooltip-content"> Menu </span>
              <OverflowMenuBody>
                <OverflowMenuItem>Stop app</OverflowMenuItem>
                <OverflowMenuItem>Restart app</OverflowMenuItem>
                <OverflowMenuItem>Rename app</OverflowMenuItem>
                <OverflowMenuItem disabled>Clone and move app</OverflowMenuItem>
                <OverflowMenuItem>Edit routes and access</OverflowMenuItem>
                <OverflowMenuItem divider danger>
                  Delete app
                </OverflowMenuItem>
              </OverflowMenuBody>
            </OverflowMenu>
          </div>
        ),
        "custom 2": (
          <div slot="navigation" data-fixed data-rounded="top-left">
            <Button onclick={action("onClick")} size="md">
              test
            </Button>
          </div>
        ),
        none: undefined,
      },
      table: { category: "slot" },
      description:
        "Navigation slot in the toolbar component. `slot='navigation'`",
    },
    fixedActions: {
      control: "select",
      options: ["content switcher", "custom 1", "none"],
      mapping: {
        "content switcher": (
          <div slot="fixed-actions" data-fixed>
            <ContentSwitcher
              onSelected={(e) => console.log(e)}
              selectionMode="automatic"
              selectedIndex="0"
              size="sm"
            >
              <ContentSwitcherItem value="code" name="one">
                code
              </ContentSwitcherItem>
              <ContentSwitcherItem value="preview" name="two">
                preview
              </ContentSwitcherItem>
            </ContentSwitcher>
          </div>
        ),
        "custom 1": (
          <div slot="fixed-actions" data-fixed>
            <Button onclick={action("onClick")} size="md">
              test
            </Button>
          </div>
        ),
        none: undefined,
      },
      table: { category: "slot" },
      description:
        "Fixed actions slot for toolbar component. `slot='fixed-actions'`",
    },
    overflow: {
      control: "boolean",
      description:
        "Option to overflow non fixed actions into an overflow menu.",
    },
    actions: {
      control: "select",
      options: Object.keys(actionLists),
      mapping: actionLists,
      description:
        "Select which predefined set of actions to render in the Toolbar component.",
    },
    aiLabel: {
      table: { category: "slot" },
      control: "boolean",
      description:
        "AI Label slot in the toolbar component `slot='toolbar-ai-label'`",
    },
    "--cds-aichat-border-radius": {
      control: "boolean",
      description:
        "This is a story only control, which defines css custom property on the toolbar. this gets inherited automatically when placed inside ai-chat. override this to 0px in any particular scope to opt out of rounded border-radius",
    },
  },
};

export const Default = {
  args: {
    title: "default",
    overflow: true,
    actions: "Advanced list",
    navigation: "home",
    fixedActions: "none",
    aiLabel: true,
    "--cds-aichat-border-radius": false,
  },
  render: ({
    title,
    overflow,
    actions,
    aiLabel,
    navigation,
    "--cds-aichat-border-radius": borderRadius,
    fixedActions,
  }) => {
    return (
      <Toolbar
        actions={actions}
        overflow={overflow}
        style={
          borderRadius ? { "--cds-aichat-border-radius": "8px" } : undefined
        }
      >
        {/* Navigation slot */}
        {navigation}

        {/* Title slot */}
        <div slot="title" data-fixed>
          {title}
        </div>

        {/* Fixed actions slot */}
        {fixedActions}

        {/* AI Label slot */}
        {aiLabel && (
          <AILabel
            size="2xs"
            autoalign
            alignment="bottom"
            slot="toolbar-ai-label"
          >
            <div slot="body-text">
              <h4 className="margin-bottom-05">Powered by IBM watsonx</h4>
              <div>
                IBM watsonx is powered by the latest AI models to intelligently
                process conversations and provide help whenever and wherever you
                may need it.
              </div>
            </div>
          </AILabel>
        )}
      </Toolbar>
    );
  },
};
