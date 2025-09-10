/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { Dropdown, Layer, OnChangeData } from "@carbon/react";
import cx from "classnames";
import { Environment, UseSelectStateChange } from "downshift";
import React, { useRef, useState } from "react";

import { HasServiceManager } from "../../../hocs/withServiceManager";
import { useCounter } from "../../../hooks/useCounter";
import HasLanguagePack from "../../../../../types/utilities/HasLanguagePack";
import { doScrollElementIntoView } from "../../../utils/domUtils";
import Metablock from "../util/Metablock";
import {
  MessageInput,
  SingleOption,
} from "../../../../../types/messaging/Messages";

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

/**
 * Downshift doesn't play well with shadow dom OOTB, so we need to feed it a custom environment.
 */
function createProxyEnvironment(shadowRoot: ShadowRoot) {
  const properties = {
    document: shadowRoot.ownerDocument,
    addEventListener:
      shadowRoot.ownerDocument.addEventListener.bind(shadowRoot),
    removeEventListener:
      shadowRoot.ownerDocument.removeEventListener.bind(shadowRoot),
    Node,
  };

  return new Proxy(shadowRoot, {
    get: (_, prop: keyof typeof properties) => properties[prop],
  }) as unknown as Environment;
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

  const environment = rootRef.current?.getRootNode
    ? createProxyEnvironment(rootRef.current.getRootNode() as ShadowRoot)
    : undefined;

  function findOptionForValue(): SingleOption {
    const { value, options } = props;
    const selectedItem = options.find((item) => {
      return item.value === value;
    });
    return selectedItem;
  }

  function onIsOpenChange(changes: UseSelectStateChange<SingleOption>) {
    /**
     * This is called when a state change occurs on the downshift component. We use this to take action when the dropdown
     * is opened.
     */
    if (changes.isOpen && rootRef.current) {
      // When the dropdown is opened, make sure it gets scrolled into view. To give a little extra padding to the
      // scrollable area, we'll temporarily add some bottom padding to the item, let the scroll calculations run and
      // then we'll remove it.
      setTimeout(() => {
        if (rootRef?.current) {
          setIsBeingOpened(true);
          doScrollElementIntoView(rootRef.current);
          setIsBeingOpened(false);
        }
      }, 70 * 2);
      // Carbon animates the menu opening, so we sadly need to provide a value here (fast01 token === 70) using the
      // value from @carbon/motion (which is not exported to JS).
    }
  }

  return (
    <div ref={rootRef}>
      <Metablock
        title={title}
        description={description}
        id={`WAC__selectUUID_${id}-label`}
        shouldRemoveHTMLBeforeMarkdownConversion={
          shouldRemoveHTMLBeforeMarkdownConversion
        }
      />
      <div
        className={cx("WAC__selectHolder", {
          WAC__customSelectTemporaryPadding: isBeingOpened,
        })}
      >
        <Layer>
          <Dropdown
            id={`WAC__selectUUID_${id}`}
            items={options}
            label={languagePack.options_select}
            titleText={languagePack.options_select}
            hideLabel
            aria-label={
              disableUserInputs
                ? languagePack.options_ariaOptionsDisabled
                : title
            }
            disabled={disableUserInputs}
            onChange={onChange}
            selectedItem={findOptionForValue()}
            downshiftProps={{
              environment,
              onIsOpenChange,
              id: `WACSelectComponent__Downshift-${id}`,
            }}
          />
        </Layer>
      </div>
    </div>
  );
}

export default SelectComponent;
