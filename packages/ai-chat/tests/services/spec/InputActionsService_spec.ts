/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { InputActionsService } from '../../../src/chat/services/InputActionsService';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import type { PublicConfig } from '../../../src/types/config/PublicConfig';
import type { StructuredData } from '../../../src/types/messaging/Messages';
import { createBaseConfig, makeConfigStore } from '../../test_helpers';

function createService(config: PublicConfig = createBaseConfig()) {
  const store = makeConfigStore(config);
  const serviceManager = {
    store,
    getInputFunctionsRef: () => null,
  } as ServiceManager;
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
