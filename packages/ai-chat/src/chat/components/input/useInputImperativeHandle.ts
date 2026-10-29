/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  MutableRefObject,
  Ref,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import type { PromptLineElement } from '@carbon/ai-chat-components/es/components/prompt-line/index.js';

import type { ServiceManager } from '../../services/ServiceManager';
import {
  createInputImperativeHandle,
  registerInputImperativeHandle,
} from '../../utils/inputImperativeHandle';
import type { InputFunctions } from '../../utils/inputTypes';

interface UseInputImperativeHandleArgs {
  /**
   * The forwarded ref the `InputFunctions` object is published on.
   */
  ref: Ref<InputFunctions>;

  /**
   * Ref to the live prompt-line element every imperative call delegates to.
   */
  promptLineRef: MutableRefObject<PromptLineElement | null>;

  /**
   * The service manager the `InputFunctions` object is registered on.
   */
  serviceManager: ServiceManager;

  /**
   * Sticky-latches the rich surface on. Called from `ensureEditor` so the
   * element's own on-demand upgrade keeps React passing `rich`/`extensions`.
   */
  latchRich: () => void;
}

function useInputImperativeHandle({
  ref,
  promptLineRef,
  serviceManager,
  latchRich,
}: UseInputImperativeHandleArgs): void {
  const inputFunctions = useMemo<InputFunctions>(
    () => createInputImperativeHandle(() => promptLineRef.current, latchRich),
    // Stable refs and callbacks keep the handle and its registration unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useImperativeHandle(ref, () => inputFunctions, [inputFunctions]);

  useEffect(
    () => registerInputImperativeHandle(serviceManager, inputFunctions),
    [serviceManager, inputFunctions]
  );
}

export { useInputImperativeHandle };
