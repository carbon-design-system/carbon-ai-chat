/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { Dropdown, DropdownItem } from "../../../components/carbon/Dropdown";
import cx from "classnames";
import React, { useEffect, useRef, useState } from "react";

import { HasServiceManager } from "../../../hocs/withServiceManager";
import { useCounter } from "../../../hooks/useCounter";
import HasLanguagePack from "../../../../types/utilities/HasLanguagePack";
import { doScrollElementIntoView } from "../../../utils/domUtils";
import Metablock from "../util/Metablock";
import {
  MessageInput,
  SingleOption,
} from "../../../../types/messaging/Messages";

interface OnChangeData<ItemType> {
  selectedItem: ItemType | null;
}

type SelectionEvent = CustomEvent<{
  item: { value: string };
}>;

interface SelectProps extends HasLanguagePack, HasServiceManager {
  title: string;
  description: string;
  options: SingleOption[];
  value: { input: MessageInput };
  onChange: (data: OnChangeData<SingleOption>) => void;

  /**
   * Indicates if any user input controls should be shown but disabled. This value comes in as both a component prop and
   * state value where the inputs are hidden if either is true.
   */
  disableUserInputs: boolean;

  /**
   * Indicates if HTML should be removed from text before converting Markdown to HTML.
   * This is used to sanitize data coming from a human agent.
   */
  shouldRemoveHTMLBeforeMarkdownConversion?: boolean;
}

function SelectComponent(props: SelectProps) {
  const {
    title,
    description,
    options,
    onChange,
    languagePack,
    disableUserInputs,
    serviceManager,
    shouldRemoveHTMLBeforeMarkdownConversion,
  } = props;

  const [isBeingOpened, setIsBeingOpened] = useState(false);
  const rootRef = useRef<HTMLDivElement>();

  // Generate a unique ID that we can use for each instance of our dropdowns.
  const counter = useCounter();
  const id = `${counter}${serviceManager.namespace.suffix}`;

  const handleToggle = () => {
    setIsBeingOpened(true);

    requestAnimationFrame(() => {
      if (rootRef.current) {
        doScrollElementIntoView(rootRef.current, true);
      }
      setIsBeingOpened(false);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
    }
  };

  const handleBeingSelected = (e: SelectionEvent) => {
    const text = e.detail.item.value;

    onChange({
      selectedItem: {
        label: text,
        value: { input: { text } },
      },
    });
  };

  // Effect to add overrides on list box to make the dropdown take the proper height after expanding
  useEffect(() => {
    setTimeout(() => {
      const listBox = rootRef.current
        ?.querySelector("cds-dropdown")
        ?.shadowRoot?.querySelector(".cds--list-box--md") as HTMLElement | null;

      if (listBox) {
        listBox.style.blockSize = "unset";
        listBox.style.maxBlockSize = "unset";
      }
    });
  }, []);

  return (
    <div ref={rootRef}>
      <Metablock
        title={title}
        description={description}
        id={`cds-aichat--select-uuid-${id}-label`}
        shouldRemoveHTMLBeforeMarkdownConversion={
          shouldRemoveHTMLBeforeMarkdownConversion
        }
      />
      <div
        className={cx("cds-aichat--select-holder", {
          "cds-aichat--custom-select-temporary-padding": isBeingOpened,
        })}
      >
        <Dropdown
          id={`cds-aichat--select-uuid-${id}`}
          label={languagePack.options_select}
          title-text={languagePack.options_select}
          hideLabel
          aria-label={
            disableUserInputs ? languagePack.options_ariaOptionsDisabled : title
          }
          disabled={disableUserInputs}
          onToggled={handleToggle}
          onKeyDown={handleKeyDown}
          onBeingSelected={handleBeingSelected}
        >
          {options.map((option) => (
            <DropdownItem value={option.label} key={option.label}>
              {option.value.input.text}
            </DropdownItem>
          ))}
        </Dropdown>
      </div>
    </div>
  );
}

export default SelectComponent;
