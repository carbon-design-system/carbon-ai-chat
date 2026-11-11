/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ViewType } from '../../../src/types/instance/apiTypes';
import actions from '../../../src/shared/store/actions';
import {
  createBaseConfig,
  renderChatAndGetInstance,
  renderChatAndGetInstanceWithStore,
  setupBeforeEach,
  setupAfterEach,
} from '../../test_helpers';
import { viewActions } from '../../../src/chat/state';

describe('ChatInstance.destroySession', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('should have destroySession method available', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.destroySession).toBe('function');
  });

  it('should return a Promise', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    const result = instance.destroySession(true);
    expect(result).toBeInstanceOf(Promise);
  });

  it('should resolve successfully with keepOpenState=true', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    await expect(instance.destroySession(true)).resolves.not.toThrow();
  });

  it('should resolve successfully with keepOpenState=false', async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    await expect(instance.destroySession(false)).resolves.not.toThrow();
  });

  it('should reset persisted browser storage when called', async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // First, set some state that would be persisted
    await instance.changeView(ViewType.MAIN_WINDOW);

    // Verify the state is set
    let state = store.getState();
    expect(state.view.persistedToBrowserStorage.viewState.mainWindow).toBe(
      true
    );

    // Add some disclaimer acceptance to test that it gets cleared
    store.dispatch(viewActions.acceptDisclaimer());

    // Verify disclaimer was accepted
    state = store.getState();
    const hostname =
      typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    expect(
      state.view.persistedToBrowserStorage.disclaimersAccepted[hostname]
    ).toBe(true);

    // Now destroy the session with keepOpenState=false
    await instance.destroySession(false);

    // Verify the persisted state has been reset
    state = store.getState();

    // Disclaimer acceptance should be cleared
    expect(state.view.persistedToBrowserStorage.disclaimersAccepted).toEqual(
      {}
    );

    // View state should be reset to launcher open (default)
    expect(state.view.persistedToBrowserStorage.viewState.launcher).toBe(true);
    expect(state.view.persistedToBrowserStorage.viewState.mainWindow).toBe(
      false
    );
  });

  it('should preserve view state when keepOpenState=true', async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Set main window to be open
    await instance.changeView(ViewType.MAIN_WINDOW);

    // Verify the state is set
    let state = store.getState();
    expect(state.view.persistedToBrowserStorage.viewState.mainWindow).toBe(
      true
    );
    const originalViewState = state.view.persistedToBrowserStorage.viewState;

    // Add disclaimer acceptance
    store.dispatch(viewActions.acceptDisclaimer());

    // Verify disclaimer was accepted
    state = store.getState();
    const hostname =
      typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    expect(
      state.view.persistedToBrowserStorage.disclaimersAccepted[hostname]
    ).toBe(true);

    // Destroy session with keepOpenState=true
    await instance.destroySession(true);

    // Verify the state
    state = store.getState();

    // Disclaimer acceptance should still be cleared
    expect(state.view.persistedToBrowserStorage.disclaimersAccepted).toEqual(
      {}
    );

    // But view state should be preserved
    expect(state.view.persistedToBrowserStorage.viewState).toEqual(
      originalViewState
    );
  });

  it('should clear hasSentNonWelcomeMessage flag', async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Set the flag to true (simulate user having sent a message)
    store.dispatch(actions.updateHasSentNonWelcomeMessage(true));

    // Verify the flag is set
    let state = store.getState();
    expect(state.persistedToBrowserStorage.hasSentNonWelcomeMessage).toBe(true);

    // Destroy session
    await instance.destroySession(false);

    // Verify the flag has been reset
    state = store.getState();
    expect(state.persistedToBrowserStorage.hasSentNonWelcomeMessage).toBe(
      false
    );
  });

  it('should reset homeScreenState', async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Set home screen to open
    store.dispatch(viewActions.setHomeScreenIsOpen(true));

    // Verify the state is set
    let state = store.getState();
    expect(
      state.view.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen
    ).toBe(true);

    // Destroy session
    await instance.destroySession(false);

    // Verify homeScreenState has been reset
    state = store.getState();
    expect(
      state.view.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen
    ).toBe(false);
  });

  it('should complete successfully and clear all persistent state', async () => {
    const config = createBaseConfig();
    const { instance, store } = await renderChatAndGetInstanceWithStore(config);

    // Set up some initial state
    await instance.changeView(ViewType.MAIN_WINDOW);
    store.dispatch(viewActions.acceptDisclaimer());
    store.dispatch(actions.updateHasSentNonWelcomeMessage(true));
    store.dispatch(viewActions.setHomeScreenIsOpen(true));

    // Verify initial state is set
    let state = store.getState();
    expect(state.view.persistedToBrowserStorage.viewState.mainWindow).toBe(
      true
    );
    expect(state.persistedToBrowserStorage.hasSentNonWelcomeMessage).toBe(true);
    expect(
      state.view.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen
    ).toBe(true);

    // Destroy session
    await expect(instance.destroySession(false)).resolves.not.toThrow();

    // Verify all persistent state was reset
    state = store.getState();
    expect(state.view.persistedToBrowserStorage.disclaimersAccepted).toEqual(
      {}
    );
    expect(state.persistedToBrowserStorage.hasSentNonWelcomeMessage).toBe(
      false
    );
    expect(
      state.view.persistedToBrowserStorage.homeScreenState.isHomeScreenOpen
    ).toBe(false);
    expect(state.view.persistedToBrowserStorage.viewState.launcher).toBe(true);
    expect(state.view.persistedToBrowserStorage.viewState.mainWindow).toBe(
      false
    );
  });
});
