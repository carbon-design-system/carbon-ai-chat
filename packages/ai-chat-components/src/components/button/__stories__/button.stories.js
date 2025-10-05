/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * @license
 *
 * Copyright IBM Corp. 2023
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

// https://storybook.js.org/docs/essentials/controls#conditional-controls

import "../button";
import { html } from "lit";
import {
  BUTTON_KIND,
  BUTTON_SIZE,
  BUTTON_TOOLTIP_ALIGNMENT,
  BUTTON_TOOLTIP_POSITION,
  BUTTON_TYPE,
} from "@carbon/web-components/es/components/button/button.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Add16 from "@carbon/icons/es/add/16.js";
import { expect, fn } from "storybook/test";

const slots = {
  Add16: () => html`${iconLoader(Add16, { slot: "icon" })}`,
  None: () => "",
};

const validButtonSizes = [
  BUTTON_SIZE.EXTRA_SMALL,
  BUTTON_SIZE.SMALL,
  BUTTON_SIZE.MEDIUM,
  BUTTON_SIZE.LARGE,
];

const sharedArgTypes = {
  disabled: {
    control: "boolean",
    description: "Specify whether the Button should be disabled, or not",
  },
  href: {
    control: "text",
    description:
      "Optionally specify an href for your Button to become an `<a>` element",
  },
  isExpressive: {
    control: "boolean",
    description: "Specify whether the Button is expressive, or not",
  },
  linkRole: {
    control: "text",
    description:
      "Optional prop to specify the role of the Button. This doesn't work yet from Carbon and will be available soon.",
    if: { arg: "href" },
  },
  size: {
    control: "select",
    options: validButtonSizes,
    description: "Specify the size of the button",
  },
  type: {
    control: "radio",
    options: Object.values(BUTTON_TYPE),
    description: "Specify the type of the Button",
  },
  onClick: { table: { disable: true } },
};

const sharedArgs = {
  disabled: false,
  isExpressive: false,
  size: BUTTON_SIZE.LARGE,
  onClick: fn(),
};

const baseButtonTemplate = (args) => html`
  <cds-aichat-button
    @click=${args.onClick}
    data-testid="test-button"
    .button-class-name="${args.buttonClassName}"
    danger-description="${args.dangerDescription}"
    ?disabled="${args.disabled}"
    .href="${args.href}"
    ?isExpressive="${args.isExpressive}"
    ?isSelected="${args.isSelected}"
    .kind="${args.kind}"
    .linkRole="${args.linkRole || undefined}"
    .size="${args.size}"
    tooltip-text=${args.tooltipText}
    .tooltip-alignment="${args.tooltipAlignment}"
    .tooltip-position="${args.tooltipPosition}"
    .type="${args.type}"
    ?is-quick-action="${args.isQuickAction}"
  >
    ${args.buttonText} ${args.iconSlot?.()}
  </cds-aichat-button>
`;

const playFunction = async ({ canvas, userEvent, args }) => {
  const button = canvas.getByTestId("test-button");
  const buttonTrigger = button.shadowRoot.querySelector(".cds--btn");

  await userEvent.click(buttonTrigger);
  expect(args.onClick).toHaveBeenCalled();

  if (args.iconSlot && !args.buttonText && args.tooltipText) {
    expect(button.shadowRoot.textContent.includes(args.tooltipText)).toBe(true);
  }

  await userEvent.click(document.body);
  expect(button).not.toHaveFocus();
};

const createStory = ({
  name,
  kindOptions,
  extraArgTypes = {},
  extraArgs = {},
  iconOptions = Object.keys(slots),
}) => ({
  name,
  argTypes: {
    ...sharedArgTypes,
    kind: {
      control: "select",
      options: kindOptions,
      description: "Specify the kind of Button you want to create",
    },
    buttonText: {
      control: "text",
      description:
        "The button text. storybook only control, not a prop/attribute",
      table: { category: "story controls" },
    },
    iconSlot: {
      control: "select",
      options: iconOptions,
      mapping: slots,
      description: "Places the slotted icon inside the button",
      table: { category: "slot" },
    },
    ...extraArgTypes,
  },
  args: {
    ...sharedArgs,
    kind: kindOptions[0],
    buttonText: "Button",
    iconSlot: "None",
    ...extraArgs,
  },
  render: baseButtonTemplate,
});

export default {
  title: "Components/Chat button",
  play: playFunction,
};

export const Default = createStory({
  name: "Primary (default)",
  kindOptions: [BUTTON_KIND.PRIMARY],
});

export const Secondary = createStory({
  name: "Secondary",
  kindOptions: [BUTTON_KIND.SECONDARY],
});

export const Tertiary = createStory({
  name: "Tertiary",
  kindOptions: [BUTTON_KIND.TERTIARY],
});

export const Danger = createStory({
  name: "Danger",
  kindOptions: [
    BUTTON_KIND.DANGER,
    BUTTON_KIND.DANGER_TERTIARY,
    BUTTON_KIND.DANGER_GHOST,
  ],
  extraArgTypes: {
    dangerDescription: {
      control: "text",
      description:
        "Specify the message read by screen readers for the danger button variant",
    },
  },
});

export const Ghost = createStory({
  name: "Ghost",
  kindOptions: [BUTTON_KIND.GHOST],
});

export const IconOnly = createStory({
  name: "Icon Only",
  kindOptions: [
    BUTTON_KIND.PRIMARY,
    BUTTON_KIND.SECONDARY,
    BUTTON_KIND.TERTIARY,
    BUTTON_KIND.DANGER,
    BUTTON_KIND.DANGER_TERTIARY,
    BUTTON_KIND.DANGER_GHOST,
    BUTTON_KIND.GHOST,
  ],
  extraArgTypes: {
    tooltipText: {
      control: "text",
      description:
        "Tooltip text for icon-only button. Must include descriptive text for accessibility.",
    },
    tooltipAlignment: {
      control: "radio",
      options: Object.values(BUTTON_TOOLTIP_ALIGNMENT),
      description: "Alignment of the tooltip: start, center, or end.",
      if: { arg: "tooltipText" },
    },
    tooltipPosition: {
      control: "radio",
      options: Object.values(BUTTON_TOOLTIP_POSITION),
      description: "Direction of the tooltip: top, right, bottom, or left.",
      if: { arg: "tooltipText" },
    },
    isSelected: {
      control: "boolean",
      description:
        "Whether the Button is selected. Applies to Ghost variant and quick action.",
      if: { arg: "kind", eq: BUTTON_KIND.GHOST },
    },
  },
  iconOptions: ["Add16"],
  extraArgs: {
    iconSlot: "Add16",
    isSelected: false,
    tooltipText: "Add",
    tooltipAlignment: BUTTON_TOOLTIP_ALIGNMENT.CENTER,
    tooltipPosition: BUTTON_TOOLTIP_POSITION.TOP,
  },
});

export const QuickAction = createStory({
  name: "Quick Action",
  kindOptions: [BUTTON_KIND.GHOST],
  extraArgTypes: {
    isQuickAction: {
      control: { disable: true },
      description:
        "Specify whether the Button is a quick action. This overrides `kind` defaulting to ghost.",
    },
    isSelected: {
      control: "boolean",
      description:
        "Specify whether the Button is currently selected. Applies to Ghost and Quick Action buttons.",
    },
  },
  extraArgs: {
    buttonText: "Quick action",
    isQuickAction: true,
    size: BUTTON_SIZE.SMALL,
    isSelected: false,
  },
});
