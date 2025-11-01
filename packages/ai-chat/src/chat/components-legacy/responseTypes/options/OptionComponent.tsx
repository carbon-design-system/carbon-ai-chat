/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { Component, MouseEvent } from "react";
import ChatButton, {
  CHAT_BUTTON_KIND,
  CHAT_BUTTON_SIZE,
} from "../../../components/carbon/ChatButton";

import { HasServiceManager } from "../../../hocs/withServiceManager";
import HasLanguagePack from "../../../../types/utilities/HasLanguagePack";
import { LocalMessageItem } from "../../../../types/messaging/LocalMessageItem";
import {
  createMessageRequestForChoice,
  getOptionType,
} from "../../../utils/messageUtils";
import Metablock from "../util/Metablock";
import SelectComponent from "./SelectComponent";
import {
  Message,
  OptionItem,
  SingleOption,
} from "../../../../types/messaging/Messages";
import { MessageSendSource } from "../../../../types/events/eventBusTypes";

interface OnChangeData<ItemType> {
  selectedItem: ItemType | null;
}

interface OptionProps extends HasServiceManager, HasLanguagePack {
  /**
   * The message to display the options for.
   */
  localMessage: LocalMessageItem<OptionItem>;

  /**
   * The message to display the options for.
   */
  originalMessage: Message;

  /**
   * Indicates if any user input controls should be shown but disabled. This value comes in as both a component prop and
   * state value where the inputs are hidden if either is true.
   */
  disableUserInputs: boolean;

  /**
   * A callback function that will request that focus be moved to the main input field.
   */
  requestInputFocus: () => void;

  /**
   * Indicates if HTML should be removed from text before converting Markdown to HTML.
   * This is used to sanitize data coming from a human agent.
   */
  removeHTML?: boolean;
}

class OptionComponent extends Component<OptionProps> {
  /**
   * This function is called when the user has selected one of the available options.
   *
   * @param selectedOption The option that was selected.
   * @param type The specific type of the option response type ('button' vs 'dropdown').
   */
  onOptionSelected = (selectedOption: SingleOption, type: string) => {
    const { localMessage, serviceManager, originalMessage } = this.props;
    const { id: responseID } = originalMessage;
    const messageRequest = createMessageRequestForChoice(
      selectedOption,
      responseID,
    );
    const localMessageID = localMessage.ui_state.id;

    // Track when user gives a response through a button or dropdown option.
    const source =
      type === "button"
        ? MessageSendSource.OPTION_BUTTON
        : MessageSendSource.OPTION_DROP_DOWN;
    serviceManager.actions.sendWithCatch(messageRequest, source, {
      setValueSelectedForMessageID: localMessageID,
    });

    // Move focus back to the input field
    this.props.requestInputFocus();
  };

  /**
   * This is called when the option displays a list of buttons and one of the buttons is clicked.
   * It also sets the responseType to 'button'.
   */
  onButtonClick = (event: any, item: SingleOption) => {
    this.onOptionSelected(item, "button");
  };

  /**
   * This is called when the option displays a dropdown component of options and one options is clicked.
   * It also sets the responseType to 'dropdown'.
   */
  onSelectChange = (data: OnChangeData<SingleOption>) => {
    this.onOptionSelected(data.selectedItem, "dropdown");
  };

  render() {
    const {
      localMessage,
      languagePack,
      disableUserInputs,
      serviceManager,
      removeHTML,
    } = this.props;
    const { options, title, description, preference } = localMessage.item;
    const { optionSelected } = localMessage.ui_state;
    const type = getOptionType(preference, options.length);

    return type === "button" ? (
      <>
        <Metablock
          title={title}
          description={description}
          removeHTML={removeHTML}
        />
        <div className="cds-aichat--button-holder">
          <ul>
            {options.map((item) => {
              const isSelected = optionSelected
                ? item.value.input.text === optionSelected.input.text
                : false;
              return (
                <li key={item.label}>
                  <ChatButton
                    kind={CHAT_BUTTON_KIND.TERTIARY}
                    isQuickAction
                    size={CHAT_BUTTON_SIZE.SMALL}
                    disabled={disableUserInputs}
                    isSelected={isSelected}
                    onClick={(event: MouseEvent) => {
                      this.onButtonClick(event, item);
                    }}
                  >
                    {item.label}
                  </ChatButton>
                </li>
              );
            })}
          </ul>
        </div>
      </>
    ) : (
      <SelectComponent
        serviceManager={serviceManager}
        languagePack={languagePack}
        title={title}
        description={description}
        options={options}
        disableUserInputs={disableUserInputs}
        onChange={this.onSelectChange}
        value={optionSelected}
        removeHTML={removeHTML}
      />
    );
  }
}

export { OptionComponent };
