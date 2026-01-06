/* eslint-disable */
/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import { Card, CardFooter } from "@carbon/ai-chat-components/es/react/card.js";
import Maximize16 from "@carbon/icons/es/maximize/16.js";
import View16 from "@carbon/icons/es/view/16.js";

// import { HasRequestFocus } from "../../../../types/utilities/HasRequestFocus";
import { useServiceManager } from "../../../hooks/useServiceManager";
import { BusEventType } from "../../../../types/events/eventBusTypes";
import { PanelType } from "../../../../types/instance/apiTypes";
import { LocalMessageItem } from "../../../../types/messaging/LocalMessageItem";
import { AppState } from "../../../../types/state/AppState";
import { useSelector } from "../../../hooks/useSelector";
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
  const isWorkspaceOpen = useSelector(
    (state: AppState) => state.workspacePanelState.isOpen,
  );
  const panel = serviceManager.instance.customPanels.getPanel(
    PanelType.WORKSPACE,
  );

  const handleClick = () => {
    const state = serviceManager.instance.getState();
    const options = state.customPanels.workspace.options;
    if (!isWorkspaceOpen) {
      serviceManager.eventBus.fire(
        {
          type: BusEventType.WORKSPACE_PRE_OPEN,
          data: {
            message: props.localMessageItem,
            fullMessage: props.fullMessage,
          },
          additional_data: item.additional_data,
        },
        serviceManager.instance,
      );
      panel.open({
        preferredLocation: options.preferredLocation,
        disableAnimation: options.disableAnimation,
      });
      serviceManager.eventBus.fire(
        {
          type: BusEventType.WORKSPACE_OPEN,
          data: {
            message: props.localMessageItem,
            fullMessage: props.fullMessage,
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
            label: isWorkspaceOpen ? "Viewing" : "View details",
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
