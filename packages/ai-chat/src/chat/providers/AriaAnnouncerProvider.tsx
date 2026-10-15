/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useIntl } from '../hooks/useIntl';
import { AriaAnnouncerContext } from '../contexts/AriaAnnouncerContext';
import { useServiceManager } from '../hooks/useServiceManager';
import { AriaAnnouncer } from '../services/ariaAnnouncer';
import type { HasChildren } from '../../types/utilities/HasChildren';

function AriaAnnouncerProvider(props: HasChildren) {
  const intl = useIntl();
  const { store } = useServiceManager();
  const containerRef = useRef<HTMLDivElement>(null);
  const announcer = useMemo(
    () => new AriaAnnouncer(store, intl.formatMessage),
    // Formatter changes update the existing queues and live regions below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store]
  );

  useLayoutEffect(() => {
    announcer.setFormatter(intl.formatMessage);
  }, [announcer, intl]);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }
    announcer.connect(containerRef.current);
    return () => announcer.disconnect();
  }, [announcer]);

  return (
    <AriaAnnouncerContext.Provider value={announcer.announce}>
      {props.children}
      {/* aria-atomic stays off; see AriaAnnouncerOptions.ariaAtomic. */}
      <div
        ref={containerRef}
        className="cds-aichat--visually-hidden cds-aichat--aria-announcer"
      />
    </AriaAnnouncerContext.Provider>
  );
}

export { AriaAnnouncerProvider };
