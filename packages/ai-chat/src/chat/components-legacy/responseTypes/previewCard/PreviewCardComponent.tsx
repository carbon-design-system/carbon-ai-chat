/* eslint-disable */
/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import TileContainer from "@carbon/ai-chat-components/es/react/tile-container.js";
import Tile from "@carbon/ai-chat-components/es/react/tile.js";
import Button, {
  BUTTON_KIND,
} from "@carbon/ai-chat-components/es/react/button.js";
import AILabel from "@carbon/ai-chat-components/es/react/ai-label";
import { Maximize, View } from "@carbon/icons-react";
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
          additional_data: item.additional_data,
        },
        serviceManager.instance,
      );
      setIsWorkspaceOpen(true);
      serviceManager.eventBus.fire(
        {
          type: BusEventType.WORKSPACE_OPEN,
          additional_data: item.additional_data,
        },
        serviceManager.instance,
      );
    }
  };

  return (
    <Tile data-rounded class="cds-aichat-preview-card-sm">
      <h5 className="body-compact-02 margin-bottom-01">{item.title}</h5>
      <p className="helper-text-01 text-secondary">{item.subtitle}</p>
      <div
        className="cds-aichat--tile-container-footer margin-top-05"
        data-flush="bottom"
        data-rounded="bottom"
      >
        {!isExpired && (
          <Button
            kind={BUTTON_KIND.GHOST}
            size="md"
            disabled={isWorkspaceOpen}
            onClick={handleClick}
            className="text-primary"
          >
            {isWorkspaceOpen ? (
              <>
                <View /> Viewing
              </>
            ) : (
              <>
                View details{" "}
                <Maximize
                  // @ts-ignore
                  slot="icon"
                />
              </>
            )}
          </Button>
        )}
      </div>
    </Tile>
  );
}

const PreviewCardComponentExport = React.memo(PreviewCardComponent);

export { PreviewCardComponentExport as PreviewCardComponent };
