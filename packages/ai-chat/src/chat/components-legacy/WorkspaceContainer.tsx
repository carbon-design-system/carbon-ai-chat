/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Modal from "../components/carbon/Modal";
import Button from "../components/carbon/Button";
import { BUTTON_KIND } from "../components/carbon/Button";
import { useSelector } from "../hooks/useSelector";
import { AppState } from "../../types/state/AppState";
import { WriteableElementName } from "../utils/constants";
import { PanelType } from "../../types/instance/apiTypes";
import WriteableElement from "./WriteableElement";
import React, { useEffect, useState } from "react";
import cx from "classnames";

const WorkspaceContainerInner = ({ onClose, ...innerProps }: any) => {
  const serviceManager = innerProps.serviceManager;
  return (
    <div className="cds-aichat--workspace-container-inner">
      <WriteableElement
        slotName={WriteableElementName.WORKSPACE_PANEL_ELEMENT}
        className="cds-aichat--workspace-writeable-element"
        id={`workspacePanelElement${serviceManager.namespace.suffix}`}
      />
      <div>
        <Button kind={BUTTON_KIND.DANGER} onClick={onClose}>
          close
        </Button>
      </div>
    </div>
  );
};

function WorkspaceContainer(props: any) {
  const chatWidth = useSelector((state: AppState) => state.chatWidth);

  // set these from redux app state, also have the app layout into account. float, fullscreen, etc.
  const [isModal, setIsModal] = useState(false);
  const isWorkspaceOpen = useSelector(
    (state: AppState) => state.workspacePanelState.isOpen,
  );
  const panel = props.serviceManager.instance.customPanels.getPanel(
    PanelType.WORKSPACE,
  );

  useEffect(() => {
    if (chatWidth === 0) {
      return;
    }
    setIsModal(chatWidth <= 1024);
  }, [chatWidth]);

  const handleClose = () => {
    panel.close();
  };

  return (
    <React.Suspense fallback={null}>
      {isModal ? (
        <div className={cx("cds-aichat--workspace-container-modal")}>
          <Modal
            open={isWorkspaceOpen}
            hasScrollingContent={true}
            prevent-close-on-click-outside
            className={cx("cds-aichat--workspace-modal")}
            onClose={handleClose}
          >
            <WorkspaceContainerInner {...props} onClose={handleClose} />
          </Modal>
        </div>
      ) : (
        isWorkspaceOpen && (
          <div
            className={cx("cds-aichat--workspace-container-panel", {
              "cds-aichat--workspace-container-panel__open": isWorkspaceOpen,
            })}
          >
            <WorkspaceContainerInner {...props} onClose={handleClose} />
          </div>
        )
      )}
    </React.Suspense>
  );
}

WorkspaceContainer.displayName = "WorkspaceContainer";

export default React.memo(WorkspaceContainer);
