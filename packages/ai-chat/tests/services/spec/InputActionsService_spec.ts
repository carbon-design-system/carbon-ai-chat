/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { InputActionsService } from '../../../src/sdk/services/InputActionsService';
import type { ServiceManager } from '../../../src/sdk/services/ServiceManager';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import type { StructuredData } from '../../../src/types/messaging/Messages';
import { createBaseConfig, makeConfigStore } from '../../test_helpers';
import { ViewConnection } from '../../../src/sdk/services/viewBindings';
import actions from '../../../src/sdk/store/actions';
import { textToDoc } from '@carbon/ai-chat-components/es/components/prompt-line/src/tiptap/json-utils.js';

function createService(config: PublicConfig = createBaseConfig()) {
  const store = makeConfigStore(config);
  // No view is attached, so there's no rendered input.
  const serviceManager = {
    store,
    view: new ViewConnection(),
  } as unknown as ServiceManager;
  return { service: new InputActionsService(serviceManager), store };
}

describe('InputActionsService data ownership', () => {
  it('protects stored input content from updater mutation and returned aliases', async () => {
    const { service, store } = createService();
    const original = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'original' }],
        },
      ],
    };
    await service.updateInputContent(() => original);
    original.content[0].content[0].text = 'host mutation';

    expect(store.getState().assistantInputState.content).toMatchObject({
      content: [{ content: [{ text: 'original' }] }],
    });

    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    await service.updateInputContent((previous) => {
      previous.content[0].content[0].text = 'updater mutation';
      throw new Error('stop');
    });
    consoleError.mockRestore();

    expect(store.getState().assistantInputState.content).toMatchObject({
      content: [{ content: [{ text: 'original' }] }],
    });
  });

  it('protects structured data from updater mutation and returned aliases', () => {
    const { service, store } = createService();
    const original: StructuredData = {
      fields: [{ id: 'rating', value: { score: 1 } }],
    };
    service.updateStructuredData(() => original);
    (original.fields[0].value as { score: number }).score = 2;

    expect(store.getState().assistantInputState.manualStructuredData).toEqual({
      fields: [{ id: 'rating', value: { score: 1 } }],
    });

    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    service.updateStructuredData((previous) => {
      (previous.fields[0].value as { score: number }).score = 3;
      throw new Error('stop');
    });
    consoleError.mockRestore();

    expect(store.getState().assistantInputState.manualStructuredData).toEqual({
      fields: [{ id: 'rating', value: { score: 1 } }],
    });
  });

  it('owns contributed upload data returned by the host', async () => {
    const contributedData: StructuredData = {
      fields: [{ id: 'file', value: { reference: 'original' } }],
    };
    const config = createBaseConfig();
    config.upload = {
      isOn: true,
      onFileUpload: jest.fn().mockResolvedValue(contributedData),
    };
    const { service, store } = createService(config);

    await service.handleFileSelectedForUpload(
      new File(['content'], 'example.txt')
    );
    (contributedData.fields[0].value as { reference: string }).reference =
      'host mutation';

    expect(
      store.getState().assistantInputState.pendingUploads[0].contributedData
    ).toEqual({
      fields: [{ id: 'file', value: { reference: 'original' } }],
    });
  });
});

describe('InputActionsService plain-text draft writes', () => {
  const richDoc = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'old', marks: [{ type: 'bold' }] }],
      },
    ],
  };

  it('writes the document for the new text when no editor is live', () => {
    const { service, store } = createService();
    store.dispatch(
      actions.updateInputState({ rawValue: 'old', content: richDoc }, false)
    );

    service.updateRawInputValue(() => 'hi\n\nthere');

    const { rawValue, content } = store.getState().assistantInputState;
    expect(rawValue).toBe('hi\n\nthere');
    expect(content).toEqual(textToDoc('hi\n\nthere'));
    expect(store.getState().humanAgentState.inputState.content).toEqual([]);
  });

  it('writes the agent draft document while the input is routed to an agent', () => {
    const { service, store } = createService();
    store.dispatch(
      actions.updateInputState(
        { rawValue: 'assistant', content: textToDoc('assistant') },
        false
      )
    );
    store.dispatch(
      actions.updateInputState({ rawValue: 'old', content: richDoc }, true)
    );
    store.dispatch(
      actions.changeState({
        humanAgentState: {
          ...store.getState().humanAgentState,
          isConnecting: true,
        },
      })
    );

    service.updateRawInputValue((previous) => `${previous}er`);

    const agent = store.getState().humanAgentState.inputState;
    expect(agent.rawValue).toBe('older');
    expect(agent.content).toEqual(textToDoc('older'));
    const assistant = store.getState().assistantInputState;
    expect(assistant.rawValue).toBe('assistant');
    expect(assistant.content).toEqual(textToDoc('assistant'));
  });

  it('writes the empty document when the new text is empty', () => {
    const { service, store } = createService();
    store.dispatch(
      actions.updateInputState({ rawValue: 'old', content: richDoc }, false)
    );

    service.updateRawInputValue(() => '');

    expect(store.getState().assistantInputState.content).toEqual(textToDoc(''));
  });
});
