/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { ReactNode } from 'react';

import { StoreProvider } from './providers/StoreProvider';
import { WindowSizeProvider } from './providers/WindowSizeProvider';
import { ServiceManagerProvider } from './providers/ServiceManagerProvider';
import { IntlProvider } from './providers/IntlProvider';
import { AriaAnnouncerProvider } from './providers/AriaAnnouncerProvider';
import { ServiceManager } from './services/ServiceManager';
import { Dimension } from '../types/utilities/Dimension';

interface AppProvidersProps {
  serviceManager: ServiceManager;
  windowSize: Dimension;
  children: ReactNode;
}

/**
 * The providers every part of the chat reads, in the order they depend on each
 * other. Mount this once per chat: the announcer owns the chat's live regions,
 * so a second copy would announce everything twice.
 */
function AppProviders({
  serviceManager,
  windowSize,
  children,
}: AppProvidersProps) {
  return (
    <StoreProvider store={serviceManager.store}>
      <WindowSizeProvider windowSize={windowSize}>
        <ServiceManagerProvider serviceManager={serviceManager}>
          <IntlProvider intl={serviceManager.intl}>
            <AriaAnnouncerProvider>{children}</AriaAnnouncerProvider>
          </IntlProvider>
        </ServiceManagerProvider>
      </WindowSizeProvider>
    </StoreProvider>
  );
}

export { AppProviders };
