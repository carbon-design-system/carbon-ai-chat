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
import React, { useEffect, useState } from "react";
import cx from "classnames";

const WorkspaceContainerInner = ({ onClose, ...innerProps }: any) => (
  <div className="cds-aichat--workspace-container-inner">
    {/* render the actual writeable element */}
    {JSON.stringify(innerProps, null, 2)}
    <p>Look at me, I am the captain now!</p>
    <Button onClick={onClose}>close</Button>
  </div>
);

function WorkspaceContainer(props: any) {
  // set these from redux app state
  const [isSmallViewport, setIsSmallViewport] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);

  const handleClose = () => {
    setIsWorkspaceOpen(false);
  };

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setIsSmallViewport(width < 1024);
      }
    });

    resizeObserver.observe(document.body);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      className={cx("cds-aichat--workspace-container", {
        "cds-aichat--workspace-container__open": isWorkspaceOpen,
      })}
    >
      <React.Suspense fallback={null}>
        {isSmallViewport ? (
          <Modal
            open={isWorkspaceOpen}
            hasScrollingContent={true}
            prevent-close-on-click-outside
            className={cx("cds-aichat--workspace-modal")}
            onClose={handleClose}
          >
            <WorkspaceContainerInner {...props} onClose={handleClose} />
          </Modal>
        ) : (
          isWorkspaceOpen && (
            <WorkspaceContainerInner {...props} onClose={handleClose} />
          )
        )}
      </React.Suspense>
    </div>
  );
}

WorkspaceContainer.displayName = "WorkspaceContainer";

export default React.memo(WorkspaceContainer);
