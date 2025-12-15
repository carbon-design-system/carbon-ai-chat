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
import { useSelector } from "../hooks/useSelector";
import { AppState } from "../../types/state/AppState";
import React, { useEffect, useState } from "react";
import cx from "classnames";

const WorkspaceContainerInner = ({ onClose, ...innerProps }: any) => (
  <div className="cds-aichat--workspace-container-inner">
    {/* render the actual writeable element */}
    {/* <WriteableElement
      slotName={WriteableElementName.WORKSPACE_COMPONENT}
      id={`workspaceComponent${serviceManager.namespace.suffix}`}
    /> */}
    {JSON.stringify(innerProps, null, 2)}
    <p>Look at me, I am the captain now!</p>
    <Button onClick={onClose}>close</Button>
  </div>
);

function WorkspaceContainer(props: any) {
  const chatWidth = useSelector((state: AppState) => state.chatWidth);

  // set these from redux app state, also have the app layout into account. float, fullscreen, etc.
  const [isModal, setIsModal] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const state = useSelector((state: AppState) => state);
  console.log(state);

  useEffect(() => {
    if (chatWidth === 0) {
      return;
    }
    setIsModal(chatWidth <= 1024);
  }, [chatWidth]);

  const handleClose = () => {
    setIsWorkspaceOpen(false);
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
