/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import { deepQuerySelector } from '@carbon/ai-chat-components/es/globals/utils/dom-utils.js';
import '../../../src/web-components/cds-aichat-container';
import '../../../src/web-components/cds-aichat-custom-element';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';
import {
  createBaseTestProps,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

describe.each(['cds-aichat-container', 'cds-aichat-custom-element'])(
  'direct custom prompt line slot on %s',
  (tag) => {
    beforeEach(setupBeforeEach);
    afterEach(setupAfterEach);

    it('replaces the built-in input, guards its API, and restores it when slot content is removed', async () => {
      let instance: ChatInstance;
      const element = document.createElement(tag);
      const content = document.createElement('input');
      content.slot = 'customPromptLine';
      content.setAttribute('aria-label', 'Host prompt');
      element.append(content);
      const onAfterRender = jest.fn((value: ChatInstance) => {
        instance = value;
      });
      const config = createBaseTestProps();
      Object.assign(
        element,
        tag === 'cds-aichat-container'
          ? { config, onAfterRender }
          : { ...config, onAfterRender }
      );
      await act(async () => {
        document.body.append(element);
      });
      await waitFor(() => expect(onAfterRender).toHaveBeenCalledTimes(1), {
        timeout: 8000,
      });
      const prompt = () =>
        deepQuerySelector(document, 'cds-aichat-prompt-line');
      await waitFor(() => expect(prompt()).toBeNull());
      const updater = jest.fn(() => 'wrong draft');
      expect(() => instance.input.updateRawValue(updater)).toThrow(
        'host-owned'
      );
      expect(updater).not.toHaveBeenCalled();
      await expect(instance.input.getEditor()).rejects.toThrow(
        'Input is not currently rendered'
      );

      await act(async () => {
        content.remove();
      });
      await waitFor(() => expect(prompt()).not.toBeNull());
      await act(async () => {
        element.append(content);
      });
      await waitFor(() => expect(prompt()).toBeNull());
      await act(async () => {
        content.slot = 'unused';
      });
      await waitFor(() => expect(prompt()).not.toBeNull());
    });
  }
);
