/* eslint-disable */
/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { Card, CardFooter } from "@carbon/ai-chat-components/es/react/card.js";
import Button, {
  BUTTON_KIND,
} from "@carbon/ai-chat-components/es/react/button.js";
import AILabel from "@carbon/ai-chat-components/es/react/ai-label";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import View16 from "@carbon/icons/es/view/16.js";
import cx from "classnames";
import React, { useState } from "react";

// import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { useServiceManager } from "../../../hooks/useServiceManager";
import { BusEventType } from "../../../../types/events/eventBusTypes";
import { LocalMessageItem } from "../../../../types/messaging/LocalMessageItem";
import {
  PreviewCardItem,
  MessageResponse,
} from "../../../../types/messaging/Messages";

interface PreviewCardComponentProps {
  localMessageItem: LocalMessageItem;
  fullMessage: MessageResponse;
}

/**
 * This component renders the preview card response type. which triggers the workflow.
 */
function PreviewCardComponent(props: PreviewCardComponentProps) {
  const item = props.localMessageItem.item as PreviewCardItem;
  const serviceManager = useServiceManager();
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const handleClick = () => {
    if (!isWorkspaceOpen) {
      serviceManager.eventBus.fire(
        {
          type: BusEventType.WORKSPACE_PRE_OPEN,
          data: {
            message: props.localMessageItem,
            fullMessage: props.fullMessage,
            slot: "workspace",
          },
          additional_data: item.additional_data,
        },
        serviceManager.instance,
      );
      setIsWorkspaceOpen(true);
      serviceManager.eventBus.fire(
        {
          type: BusEventType.WORKSPACE_OPEN,
          data: {
            message: props.localMessageItem,
            fullMessage: props.fullMessage,
            slot: "workspace",
          },
          additional_data: item.additional_data,
        },
        serviceManager.instance,
      );
    }
  };

  return (
    <Card
      data-rounded
      class="cds-aichat-preview-card cds-aichat-preview-card__sm"
    >
      <div slot="body">
        <h5 className="cds-aichat-preview-card--title">{item.title}</h5>
        <p className="cds-aichat-preview-card--subtitle">{item.subtitle}</p>
      </div>
      <CardFooter
        actions={[
          {
            icon: isWorkspaceOpen ? View16 : Maximize16,
            id: "docs",
            kind: "ghost",
            label: "View details",
            payload: {
              test: "value",
            },
            isViewing: isWorkspaceOpen,
          },
        ]}
        onFooterAction={handleClick}
        size="md"
      />
    </Card>
  );
}

const PreviewCardComponentExport = React.memo(PreviewCardComponent);

export { PreviewCardComponentExport as PreviewCardComponent };
