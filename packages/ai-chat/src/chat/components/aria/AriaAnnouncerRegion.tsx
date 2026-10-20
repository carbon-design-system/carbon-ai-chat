/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useRef } from 'react';
import type { AriaAnnouncer } from '../../services/ariaAnnouncer';

interface AriaAnnouncerRegionProps {
  announcer: AriaAnnouncer;
}

/**
 * The chat's live regions. Render one per chat: a second copy would announce
 * everything twice.
 */
function AriaAnnouncerRegion({ announcer }: AriaAnnouncerRegionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }
    announcer.connect(containerRef.current);
    return () => announcer.disconnect();
  }, [announcer]);

  // aria-atomic stays off; see AriaAnnouncerOptions.ariaAtomic.
  return (
    <div
      ref={containerRef}
      className="cds-aichat--visually-hidden cds-aichat--aria-announcer"
    />
  );
}

export { AriaAnnouncerRegion };
