/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

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
  Link,
  Tag,
} from "@carbon/react";
import {
  Edit,
  Folders,
  FolderOpen,
  Launch,
  View,
  Home,
  ArrowLeft,
  OverflowMenuVertical,
} from "@carbon/icons-react";
import { actionLists } from "./story-data-react";
import "./story-styles.scss";
import "@carbon/ai-chat/css/chat-explainability-popover.css";
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
          <div slot="navigation">
            <IconButton
              data-rounded="top-left"
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
          <div slot="navigation">
            <IconButton
              data-rounded="top-left"
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
    "--cds-aichat-border-radius": {
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
        <div slot="title">{title}</div>

        {/* Fixed actions slot */}
        {fixedActions}

        {/* AI Label slot */}
        {aiLabel && (
          <AILabel size="2xs" autoalign alignment="bottom" slot="decorator">
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
                  High level 1-2 sentence description of how the AI is being
                  used in the UI.
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
                    Additional information about data used to fine tune and/or
                    train the model
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
            <div className="cds-aichat-explainability-popover--actions">
              <IconButton slot="actions" size="lg" kind="ghost">
                <Folders slot="icon" />
                <span slot="tooltip-content">Folders</span>
              </IconButton>
              <IconButton slot="actions" size="lg" kind="ghost">
                <FolderOpen slot="icon" />
                <span slot="tooltip-content">Open Folder</span>
              </IconButton>
              <IconButton slot="actions" size="lg" kind="ghost">
                <View slot="icon" />
                <span slot="tooltip-content">View</span>
              </IconButton>
              <Button slot="actions">View details</Button>
            </div>
          </AILabel>
        )}
      </Toolbar>
    );
  },
};
