/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useCallback, useEffect, useRef } from "react";
import { useIntl } from "react-intl";

import {
  AriaAnnouncerContext,
  AriaAnnouncerFunctionType,
} from "../../../contexts/AriaAnnouncerContext";
import { useServiceManager } from "../../../hooks/useServiceManager";
import { AnnounceMessage } from "../../../../types/state/AppState";
import { HasChildren } from "../../../../types/utilities/HasChildren";
import { AriaAnnouncerComponent } from "./AriaAnnouncerComponent";

/**
 * This component is responsible for providing a context that gives access to the component we use to perform aria
 * announcements. It will also listen for changes in {@link AppState.announceMessage} and triggers the announcements
 * of that.
 */
function AriaAnnouncerProvider(props: HasChildren) {
  const intl = useIntl();
  const { store } = useServiceManager();

  const announcerRef = useRef<AriaAnnouncerComponent>();
  const announcerFunction = useCallback<AriaAnnouncerFunctionType>((value) => {
    // It's possible for some component to try to do an announcement before this component has actually been mounted
    // (because it's later in the DOM). If that happens, then we need to delay the announcement a bit.
    if (value) {
      if (!announcerRef.current) {
        setTimeout(() => announcerRef.current?.announceValue(value));
      } else {
        announcerRef.current.announceValue(value);
      }
    }
  }, []);
  const previousAnnounceMessageRef = useRef<AnnounceMessage>();

  useEffect(() => {
    // This effect will register a listener on the store that watches for changes in the announceMessage property
    // and when it changes, it will issue an announcement request on the announcer component.
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
