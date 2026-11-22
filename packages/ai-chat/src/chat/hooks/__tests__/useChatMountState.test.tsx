/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { ChatContext } from '../../contexts/ChatContext';
import { useIntl } from '../useIntl';
import { useWindowSize } from '../useWindowSize';
import { createIntl } from '../../../sdk/utils/i18n';

import type { ServiceManager } from '../../../sdk/services/ServiceManager';
import type { LanguagePack } from '../../../types/config/LanguagePack';

import {
  createTestViewState,
  makeConfigStore,
  setupAfterEach,
} from '../../__tests__/helpers/chat';

afterEach(setupAfterEach);

function setup() {
  const serviceManager = {
    store: makeConfigStore({}),
    intl: createIntl({ locale: 'en', messages: { greeting: 'Hello' } }),
  } as unknown as ServiceManager;
  const viewState = createTestViewState({ serviceManager });
  viewState.connect();
  const renders = { width: 0, intl: 0 };

  function WidthConsumer() {
    renders.width += 1;
    return <span data-testid="width">{useWindowSize().width}</span>;
  }

  function IntlConsumer() {
    renders.intl += 1;
    const intl = useIntl();
    return (
      <span data-testid="greeting">
        {intl.formatMessage({ id: 'greeting' as keyof LanguagePack })}
      </span>
    );
  }

  render(
    <ChatContext.Provider value={viewState}>
      <WidthConsumer />
      <IntlConsumer />
    </ChatContext.Provider>
  );
  return { serviceManager, viewState, renders };
}

it('re-renders only window-size consumers on a resize', () => {
  const { viewState, renders } = setup();

  act(() => viewState.setWindowSize({ width: 321, height: 100 }));

  expect(screen.getByTestId('width')).toHaveTextContent('321');
  expect(renders).toEqual({ width: 2, intl: 1 });
});
