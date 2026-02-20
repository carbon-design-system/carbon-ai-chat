/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { IFrameComponent } from "../../components-legacy/responseTypes/iframe/IFrameComponent";

interface IFramePanelProps {
  messageItem?: {
    source?: string;
    title?: string;
  };
}

const IFramePanel: React.FC<IFramePanelProps> = ({ messageItem }) => {
  const iframeTitle = messageItem?.title || messageItem?.source;

  return (
    <div className="cds-aichat--panel-content cds-aichat--i-frame-panel">
      <div className="cds-aichat--i-frame-panel__content">
        {messageItem?.source && (
          <IFrameComponent
            key={messageItem.source}
            source={messageItem.source}
            title={iframeTitle}
          />
        )}
      </div>
    </div>
  );
};

export default IFramePanel;
