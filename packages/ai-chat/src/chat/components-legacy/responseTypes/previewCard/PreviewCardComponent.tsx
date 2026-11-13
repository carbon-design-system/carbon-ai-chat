/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useCallback, useMemo } from 'react';
import { Card, CardFooter } from '@carbon/ai-chat-components/es/react/card.js';
import Maximize16 from '@carbon/icons/es/maximize/16.js';
import View16 from '@carbon/icons/es/view/16.js';

import { useServiceManager } from '../../../hooks/useServiceManager';
import { PanelType } from '../../../../types/instance/apiTypes';
import { LocalMessageItem } from '../../../../types/messaging/LocalMessageItem';
import { AppState } from '../../../../types/state/AppState';
import { useSelector } from '../../../hooks/useSelector';
import { shallowEqual } from '../../../store/appStore';
import {
  PreviewCardItem,
  MessageResponse,
} from '../../../../types/messaging/Messages';
import actions from '../../../store/actions';
import { closeWorkspaceForNext } from '../../../services/CustomPanelInstance';

interface PreviewCardComponentProps {
  localMessageItem: LocalMessageItem;
  fullMessage: MessageResponse;
}

/**
 * This component renders the preview card response type. which triggers the workflow.
 */
function PreviewCardComponent(props: PreviewCardComponentProps) {
  const { localMessageItem, fullMessage } = props;
  const item = localMessageItem.item as PreviewCardItem;
  const { title, subtitle, workspace_id, workspace_options, additional_data } =
    item;

  const serviceManager = useServiceManager();
  const { isOpen, workspaceID, viewDetailsLabel, viewingLabel } = useSelector(
    (state: AppState) => ({
      isOpen: state.workspacePanelState.isOpen,
      workspaceID: state.workspacePanelState.workspaceID,
      viewDetailsLabel: state.languagePack.previewCard_viewDetails,
      viewingLabel: state.languagePack.previewCard_viewing,
    }),
    shallowEqual
  );
  const panel = serviceManager.instance.customPanels.getPanel(
    PanelType.WORKSPACE
  );

  const isViewing = isOpen && workspaceID === workspace_id;

  const handleClick = useCallback(async () => {
    // Close the open workspace before storing this card's data, so its close events carry its own data.
    if (serviceManager.store.getState().workspacePanelState.isOpen) {
      await closeWorkspaceForNext(() => panel.close(), serviceManager);
    }

    // Store workspace panel data in Redux before opening
    serviceManager.store.dispatch(
      actions.setWorkspacePanelData({
        workspaceID: workspace_id,
        localMessageItem,
        fullMessage,
        additionalData: additional_data,
      })
    );

    // Open the panel - it will fire WORKSPACE_PRE_OPEN and WORKSPACE_OPEN events
    panel.open({
      ...workspace_options,
      workspaceId: workspace_id,
      additionalData: additional_data,
    });
  }, [
    workspace_id,
    workspace_options,
    additional_data,
    localMessageItem,
    fullMessage,
    serviceManager,
    panel,
  ]);

  const footerActions = useMemo(
    () => [
      {
        icon: isViewing ? View16 : Maximize16,
        id: 'docs',
        kind: 'ghost',
        label: isViewing ? viewingLabel : viewDetailsLabel,
        payload: { test: 'value' },
        isViewing,
      },
    ],
    [isViewing, viewingLabel, viewDetailsLabel]
  );

  return (
    <Card
      data-rounded
      isFlush
      className="cds-aichat-preview-card cds-aichat-preview-card__sm">
      <div slot="body">
        <h5 className="cds-aichat-preview-card--title">{title}</h5>
        <p className="cds-aichat-preview-card--subtitle">{subtitle}</p>
      </div>
      <CardFooter
        actions={footerActions}
        onFooterAction={handleClick}
        size="md"
      />
    </Card>
  );
}

const PreviewCardComponentExport = React.memo(PreviewCardComponent);

export { PreviewCardComponentExport as PreviewCardComponent };
