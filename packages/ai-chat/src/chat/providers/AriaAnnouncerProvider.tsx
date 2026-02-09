/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useCallback, useEffect, useRef } from "react";
import { useIntl } from "../hooks/useIntl";

import {
  AriaAnnouncerContext,
  AriaAnnouncerFunctionType,
} from "../contexts/AriaAnnouncerContext";
import { useServiceManager } from "../hooks/useServiceManager";
import { AnnounceMessage } from "../../types/state/AppState";
import { HasChildren } from "../../types/utilities/HasChildren";
import { AriaAnnouncerComponent } from "../components/aria/AriaAnnouncerComponent";

/**
 * AriaAnnouncerProvider
 *
 * Provides the ARIA announcement function via context and renders a hidden announcer component.
 * Subscribes to `AppState.announceMessage` and announces whenever the value changes.
 */
function AriaAnnouncerProvider(props: HasChildren) {
  const intl = useIntl();
  const { store } = useServiceManager();

  const announcerRef = useRef<AriaAnnouncerComponent>(undefined);
  const announcerFunction = useCallback<AriaAnnouncerFunctionType>((value) => {
    if (value) {
      if (!announcerRef.current) {
        setTimeout(() => announcerRef.current?.announceValue(value));
      } else {
        announcerRef.current.announceValue(value);
      }
    }
  }, []);
  const previousAnnounceMessageRef = useRef<AnnounceMessage>(undefined);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const currentAnnounceMessage = store.getState().announceMessage;
      if (currentAnnounceMessage !== previousAnnounceMessageRef.current) {
        announcerFunction(currentAnnounceMessage);
        previousAnnounceMessageRef.current = currentAnnounceMessage;
      }
    });
    return unsubscribe;
  }, [store, announcerFunction]);

  return (
    <AriaAnnouncerContext.Provider value={announcerFunction}>
      {props.children}
      <AriaAnnouncerComponent intl={intl} ref={announcerRef} />
    </AriaAnnouncerContext.Provider>
  );
}

export { AriaAnnouncerProvider };
