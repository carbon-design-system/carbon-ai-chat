/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Tile from "../../../../react/carbon/Tile";
import cx from "classnames";
import React from "react";

import { HasRequestFocus } from "../../../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";
import { BodyWithFooterComponent } from "../../BodyWithFooterComponent";
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
  const item = props.localMessageItem.item as CardItem;
  return (
    <Tile
      className={cx("WACCardMessageComponent", {
        WACMaxWidthSmall:
          !ignoreMaxWidth && item.max_width === WidthOptions.SMALL,
        WACMaxWidthMedium:
          !ignoreMaxWidth && item.max_width === WidthOptions.MEDIUM,
        WACMaxWidthLarge:
          !ignoreMaxWidth && item.max_width === WidthOptions.LARGE,
      })}
    >
      <BodyWithFooterComponent
        {...props}
        renderMessageComponent={props.renderMessageComponent}
      />
    </Tile>
  );
}

const CardComponentExport = React.memo(CardItemComponent);

export { CardComponentExport as CardItemComponent };
