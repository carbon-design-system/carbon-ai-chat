/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type {
  ExtensionHosts,
  PanelContentRequest,
  PanelTargetName,
} from '../../services/extensionHosts';

type PanelContentParts = Partial<Record<PanelTargetName, React.ReactNode>>;

interface CommittedPanelContent {
  request: PanelContentRequest;
  parts: PanelContentParts;
}

function PanelContentAdapter({
  hosts,
  request,
  parts,
}: {
  hosts: ExtensionHosts;
  request: PanelContentRequest;
  parts: PanelContentParts;
}) {
  const lastRendered = useRef<CommittedPanelContent>(undefined);
  const ready =
    request.revision === parts && hosts.isPanelContentPlaced(request);
  const rendered = ready ? { request, parts } : lastRendered.current;
  useLayoutEffect(() => {
    if (ready) {
      lastRendered.current = { request, parts };
      hosts.commitPanelContent(request);
    }
  }, [hosts, request, ready, parts]);

  return rendered ? (
    <>
      {rendered.request.names.map((name) =>
        createPortal(
          rendered.parts[name] ?? null,
          rendered.request.targets[name],
          name
        )
      )}
    </>
  ) : null;
}

export type { PanelContentParts };
export { PanelContentAdapter };
