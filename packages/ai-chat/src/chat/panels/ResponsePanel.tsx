/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import BodyAndFooterPanelComponent from "../components-legacy/panels/BodyAndFooterPanelComponent";
import { MessageTypeComponent } from "../components-legacy/MessageTypeComponent";
import { PageObjectId } from "../../testing/PageObjectId";
import type { ButtonItem } from "../../types/messaging/Messages";
import type { MessagePanelState } from "../../types/state/AppState";
import type { HasRequestFocus } from "../../types/utilities/HasRequestFocus";

type ResponseLocalMessageItem =
  | MessagePanelState["localMessageItem"]
  | null
  | undefined;

interface ResponsePanelProps {
  responsePanelRef: React.RefObject<HasRequestFocus | null>;
  isOpen: boolean;
  isMessageForInput: boolean;
  localMessageItem: ResponseLocalMessageItem;
  requestFocus: () => void;
  onClose: () => void;
  onClickRestart: () => void;
  onClickBack: () => void;
  onPanelOpenStart: () => void;
  onPanelOpenEnd: () => void;
  onPanelCloseStart: () => void;
  onPanelCloseEnd: () => void;
}

const ResponsePanel: React.FC<ResponsePanelProps> = ({
  responsePanelRef,
  isOpen,
  isMessageForInput,
  localMessageItem,
  requestFocus,
  onClose,
  onClickRestart,
  onClickBack,
  onPanelOpenStart,
  onPanelOpenEnd,
  onPanelCloseStart,
  onPanelCloseEnd,
}) => {
  const panelOptions = (localMessageItem?.item as ButtonItem | undefined)
    ?.panel;
  const eventName = `"Show panel" opened`;
  const eventDescription = "Panel opened through panel response type";

  return (
    <BodyAndFooterPanelComponent
      ref={responsePanelRef}
      eventName={eventName}
      eventDescription={eventDescription}
      overlayPanelName={PageObjectId.BUTTON_RESPONSE_PANEL}
      isOpen={isOpen}
      isMessageForInput={isMessageForInput}
      localMessageItem={localMessageItem}
      title={panelOptions?.title}
      showAnimations={panelOptions?.show_animations}
      showAiLabel={false}
      showRestartButton={false}
      requestFocus={requestFocus}
      onClose={onClose}
      onClickRestart={onClickRestart}
      onClickBack={onClickBack}
      onPanelOpenStart={onPanelOpenStart}
      onPanelOpenEnd={onPanelOpenEnd}
      onPanelCloseStart={onPanelCloseStart}
      onPanelCloseEnd={onPanelCloseEnd}
      renderMessageComponent={(childProps) => (
        <MessageTypeComponent {...childProps} />
      )}
    />
  );
};

export default ResponsePanel;
