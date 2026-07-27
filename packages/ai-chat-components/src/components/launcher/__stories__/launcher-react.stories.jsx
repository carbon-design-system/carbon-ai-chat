/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from "react";
import { action } from "storybook/actions";
import Launcher from "../../../react/launcher";

export default {
  title: "Components/Launcher",
  component: Launcher,
};

const sharedArgTypes = {
  launcherHidden: {
    control: "boolean",
    description: "Hides the launcher and removes it from the tab order.",
  },
  showUnreadIndicator: {
    control: "boolean",
    description:
      "Shows the unread indicator dot when there are no unread messages.",
  },
  unreadMessageCount: {
    control: "number",
    description: "Displays the unread count badge when greater than 0.",
  },
  closedLabel: {
    control: "text",
    description: 'Aria label used when the launcher is in its "open chat" state.',
  },
  openLabel: {
    control: "text",
    description:
      'Aria label used when the launcher is in its "close chat" state.',
  },
  aiEnabled: {
    control: "boolean",
    description: "Renders the AI launch icon instead of the standard chat icon.",
  },
  launcherAvatarUrl: {
    control: "text",
    description: "Optional avatar image URL that replaces the default icon.",
  },
  unreadLabel: {
    control: "text",
    description: "Screen-reader label suffix for unread messages.",
  },
  onToggle: { table: { disable: true } },
};

const Template = (args) => <Launcher onToggle={action("onToggle")} {...args} />;

export const Default = {
  args: {
    launcherHidden: false,
    showUnreadIndicator: false,
    unreadMessageCount: 0,
    closedLabel: "Open chat",
    openLabel: "Close chat",
    aiEnabled: false,
  },
  argTypes: sharedArgTypes,
  render: Template,
};

export const AIEnabled = {
  name: "AI enabled",
  args: {
    ...Default.args,
    aiEnabled: true,
    closedLabel: "Open AI chat",
    openLabel: "Close AI chat",
  },
  argTypes: sharedArgTypes,
  render: Template,
};

export const WithUnreadCount = {
  name: "With unread count",
  args: {
    ...Default.args,
    unreadMessageCount: 3,
    unreadLabel: "3 unread messages",
  },
  argTypes: sharedArgTypes,
  render: Template,
};

export const WithAvatar = {
  name: "With avatar",
  args: {
    ...Default.args,
    launcherAvatarUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/User-avatar.svg/240px-User-avatar.svg.png",
  },
  argTypes: sharedArgTypes,
  render: Template,
};
