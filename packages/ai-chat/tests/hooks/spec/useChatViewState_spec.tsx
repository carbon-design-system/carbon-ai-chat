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
import { ChatContext } from '../../../src/chat/contexts/ChatContext';
import { useIntl } from '../../../src/chat/hooks/useIntl';
import { useWindowSize } from '../../../src/chat/hooks/useWindowSize';
import { createIntl } from '../../../src/chat/utils/i18n';
import { setIntl } from '../../../src/chat/utils/intlUtils';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import type { LanguagePack } from '../../../src/types/config/LanguagePack';
import {
  createTestViewState,
  makeConfigStore,
  setupAfterEach,
} from '../../test_helpers';

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

it('re-renders only formatter consumers on a formatter change', () => {
  const { serviceManager, renders } = setup();

  act(() =>
    setIntl(serviceManager, 'fr', {
      greeting: 'Bonjour',
    } as unknown as LanguagePack)
  );

  expect(screen.getByTestId('greeting')).toHaveTextContent('Bonjour');
  expect(renders).toEqual({ width: 1, intl: 2 });
});

it('re-renders nothing for a confirmation change', () => {
  const { viewState, renders } = setup();

  act(() => viewState.showEndChatConfirmation());

  expect(renders).toEqual({ width: 1, intl: 1 });
});
