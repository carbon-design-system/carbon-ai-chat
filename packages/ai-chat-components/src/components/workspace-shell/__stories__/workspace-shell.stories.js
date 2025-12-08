/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../index";
import "../../toolbar/index";
import "@carbon/web-components/es/components/button/button.js";
import "@carbon/web-components/es/components/tag/tag.js";
import "@carbon/web-components/es/components/icon-button/icon-button.js";
import "@carbon/web-components/es/components/ai-label/ai-label.js";
import "@carbon/web-components/es/components/notification/inline-notification.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import { html } from "lit";
import { action } from "storybook/actions";

import Version16 from "@carbon/icons/es/version/16.js";
import Download16 from "@carbon/icons/es/download/16.js";
import Share16 from "@carbon/icons/es/share/16.js";
import Launch16 from "@carbon/icons/es/launch/16.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import Close16 from "@carbon/icons/es/close/16.js";
import Edit16 from "@carbon/icons/es/edit/16.js";

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
  title: "Components/Workspace shell",
  argTypes: {
    toolbarTitle: {
      control: "text",
      description: "Title text for the Toolbar Component",
    },
    toolbarAction: {
      control: {
        type: "select",
      },
      options: Object.keys(actionLists),
      mapping: actionLists,
      description:
        "Select which predefined set of actions to render in the Toolbar component.",
    },
    toolbarOverflow: {
      control: "boolean",
      description:
        "Provides an option to overflow actions into an overflow menu when the cds-aichat-toolbar component is used in the toolbar slot.",
    },
    notificationTitle: {
      control: "text",
      description: "Title text for the Notification Component",
    },
    notificationSubTitle: {
      control: "text",
      description: "SubTitle text for the Notification Component",
    },
    headerTitle: {
      control: "text",
      description: "Title text for the Header Component",
    },
    headerSubTitle: {
      control: "text",
      description: "SubTitle text for the Header Component",
    },
    headerDescription: {
      control: {
        type: "select",
      },
      options: {
        "Basic text": "basic",
        "With Tags": "withTags",
      },
      description: "Defines the type of description text in Header Component",
    },
    showHeaderAction: {
      control: "boolean",
      description: "Toggles whether header actions are shown",
    },
    bodyContent: {
      control: {
        type: "select",
      },
      options: {
        "Short text": "short",
        "Long text": "long",
      },
      description: "Defines the content in Body Component",
    },
    footerAction: {
      control: {
        type: "select",
      },
      options: {
        "No Action": "noAction",
        "One Button": "one",
        "Two Button": "two",
        "Two Button with ghost": "twoWithghost",
      },
      description: "Defines the actions slot in Footer component ",
    },
  },
  parameters: {
    controls: {
      sort: [
        "toolbarTitle",
        "toolbarAction",
        "toolbarOverflow",
        "notificationTitle",
        "notificationSubTitle",
        "headerTitle",
        "headerSubTitle",
        "headerDescription",
        "showHeaderAction",
        "bodyContent",
        "footerAction",
      ],
    },
  },
  decorators: [
    (story) => html`
      <cds-aichat-workspace-shell>${story()}</cds-aichat-workspace-shell>
    `,
  ],
};

function headerDescription(type) {
  switch (type) {
    case "basic":
      return html`
        <div slot="header-description">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco.
        </div>
      `;
    case "withTags":
      return html`
        <div slot="header-description">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco.
        </div>
        <div slot="header-description">
          <cds-tag size="sm" type="gray">Tag</cds-tag>
          <cds-tag size="sm" type="gray">Tag</cds-tag>
          <cds-tag size="sm" type="gray">Tag</cds-tag>
          <cds-tag size="sm" type="gray">Tag</cds-tag>
          <cds-tag size="sm" type="gray">Tag</cds-tag>
        </div>
      `;
  }
}

function getBodyContent(type) {
  switch (type) {
    case "short":
      return html`
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam, quis nostrud exercitation ullamco.
      `;
    case "long":
      return html`
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur et
        velit sed erat faucibus blandit non nec felis. Nulla facilisi.
        Pellentesque nec finibus lectus. Vestibulum vitae sem eget lacus aliquam
        congue vitae ut elit. Vivamus vulputate elit vel ligula convallis, vitae
        dignissim risus porta. Donec ac augue ac odio accumsan sodales at eget
        nibh. Integer in mi ac enim porttitor ultricies vel non nunc. Maecenas
        cursus lorem ut nisl interdum, vitae maximus justo scelerisque. Fusce
        egestas sapien id sem luctus, nec hendrerit velit elementum. In in justo
        a nunc accumsan vestibulum. Quisque ut interdum est. Proin id felis ac
        justo blandit dictum. Suspendisse in tellus a risus fermentum volutpat
        vel quis leo. Curabitur varius, libero at pulvinar suscipit, urna nisi
        volutpat felis, sed maximus diam eros non metus. Donec lacinia metus non
        faucibus tristique. Praesent a ligula nec odio posuere porta. Cras ut
        odio vitae neque consequat posuere. Ut tristique metus non magna
        ullamcorper porta. Morbi porta, lorem quis sodales blandit, risus mi
        sollicitudin massa, et dignissim odio urna ut nibh. Nulla id suscipit
        urna. Pellentesque a dui malesuada, pulvinar justo in, porttitor elit.
        Etiam et odio vitae ligula gravida convallis. Integer pulvinar, neque
        sit amet consequat vulputate, felis magna sodales odio, ut pulvinar elit
        felis sed libero. Donec vitae purus ex. Vestibulum blandit mi eu nunc
        fermentum, at tristique libero fermentum. Duis nec sem vel magna
        efficitur luctus nec non eros. Vestibulum fringilla, enim at scelerisque
        fermentum, ligula tortor porttitor lorem, id egestas magna elit at
        lacus. Integer sagittis risus ut sapien ullamcorper, at suscipit tortor
        vulputate. Vivamus commodo lorem a libero dapibus tristique. Mauris sed
        commodo metus, sit amet sodales ex. Nam rhoncus lectus sit amet sem
        mattis, nec fermentum mi pretium. Nulla facilisi. Maecenas laoreet
        tortor quis lacinia dapibus. Aenean ac justo non neque sodales placerat.
        Integer dictum lorem nec elit fermentum, at dictum felis mattis.
        Suspendisse viverra volutpat eros ac rhoncus. Aliquam erat volutpat.
        Fusce tempor justo ac nisi fringilla, sit amet sagittis mi interdum.
        Vestibulum laoreet fermentum felis, sed commodo augue malesuada sit
        amet. Integer pharetra, sapien ac tincidunt dictum, arcu diam fermentum
        augue, at eleifend dolor orci in mauris. Donec gravida, leo in lacinia
        scelerisque, urna eros mattis nulla, non viverra enim nisl ac odio. Ut
        ac ante sit amet nisl tincidunt fringilla in id erat. Quisque finibus
        orci ut augue hendrerit, quis bibendum erat facilisis. Duis faucibus
        ligula id risus iaculis commodo. Nullam bibendum, felis quis elementum
        maximus, urna magna laoreet ante, nec tincidunt nunc mi non felis. Nulla
        malesuada, velit sed faucibus malesuada, ex risus feugiat eros, non
        commodo ipsum sem non erat. Integer tincidunt, nulla at faucibus
        euismod, mi turpis suscipit nisi, at convallis leo nunc et lectus. Sed
        euismod posuere risus, ut posuere libero pellentesque ac. Cras convallis
        sed erat a efficitur. Suspendisse potenti. Pellentesque ac imperdiet
        sem, vitae finibus erat. Cras nec libero magna. Aenean mattis sed augue
        nec pretium. Vestibulum tincidunt nulla id sagittis mattis. Mauris
        suscipit, urna eget consequat commodo, velit purus tincidunt erat, sed
        sodales lacus leo ut felis. Nullam gravida est nec efficitur euismod.
        Vivamus lacinia placerat neque in vehicula. Aenean dignissim nisi sed
        velit feugiat lacinia. Sed cursus sapien at sem pretium, vitae gravida
        augue mattis. Ut ullamcorper orci libero, ut fermentum sapien vehicula
        id. Aliquam erat volutpat. Donec consequat dictum mi, sit amet fringilla
        turpis feugiat ac. Mauris in elit nec ante dapibus efficitur. Sed
        luctus, justo at porta tincidunt, justo risus ultricies erat, non
        venenatis sapien magna nec urna. Nunc sit amet dapibus erat. Aenean
        tincidunt lorem a metus consequat vehicula. Proin dictum vestibulum
        mauris a posuere. Integer malesuada metus a bibendum suscipit. Nullam et
        sapien tincidunt, accumsan justo sit amet, faucibus lacus. Fusce sodales
        nunc id fermentum interdum. Nam mattis eros ut convallis sodales. Etiam
        porttitor, enim non bibendum mattis, ligula metus tincidunt magna, eget
        tincidunt purus nisl vel arcu.
      `;
  }
}
function getFooterAction(type) {
  switch (type) {
    case "one":
      return html`
        <cds-button
          size="2xl"
          data-index="1"
          kind="primary"
          slot="footer-action"
          data-rounded="bottom-right-md-none"
          >Button</cds-button
        >
      `;
    case "two":
      return html`
        <cds-button
          size="2xl"
          data-index="1"
          kind="primary"
          slot="footer-action"
          data-rounded="bottom-right-md-none"
          >Button</cds-button
        >
        <cds-button
          size="2xl"
          data-index="2"
          kind="secondary"
          slot="footer-action"
          >Button</cds-button
        >
      `;
    case "twoWithghost":
      return html`
        <cds-button
          size="2xl"
          data-index="1"
          kind="primary"
          slot="footer-action"
          data-rounded="bottom-right-md-none"
          >Button</cds-button
        >
        <cds-button
          size="2xl"
          data-index="2"
          kind="secondary"
          slot="footer-action"
          >Button</cds-button
        >
        <cds-button size="2xl" data-index="3" kind="ghost" slot="footer-action"
          >Button</cds-button
        >
      `;
  }
}

export const Default = {
  args: {
    toolbarTitle: "Title",
    toolbarAction: "Advanced list",
    toolbarOverflow: true,
    notificationTitle: "Title",
    notificationSubTitle: "Message",
    headerTitle: "Title",
    headerSubTitle: "Sub title",
    headerDescription: "withTags",
    showHeaderAction: true,
    bodyContent: "short",
    footerAction: "twoWithghost",
  },
  render: (args) => {
    return html`
      <cds-aichat-toolbar
        slot="toolbar"
        ?overflow=${args.toolbarOverflow}
        .actions=${args.toolbarAction}
      >
        <div slot="title" data-fixed>${args.toolbarTitle}</div>
        <cds-ai-label autoalign="" slot="toolbar-ai-label" size="2xs">
          <div slot="body-text">
            <p class="secondary">
              Lorem ipsum dolor sit amet, di os consectetur adipiscing elit, sed
              do eiusmod tempor incididunt ut fsil labore et dolore magna
              aliqua.
            </p>
          </div>
        </cds-ai-label>
      </cds-aichat-toolbar>
      <cds-inline-notification
        slot="notification"
        .title="${args.notificationTitle}"
        .subtitle="${args.notificationSubTitle}"
        kind="warning"
        low-contrast=""
        hide-close-button
      >
      </cds-inline-notification>
      <cds-aichat-workspace-shell-header
        title-text="${args.headerTitle}"
        subtitle-text="${args.headerSubTitle}"
      >
        ${headerDescription(args.headerDescription)}
        ${args.showHeaderAction &&
        html`
          <cds-button kind="tertiary" slot="header-action">
            Edit Plan ${iconLoader(Edit16, { slot: "icon" })}
          </cds-button>
        `}
      </cds-aichat-workspace-shell-header>
      <cds-aichat-workspace-shell-body>
        ${getBodyContent(args.bodyContent)}
      </cds-aichat-workspace-shell-body>
      ${args.footerAction !== "noAction" &&
      html`
        <cds-aichat-workspace-shell-footer>
          ${getFooterAction(args.footerAction)}
        </cds-aichat-workspace-shell-footer>
      `}
    `;
  },
};
