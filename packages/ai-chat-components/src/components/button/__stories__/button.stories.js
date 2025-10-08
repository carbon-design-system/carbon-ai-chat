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
  BUTTON_TYPE,
  BUTTON_TOOLTIP_POSITION,
} from "@carbon/web-components/es/components/button/button.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Add16 from "@carbon/icons/es/add/16.js";
import Link16 from "@carbon/icons/es/link/16.js";
import { expect, fn } from "storybook/test";

const slots = {
  Add16: () => html`${iconLoader(Add16, { slot: "icon" })}`,
  Link16: () => html`${iconLoader(Link16, { slot: "icon" })}`,
  None: () => "",
};

const sharedArgTypes = {
  disabled: {
    control: "boolean",
    description: "Specify whether the Button should be disabled, or not.",
  },
  href: {
    control: "text",
    description:
      "Optionally specify an href for your Button to become an `<a>` element.",
  },
  isExpressive: {
    control: "boolean",
    description: "Specify whether the Button is expressive, or not.",
  },
  linkRole: {
    control: "text",
    description: "Optional prop to specify the role of the Button.",
    if: { arg: "href" },
  },
  size: {
    control: "select",
    description: "Specify the size of the Button.",
    options: [BUTTON_SIZE.SMALL, BUTTON_SIZE.MEDIUM, BUTTON_SIZE.LARGE],
  },
  type: {
    control: "radio",
    description: "Specify the type of the Button.",
    options: [BUTTON_TYPE.BUTTON, BUTTON_TYPE.RESET, BUTTON_TYPE.SUBMIT],
  },
  onClick: { table: { disable: true } },
};

const sharedArgs = {
  disabled: false,
  isExpressive: false,
  size: BUTTON_SIZE.LARGE,
  onClick: fn(),
};

const baseButtonControls = {
  buttonText: {
    control: "text",
    description:
      "The button text. storybook only control, not a prop/attribute.",
    table: { category: "story controls" },
  },
  iconSlot: {
    control: "select",
    options: Object.keys(slots),
    mapping: slots,
    description: "Places the slotted icon inside the Button.",
    table: { category: "slot" },
  },
};

const baseButtonTemplate = (args) => html`
  <cds-aichat-button
    @click=${args.onClick}
    data-testid="storybook-interaction-testid"
    .button-class-name="${args.buttonClassName}"
    .dangerDescription="${args.dangerDescription}"
    ?disabled="${args.disabled}"
    .href="${args.href}"
    ?isExpressive="${args.isExpressive}"
    ?isSelected="${args.isSelected}"
    .kind="${args.kind}"
    .linkRole="${args.linkRole}"
    .size="${args.size}"
    .tooltipText=${args.tooltipText}
    .tooltipAlignment="${args.tooltipAlignment}"
    .tooltipPosition="${args.tooltipPosition}"
    .type="${args.type}"
    ?is-quick-action="${args.isQuickAction}"
  >
    ${args.buttonText} ${args.iconSlot?.()}
  </cds-aichat-button>
`;

export default {
  title: "Components/Chat button",
  play: async ({ canvas, userEvent, args }) => {
    const button = canvas.getByTestId("storybook-interaction-testid");
    const buttonTrigger = button.shadowRoot.querySelector(".cds--btn");
    if (args.href) {
      return;
    }
    await userEvent.click(buttonTrigger);
    if (!args.disabled) {
      expect(args.onClick).toHaveBeenCalled();
      expect(button).toHaveFocus();
    } else {
      expect(args.onClick).not.toHaveBeenCalled();
    }

    if (
      args.tooltipText &&
      args.iconSlot &&
      !args.buttonText &&
      !args.disabled
    ) {
      expect(button.shadowRoot.textContent.includes(args.tooltipText)).toBe(
        true,
      );
    }

    await userEvent.click(document.body);
    expect(button).not.toHaveFocus();
  },
};

export const Default = {
  name: "Primary (default)",
  argTypes: {
    ...sharedArgTypes,
    ...baseButtonControls,
    kind: {
      control: "select",
      description: "Specify the kind of Button.",
      options: [BUTTON_KIND.PRIMARY],
    },
  },
  args: {
    ...sharedArgs,
    kind: BUTTON_KIND.PRIMARY,
    buttonText: "Button",
    iconSlot: "None",
  },
  render: baseButtonTemplate,
};

export const Secondary = {
  argTypes: {
    ...sharedArgTypes,
    ...baseButtonControls,
    kind: {
      control: "select",
      description: "Specify the kind of Button.",
      options: [BUTTON_KIND.SECONDARY],
    },
  },
  args: {
    ...sharedArgs,
    kind: BUTTON_KIND.SECONDARY,
    buttonText: "Button",
    iconSlot: "None",
  },
  render: baseButtonTemplate,
};

export const Tertiary = {
  argTypes: {
    ...sharedArgTypes,
    ...baseButtonControls,
    kind: {
      control: "select",
      description: "Specify the kind of Button.",
      options: [BUTTON_KIND.TERTIARY],
    },
  },
  args: {
    ...sharedArgs,
    kind: BUTTON_KIND.TERTIARY,
    buttonText: "Button",
    iconSlot: "None",
  },
  render: baseButtonTemplate,
};

export const Danger = {
  argTypes: {
    ...sharedArgTypes,
    ...baseButtonControls,
    kind: {
      control: "select",
      description: "Specify the kind of Button.",
      options: [
        BUTTON_KIND.DANGER,
        BUTTON_KIND.DANGER_TERTIARY,
        BUTTON_KIND.DANGER_GHOST,
      ],
    },
    dangerDescription: {
      control: "text",
      description:
        "Specify the message read by screen readers for the danger button variant",
    },
  },
  args: {
    ...sharedArgs,
    kind: BUTTON_KIND.DANGER,
    dangerDescription: "danger",
    buttonText: "Button",
    iconSlot: "None",
  },
  render: baseButtonTemplate,
};

export const Ghost = {
  argTypes: {
    ...sharedArgTypes,
    ...baseButtonControls,
    kind: {
      control: "select",
      options: [BUTTON_KIND.GHOST],
      description: "Specify the kind of Button.",
    },
  },
  args: {
    ...sharedArgs,
    kind: BUTTON_KIND.GHOST,
    buttonText: "Button",
    iconSlot: "None",
  },
  render: baseButtonTemplate,
};

export const IconOnly = {
  argTypes: {
    ...sharedArgTypes,
    href: {
      control: "text",
      description:
        "Optionally specify an href for your Button to become an `<a>` element <br> Note: setting this overrides `tooltipText` which would fail the accessibility. need a fix from carbon.",
    },
    kind: {
      control: "select",
      options: [
        BUTTON_KIND.PRIMARY,
        BUTTON_KIND.SECONDARY,
        BUTTON_KIND.TERTIARY,
        BUTTON_KIND.GHOST,
      ],
      description: "Specify the kind of Button.",
    },
    tooltipText: {
      control: "text",
      description:
        "The tooltip text for icon only button (accessibility required).",
      if: { arg: "href", exists: false },
    },
    tooltipAlignment: {
      control: "radio",
      description:
        "Specify the alignment of the tooltip to the icon-only button. Can be one of: start, center, or end.",
      options: ["start", "center", "end"],
      mapping: {
        start: BUTTON_TOOLTIP_ALIGNMENT.START,
        center: BUTTON_TOOLTIP_ALIGNMENT.CENTER,
        end: BUTTON_TOOLTIP_ALIGNMENT.END,
      },
      if: { arg: "tooltipText" },
    },
    tooltipPosition: {
      control: "radio",
      description:
        "Specify the direction of the tooltip for icon-only buttons. Can be either top, right, bottom, or left.",
      options: [
        BUTTON_TOOLTIP_POSITION.TOP,
        BUTTON_TOOLTIP_POSITION.RIGHT,
        BUTTON_TOOLTIP_POSITION.BOTTOM,
        BUTTON_TOOLTIP_POSITION.LEFT,
      ],
      if: { arg: "tooltipText" },
    },
    isSelected: {
      control: "boolean",
      if: { arg: "kind", eq: BUTTON_KIND.GHOST },
    },
    iconSlot: {
      control: "select",
      options: Object.keys(slots).filter((key) => key !== "None"),
      mapping: slots,
      description: "Places the slotted icon inside the button",
      table: { category: "slot" },
    },
  },
  args: {
    ...sharedArgs,
    kind: BUTTON_KIND.PRIMARY,
    iconSlot: "Add16",
    tooltipText: "Tooltip text",
    tooltipAlignment: "center",
    tooltipPosition: BUTTON_TOOLTIP_POSITION.TOP,
  },
  render: baseButtonTemplate,
};

export const IconOnlyDanger = {
  name: "Icon Only (danger)",
  argTypes: {
    ...IconOnly.argTypes,
    kind: {
      control: "select",
      description: "Specify the kind of Button.",
      options: [
        BUTTON_KIND.DANGER,
        BUTTON_KIND.DANGER_TERTIARY,
        BUTTON_KIND.DANGER_GHOST,
      ],
    },
    href: {
      control: "text",
      description:
        "Optionally specify an href for your Button to become an `<a>` element <br> Note: setting this overrides `tooltipText`, `dangerDescription` which would fail the accessibility. need a fix from carbon.",
    },
    tooltipText: {
      control: "text",
      description:
        "The tooltip text for icon only button (accessibility required). <br> Note: setting this overrides `dangerDescription`",
      if: { arg: "href", exists: false },
    },
    dangerDescription: {
      control: "text",
      description:
        "Screen reader message for the danger variant when no tooltip text is present.",
      if: { arg: "tooltipText", eq: "" },
    },
  },
  args: {
    ...sharedArgs,
    kind: BUTTON_KIND.DANGER,
    iconSlot: "Add16",
    dangerDescription: "danger",
    tooltipText: "Tooltip text",
    tooltipAlignment: "center",
    tooltipPosition: BUTTON_TOOLTIP_POSITION.TOP,
  },
  render: baseButtonTemplate,
};

export const QuickAction = {
  argTypes: {
    ...sharedArgTypes,
    ...baseButtonControls,
    isQuickAction: {
      control: { disable: true },
      description:
        "Specify whether the Button is a quick action. Overrides `kind` to `ghost`. and `size` to `sm`",
    },
    size: {
      control: { disable: true },
      description:
        "Size defaults to `sm` in quick action variant, and does not support any other size.",
    },
    isSelected: {
      control: "boolean",
      description:
        "Specify whether the Button is currently selected. Only applies to Ghost variant or Quick Action button.",
    },
  },
  args: {
    ...sharedArgs,
    buttonText: "Quick action",
    isQuickAction: true,
    size: BUTTON_SIZE.SMALL,
    isSelected: false,
  },
  render: baseButtonTemplate,
};
