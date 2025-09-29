/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This component is used to render a user defined message response. When a user defined response is initially
 * received a host element was created and a {@link BusEventType.USER_DEFINED_RESPONSE} was fired. Any custom code was
 * then able to attach any custom rendering to the provided host element. The host elements are stored in the
 * service manager. This component attaches that host element in to the React tree.
 */

import React from "react";

import { HasServiceManager } from "../../../hocs/withServiceManager";
import { useCallbackOnChange } from "../../../hooks/useCallbackOnChange";
import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { HasDoAutoScroll } from "../../../../types/utilities/HasDoAutoScroll";
import { LocalMessageItemStreamingState } from "../../../../types/messaging/LocalMessageItem";
import InlineError from "../error/InlineError";
import { UserDefinedItem } from "../../../../types/messaging/Messages";

interface UserDefinedResponseProps extends HasServiceManager, HasDoAutoScroll {
  /**
   * The id of the message that is to be rendered by this component.
   */
  localMessageID: string;

  /**
   * The current state of streaming of the text.
   */
  streamingState: LocalMessageItemStreamingState<UserDefinedItem>;

  /**
   * Indicates if this should display an error message.
   */
  isStreamingError?: boolean;
}

function UserDefinedResponse(props: UserDefinedResponseProps) {
  const { doAutoScroll, isStreamingError, streamingState, serviceManager } =
    props;

  const languagePack = useLanguagePack();

  // The element that was previously created that we'll attach to this React component. The custom code should
  // already have attached its own element to this element that contains the custom rendering for the message.
  const userDefinedRegistryItem =
    serviceManager.actions.getOrCreateUserDefinedElement(props.localMessageID);

  useCallbackOnChange(streamingState?.chunks, doAutoScroll);

  return (
    <div
      className="cds-aichat--message-user-defined-response"
      data-floating-menu-container
    >
      <slot name={userDefinedRegistryItem.slotName} />
      {isStreamingError && (
        <InlineError
          text={languagePack.conversationalSearch_streamingIncomplete}
        />
      )}
    </div>
  );
}

export default React.memo(UserDefinedResponse);
