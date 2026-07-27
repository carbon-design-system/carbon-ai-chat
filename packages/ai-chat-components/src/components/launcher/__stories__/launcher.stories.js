/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/launcher";
import { html } from "lit";
import { fn } from "storybook/test";
import { ifDefined } from "lit/directives/if-defined.js";

export default {
  title: "Components/Launcher",
  component: "cds-aichat-launcher",
};

const argTypes = {
  launcherHidden: { control: "boolean" },
  showUnreadIndicator: { control: "boolean" },
  unreadMessageCount: { control: "number" },
  closedLabel: { control: "text" },
  openLabel: { control: "text" },
  aiEnabled: { control: "boolean" },
  launcherAvatarUrl: { control: "text" },
  unreadLabel: { control: "text" },
  onToggle: { table: { disable: true } },
};

const Template = (args) => html`
  <cds-aichat-launcher
    @cds-aichat-launcher-toggle=${args.onToggle}
    ?launcher-hidden=${args.launcherHidden}
    ?show-unread-indicator=${args.showUnreadIndicator}
    unread-message-count=${ifDefined(args.unreadMessageCount)}
    closed-label=${ifDefined(args.closedLabel)}
    open-label=${ifDefined(args.openLabel)}
    ?ai-enabled=${args.aiEnabled}
    launcher-avatar-url=${ifDefined(args.launcherAvatarUrl)}
    unread-label=${ifDefined(args.unreadLabel)}
  ></cds-aichat-launcher>
`;

export const Default = {
  args: {
    launcherHidden: false,
    showUnreadIndicator: false,
    unreadMessageCount: 0,
    closedLabel: "Open chat",
    openLabel: "Close chat",
    aiEnabled: false,
    onToggle: fn(),
  },
  argTypes,
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
  argTypes,
  render: Template,
};

export const WithUnreadCount = {
  name: "With unread count",
  args: {
    ...Default.args,
    unreadMessageCount: 3,
    unreadLabel: "3 unread messages",
  },
  argTypes,
  render: Template,
};

export const WithAvatar = {
  name: "With avatar",
  args: {
    ...Default.args,
    launcherAvatarUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/User-avatar.svg/240px-User-avatar.svg.png",
  },
  argTypes,
  render: Template,
};
