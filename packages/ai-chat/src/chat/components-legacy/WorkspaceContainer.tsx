/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Modal from "../components/carbon/Modal";
import React from "react";
// import { useSelector } from "../hooks/useSelector";
// import { AppState } from "../../types/state/AppState";

const WorkspaceContainerInner = (innerProps: any) => (
  // render the actual writeable element
  <>
    {JSON.stringify(innerProps, null, 2)}
    <p>look i am the captain now</p>
  </>
);

function WorkspaceContainer(props: any) {
  // set these from redux states
  const isSmallViewport = false;
  const isWorkspaceOpen = true;

  return (
    <React.Suspense fallback={null}>
      {isSmallViewport && isWorkspaceOpen ? (
        <Modal
          open={isWorkspaceOpen}
          onRequestClose={props.onRequestClose}
          size="lg"
          hasScrollingContent={true}
          modalHeading="Workspace"
          className="cds--ai-chat__workspace-modal"
        >
          <WorkspaceContainerInner {...props} />
        </Modal>
      ) : (
        <div className="cds--ai-chat__workspace-container">
          <WorkspaceContainerInner {...props} />
        </div>
      )}
    </React.Suspense>
  );
}

WorkspaceContainer.displayName = "WorkspaceContainer";

export default WorkspaceContainer;
