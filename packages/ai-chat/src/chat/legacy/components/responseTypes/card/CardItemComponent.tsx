/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import TileContainer from "@carbon/ai-chat-components/es/react/tile-container.js";
import Tile from "../../../../components/carbon/Tile";
import cx from "classnames";
import React from "react";
import { useSelector } from "react-redux";
import { selectInputState } from "../../../../store/selectors";
import { AppState } from "../../../../../types/state/AppState";
import { THROW_ERROR } from "../../../../utils/constants";
import { useServiceManager } from "../../../../hooks/useServiceManager";

import { HasRequestFocus } from "../../../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";
import { BodyMessageComponents } from "../util/BodyMessageComponents";
import { FooterButtonComponents } from "../util/FooterButtonComponents";
import { useLanguagePack } from "../../../../hooks/useLanguagePack";
import {
  CardItem,
  MessageResponse,
  WidthOptions,
} from "../../../../../types/messaging/Messages";

interface CardItemComponentProps extends HasRequestFocus {
  localMessageItem: LocalMessageItem;
  fullMessage: MessageResponse;

  /**
   * If max width should be ignored.
   */
  ignoreMaxWidth?: boolean;

  /**
   * Indicates if this message is part the most recent message response that allows for input.
   */
  isMessageForInput: boolean;

  /**
   * Function to render message components
   */
  renderMessageComponent: (props: any) => React.ReactNode;
}

/**
 * This component renders the card response type. A card can be used to author a custom card containing existing
 * response types.
 */
function CardItemComponent(props: CardItemComponentProps) {
  const { ignoreMaxWidth } = props;
  const languagePack = useLanguagePack();
  const inputState = useSelector(selectInputState);
  const appConfig = useSelector((state: AppState) => state.config);
  const serviceManager = useServiceManager();
  const item = props.localMessageItem.item as CardItem;
  return (
    <TileContainer>
      <Tile
        className={cx("cds-aichat--card-message-component", {
          "cds-aichat--max-width-small":
            !ignoreMaxWidth && item.max_width === WidthOptions.SMALL,
          "cds-aichat--max-width-medium":
            !ignoreMaxWidth && item.max_width === WidthOptions.MEDIUM,
          "cds-aichat--max-width-large":
            !ignoreMaxWidth && item.max_width === WidthOptions.LARGE,
        })}
      >
        <BodyMessageComponents
          message={props.localMessageItem}
          originalMessage={props.fullMessage}
          languagePack={languagePack}
          requestInputFocus={props.requestFocus}
          disableUserInputs={inputState.isReadonly}
          config={appConfig}
          isMessageForInput={props.isMessageForInput}
          scrollElementIntoView={THROW_ERROR}
          serviceManager={serviceManager}
          hideFeedback
          showChainOfThought={false}
          allowNewFeedback={false}
          renderMessageComponent={props.renderMessageComponent}
        />
      </Tile>
      <FooterButtonComponents
        message={props.localMessageItem}
        originalMessage={props.fullMessage}
        languagePack={languagePack}
        requestInputFocus={props.requestFocus}
        disableUserInputs={inputState.isReadonly}
        config={appConfig}
        isMessageForInput={props.isMessageForInput}
        scrollElementIntoView={THROW_ERROR}
        serviceManager={serviceManager}
        hideFeedback
        showChainOfThought={false}
        allowNewFeedback={false}
        renderMessageComponent={props.renderMessageComponent}
      />
    </TileContainer>
  );
}

const CardComponentExport = React.memo(CardItemComponent);

export { CardComponentExport as CardItemComponent };
