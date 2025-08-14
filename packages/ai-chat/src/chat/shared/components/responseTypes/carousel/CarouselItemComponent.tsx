/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { Suspense } from "react";
import { useSelector } from "react-redux";

import { AppState } from "../../../../../types/state/AppState";
import { HasRequestFocus } from "../../../../../types/utilities/HasRequestFocus";
import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";

import { SkeletonPlaceholder } from "../../SkeletonPicker";
import { CardItemComponent } from "../card/CardItemComponent";
import {
  CarouselItem,
  MessageResponse,
} from "../../../../../types/messaging/Messages";
import Carousel from "./Carousel";

interface CarouselItemComponentProps extends HasRequestFocus {
  localMessageItem: LocalMessageItem<CarouselItem>;
  fullMessage: MessageResponse;

  /**
   * Indicates if this message is part the most recent message response that allows for input.
   */
  isMessageForInput: boolean;

  /**
   * Function to render message components
   */
  renderMessageComponent: (props: any) => React.ReactNode;
}

function CarouselItemComponent(props: CarouselItemComponentProps) {
  const {
    localMessageItem,
    fullMessage,
    isMessageForInput,
    requestFocus,
    renderMessageComponent,
  } = props;
  const allMessageItemsByID = useSelector(
    (state: AppState) => state.allMessageItemsByID,
  );
  const { itemsLocalMessageItemIDs } = localMessageItem.ui_state;

  return (
    <Suspense fallback={<SkeletonPlaceholder />}>
      <Carousel>
        {itemsLocalMessageItemIDs.map((nestedLocalMessageItemID) => {
          const localMessageItem =
            allMessageItemsByID[nestedLocalMessageItemID];
          return (
            <CardItemComponent
              key={nestedLocalMessageItemID}
              localMessageItem={localMessageItem}
              fullMessage={fullMessage}
              isMessageForInput={isMessageForInput}
              ignoreMaxWidth
              requestFocus={requestFocus}
              renderMessageComponent={renderMessageComponent}
            />
          );
        })}
      </Carousel>
    </Suspense>
  );
}

export { CarouselItemComponent };
