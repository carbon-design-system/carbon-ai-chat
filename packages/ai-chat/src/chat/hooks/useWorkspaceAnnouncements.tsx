/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useEffect } from "react";
import { BusEventType } from "../../types/events/eventBusTypes";
import { useIntl } from "./useIntl";
import { useAriaAnnouncer } from "./useAriaAnnouncer";
import type { ServiceManager } from "../services/ServiceManager";

interface UseWorkspaceAnnouncementsProps {
  serviceManager: ServiceManager;
}

/**
 * Custom hook to manage ARIA announcements for workspace panel state changes.
 * Listens to WORKSPACE_OPEN and WORKSPACE_CLOSE events and announces them to screen readers.
 */
export function useWorkspaceAnnouncements({
  serviceManager,
}: UseWorkspaceAnnouncementsProps): void {
  const intl = useIntl();
  const announceToScreenReader = useAriaAnnouncer();

  useEffect(() => {
    const handleWorkspaceOpen = (event: any) => {
      // Try to get a meaningful title from the workspace data
      const title =
        event.data?.workspaceId ||
        event.data?.message?.title ||
        event.data?.additionalData?.title;

      const message = title
        ? intl.formatMessage({ id: "workspace_opened" }, { title })
        : intl.formatMessage({ id: "workspace_opened_no_title" });

      announceToScreenReader(message);
    };

    const handleWorkspaceClose = () => {
      const message = intl.formatMessage({ id: "workspace_closed" });
      announceToScreenReader(message);
    };

    // Subscribe to workspace events
    serviceManager.eventBus.on({
      type: BusEventType.WORKSPACE_OPEN,
      handler: handleWorkspaceOpen,
    });
    serviceManager.eventBus.on({
      type: BusEventType.WORKSPACE_CLOSE,
      handler: handleWorkspaceClose,
    });

    // Cleanup subscriptions on unmount
    return () => {
      serviceManager.eventBus.off({
        type: BusEventType.WORKSPACE_OPEN,
        handler: handleWorkspaceOpen,
      });
      serviceManager.eventBus.off({
        type: BusEventType.WORKSPACE_CLOSE,
        handler: handleWorkspaceClose,
      });
    };
  }, [serviceManager, intl, announceToScreenReader]);
}

// Made with Bob
