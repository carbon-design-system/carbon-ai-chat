/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Presentational component for the Watch / State (Redux Toolkit) example.
 *
 * Demonstrates: reading selected chat state with a narrow, typed selector.
 * This component never touches the `ChatInstance` — it only knows about the
 * Redux store. That decoupling is the integration's main payoff: any
 * component anywhere in the tree can react to chat state without prop
 * drilling or a bespoke context.
 *
 * APIs exercised:
 *   - `useAppSelector` (typed `useSelector`)
 *   - `selectIsHomeScreenOpen`
 *
 * Start reading at: the `useAppSelector` call below.
 */

import React from 'react';

import { selectIsHomeScreenOpen, useAppSelector } from './store';

function HomescreenStatus() {
  // This component stays decoupled from the chat instance.
  const isHomescreenVisible = useAppSelector(selectIsHomeScreenOpen);

  return (
    <>
      <h1>Chat view state</h1>
      <p>{isHomescreenVisible ? 'Homescreen' : 'Chat View'}</p>
      <p>Selected into Redux with instance.state.select().</p>
    </>
  );
}

export { HomescreenStatus };
