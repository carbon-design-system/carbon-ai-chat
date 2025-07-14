/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { Button } from "@carbon/react";
import FocusTrap from "focus-trap-react";
import React, { Component, KeyboardEvent } from "react";

import { ModalPortal } from "../../containers/ModalPortal";
import { HasServiceManager } from "../../hocs/withServiceManager";
import { AriaLiveMessage } from "../aria/AriaLiveMessage";

/**
 * This component is a panel that is display in the messages list when the user clicks the "end chat" button that is
 * intended to confirm the action before actually ending the chat.
 */

interface ConfirmModalButtonProps {
  /**
   * The callback that is called when the user responds to the confirmation panel by selecting "Yes"
   */
  onConfirm: () => void;

  /**
   * The callback that is called when the user responds to the confirmation panel by selecting "No"
   */
  onCancel: () => void;
}

interface ConfirmModalProps extends HasServiceManager, ConfirmModalButtonProps {
  /**
   * The title for the modal.
   */
  title: string;

  /**
   * The message to display in the confirmation modal to explain to the user the purpose of this confirmation.
   */
  message: string;

  /**
   * Label for the cancel button.
   */
  cancelButtonLabel: string;

  /**
   * Label for the confirm button.
   */
  confirmButtonLabel: string;

  /**
   * Message to announce the modal appearance when using a screen reader.
   */
  modalAnnounceMessage: string;
}

class ConfirmModal extends Component<ConfirmModalProps> {
  /**
   * The callback that is called when the user clicks the yes button confirming that they do want to end the chat.
   */
  private onYesClick = () => {
    // End the chat and close the panel.
    this.props.onConfirm();
  };

  /**
   * The callback that is called when the user clicks the no button indicating they want to continue the chat.
   */
  private onNoClick = () => {
    // Just close the panel.
    this.props.onCancel();
  };

  /**
   * A keyboard listener added to both buttons that will close the panel if the user presses escape.
   */
  private onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      this.props.onCancel();
    }
  };

  render() {
    const {
      title,
      message,
      cancelButtonLabel,
      confirmButtonLabel,
      modalAnnounceMessage,
      serviceManager,
    } = this.props;

    return (
      <ModalPortal>
        <FocusTrap>
          <div
            className="WACConfirmModal"
            role="dialog"
            aria-labelledby="WACConfirmModal__title"
            aria-describedby="WACConfirmModal__message"
          >
            <div className="WACConfirmModal__container">
              <AriaLiveMessage message={modalAnnounceMessage} />
              <div
                className="WACConfirmModal__title"
                id={`WACConfirmModal__title${serviceManager.namespace.suffix}`}
              >
                {title}
              </div>
              <div
                className="WACConfirmModal__message"
                id={`WACConfirmModal__message${serviceManager.namespace.suffix}`}
              >
                {message}
              </div>
              <div className="WACConfirmModal__buttonContainer">
                <Button
                  className="WACConfirmModal__NoButton"
                  kind="secondary"
                  onClick={this.onNoClick}
                  onKeyDown={this.onKeyDown}
                  size="md"
                >
                  {cancelButtonLabel}
                </Button>
                <Button
                  className="WACConfirmModal__YesButton"
                  onClick={this.onYesClick}
                  onKeyDown={this.onKeyDown}
                  size="md"
                >
                  {confirmButtonLabel}
                </Button>
              </div>
            </div>
          </div>
        </FocusTrap>
      </ModalPortal>
    );
  }
}

export { ConfirmModal, ConfirmModalButtonProps };
