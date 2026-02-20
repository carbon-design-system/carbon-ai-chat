/* eslint-disable */
import React from "react";
import Toolbar from "../../../react/toolbar";
import {
  Button,
  OverflowMenu,
  OverflowMenuItem,
  ContentSwitcher,
  Switch,
  IconButton,
  AILabel,
} from "@carbon/react";
import { actionLists } from "./story-data-react";
import { Home, ArrowLeft, OverflowMenuVertical } from "@carbon/icons-react";
import "./story-styles.scss";
import { Default as DefaultWC } from "./toolbar.stories";

import { action } from "storybook/actions";

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
          <div slot="title">
            Title <span class="bold">text</span>
          </div>
        ),
        "with truncation": (
          <div slot="title">
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
          <div slot="navigation" data-rounded="top-left">
            <IconButton
              size="md"
              kind="ghost"
              align="bottom-start"
              enterDelayMs={0}
              leaveDelayMs={0}
              onClick={action("onClick")}
              label="Home"
            >
              <Home />
            </IconButton>
          </div>
        ),
        back: (
          <div slot="navigation" data-rounded="top-left">
            <IconButton
              size="md"
              kind="ghost"
              align="bottom-start"
              enterDelayMs={0}
              leaveDelayMs={0}
              onClick={action("onClick")}
              label="Back"
            >
              <ArrowLeft />
            </IconButton>
          </div>
        ),
        "custom 1": (
          <div slot="navigation" data-rounded="top-left">
            <OverflowMenu
              size="md"
              renderIcon={OverflowMenuVertical}
              iconDescription="Menu"
            >
              <OverflowMenuItem itemText="Stop app" />
              <OverflowMenuItem itemText="Restart app" />
              <OverflowMenuItem itemText="Rename app" />
              <OverflowMenuItem itemText="Clone and move app" disabled />
              <OverflowMenuItem itemText="Edit routes and access" />
              <OverflowMenuItem itemText="Delete app" hasDivider isDelete />
            </OverflowMenu>
          </div>
        ),
        "custom 2": (
          <div slot="navigation" data-rounded="top-left">
            <Button onClick={action("onClick")} size="md">
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
          <div slot="fixed-actions">
            <ContentSwitcher
              onSelected={(e) => console.log(e)}
              selectionMode="automatic"
              selectedIndex="0"
              size="sm"
            >
              <Switch value="code" name="one">
                code
              </Switch>
              <Switch value="preview" name="two">
                preview
              </Switch>
            </ContentSwitcher>
          </div>
        ),
        "custom 1": (
          <div slot="fixed-actions">
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
      description: "AI Label slot in the toolbar component `slot='decorator'`",
    },
    "--cds-aichat-rounded-modifier-radius": {
      control: "boolean",
      description:
        "This is a story only control, which defines css custom property on the toolbar. this gets inherited automatically when placed inside ai-chat. override this to 0px in any particular scope to opt out of rounded border-radius",
    },
  },
};

export const Default = {
  args: {
    ...DefaultWC.args,
  },
  render: ({
    title,
    overflow,
    actions,
    aiLabel,
    navigation,
    "--cds-aichat-rounded-modifier-radius": borderRadius,
    fixedActions,
  }) => {
    return (
      <Toolbar
        actions={actions}
        overflow={overflow}
        style={
          borderRadius
            ? { "--cds-aichat-rounded-modifier-radius": "8px" }
            : undefined
        }
      >
        {/* Navigation slot */}
        {navigation}

        {/* Title slot */}
        <div slot="title">{title}</div>

        {/* Fixed actions slot */}
        {fixedActions}

        {/* AI Label slot */}
        {aiLabel && (
          <AILabel size="2xs" autoalign alignment="bottom" slot="decorator">
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
