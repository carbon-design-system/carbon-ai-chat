/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A BETA component to show notifications in the chat. Marked as beta because Carbon still has some keyboard
 * accessibility issues to work out and we may have to react to them.
 *
 * Currently, when a notification pops up, it is put in a focus trap and you MUST interact with it if you are using
 * keyboard navigation.
 */

import ActionableNotification, {
  NOTIFICATION_KIND,
} from "../../components/carbon/ActionableNotification";
import ActionableNotificationButton from "../../components/carbon/ActionableNotificationButton";
import React from "react";

import { NotificationStateObject } from "../../../types/instance/apiTypes";
import { HasServiceManager } from "../../hocs/withServiceManager";
import { useLanguagePack } from "../../hooks/useLanguagePack";
import actions from "../../store/actions";

interface NotificationsProps extends HasServiceManager {
  notifications: NotificationStateObject[];
}

function Notifications({ notifications, serviceManager }: NotificationsProps) {
  const languagePack = useLanguagePack();
  if (notifications.length) {
    return (
      <div className="cds-aichat--notifications">
        {notifications.map((notification: NotificationStateObject) => {
          const item = notification.notification;
          const onClose = () => {
            serviceManager.store.dispatch(
              actions.removeNotifications({ notificationID: notification.id }),
            );
          };

          let onActionButtonClick;
          let actionButtonLabel;
          if (item.actionButtonLabel && item.onActionButtonClick) {
            onActionButtonClick = () => {
              item.onActionButtonClick();
              onClose();
            };
            actionButtonLabel = item.actionButtonLabel;
          }

          return (
            <div
              className="cds-aichat--notifications__notification"
              key={notification.id}
            >
              <ActionableNotification
                aria-label={languagePack.notifications_toastClose}
                actionButtonLabel={actionButtonLabel}
                kind={item.kind as NOTIFICATION_KIND}
                onNotificationClosed={() => {
                  onClose();
                  item.onCloseButtonClick?.();
                }}
                subtitle={item.message}
                title={item.title}
                // Instead of this property, we are supposed to use the StaticNotification component which does not
                // steal focus but it's still experimental and does not provide the functionality we need (it does not
                // have a close button).
                hasFocus={false}
              >
                {actionButtonLabel && (
                  <ActionableNotificationButton
                    slot="action"
                    onClick={onActionButtonClick}
                  >
                    {actionButtonLabel}
                  </ActionableNotificationButton>
                )}
              </ActionableNotification>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
}

export { Notifications };
