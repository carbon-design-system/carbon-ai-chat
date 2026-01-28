/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import "../index";
import { html } from "lit";
import styles from "./story-styles.scss?lit";

export default {
  title: "Components/Chat History",
  component: "cds-aichat-chat-history-shell",
  decorators: [
    (story) => html`
      <style>
        ${styles}
      </style>
      <cds-aichat-chat-history-shell>${story()}</cds-aichat-chat-history-shell>
    `,
  ],
};

export const Default = {
  argTypes: {
    HeaderTitle: {
      control: "text",
      description: "Header title text of the chat history shell",
    },
  },
  args: {
    HeaderTitle: "Conversations",
  },
  render: (args) => {
    return html`<cds-aichat-chat-history-header
        title="${args.HeaderTitle}"
      ></cds-aichat-chat-history-header>
      <cds-aichat-chat-history-toolbar></cds-aichat-chat-history-toolbar>`;
  },
};
