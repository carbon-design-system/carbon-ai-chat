import React from "react";
import { action } from "storybook/actions";
import ChatButton from "../../../react/chat-button";
import {
  BUTTON_KIND,
  BUTTON_SIZE,
  BUTTON_TOOLTIP_ALIGNMENT,
  BUTTON_TYPE,
  BUTTON_TOOLTIP_POSITION,
} from "@carbon/web-components/es/components/button/button.js";
import { Add, Link } from "@carbon/icons-react";

const slots = {
  Add: (args) => <Add {...args} />,
  Link: (args) => <Link {...args} />,
  None: undefined,
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
  iconSlot: "None",
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

const BaseButtonTemplate = (args) => {
  const { buttonText, iconSlot: IconSlot, ...rest } = args;

  return (
    <ChatButton
      data-testid="storybook-interaction-testid"
      is-quick-action={rest.isQuickAction}
      onClick={action("onClick")}
      {...rest}
    >
      {buttonText}
      {IconSlot && <IconSlot slot="icon" />}
    </ChatButton>
  );
};

export default {
  title: "Components/Chat button",
  component: ChatButton,
};

export const Default = {
  name: "Primary (default)",
  render: BaseButtonTemplate,
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
};

export const Secondary = {
  render: BaseButtonTemplate,
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
};

export const Tertiary = {
  render: BaseButtonTemplate,
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
};

export const Danger = {
  render: BaseButtonTemplate,
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
};

export const Ghost = {
  render: BaseButtonTemplate,
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
};

export const IconOnly = {
  render: BaseButtonTemplate,
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
    iconSlot: "Add",
    tooltipText: "Tooltip text",
    tooltipAlignment: "center",
    tooltipPosition: BUTTON_TOOLTIP_POSITION.TOP,
  },
};

export const IconOnlyDanger = {
  name: "Icon Only (danger)",
  render: BaseButtonTemplate,
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
    iconSlot: "Add",
    dangerDescription: "danger",
    tooltipText: "Tooltip text",
    tooltipAlignment: "center",
    tooltipPosition: BUTTON_TOOLTIP_POSITION.TOP,
  },
};

export const QuickAction = {
  render: BaseButtonTemplate,
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
    isSelected: false,
  },
};
