/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { MessageCoordinator } from '../../../src/shared/services/messaging/MessageCoordinator';
import { UpsertWorkflow } from '../../../src/shared/services/messaging/UpsertWorkflow';
import type { ServiceManager } from '../../../src/shared/services/ServiceManager';
import type { MessagePresentationPort } from '../../../src/shared/services/messaging/presentationPort';
import { MessageState } from '../../../src/types/config/MessagingConfig';
import type { MessageResponse } from '../../../src/types/messaging/Messages';

it('returns the existing workflow Promise and reuses one private workflow', () => {
  const manager = { restartCount: 0 } as ServiceManager;
  const core = new MessageCoordinator(manager, {} as MessagePresentationPort);
  manager.messageCoordinator = core;
  const result = Promise.resolve();
  const upsert = jest
    .spyOn(UpsertWorkflow.prototype, 'upsert')
    .mockReturnValue(result);
  const updater = () =>
    ({ id: 'message', output: { generic: [] } }) as MessageResponse;
  try {
    expect(core.upsertMessage('message', MessageState.COMPLETE, updater)).toBe(
      result
    );
    const workflow = (core as any).upsertWorkflow;
    expect(core.upsertMessage('other', MessageState.STREAMING, updater)).toBe(
      result
    );
    expect((core as any).upsertWorkflow).toBe(workflow);
    const lease = core.trackIncomingWrite('held');
    expect(core.incomingWriteLifetime.state.pendingWrites.size).toBe(1);
    lease.release();
    expect(core.incomingWriteLifetime.state.pendingWrites.size).toBe(0);
  } finally {
    upsert.mockRestore();
  }
});

it('retains asynchronous validation rejection through the public core entry', async () => {
  const manager = { restartCount: 0 } as ServiceManager;
  const core = new MessageCoordinator(manager, {} as MessagePresentationPort);
  manager.messageCoordinator = core;
  let result: Promise<void>;
  expect(() => {
    result = core.upsertMessage('', MessageState.COMPLETE, () => undefined);
  }).not.toThrow();
  await expect(result).rejects.toThrow(
    'upsertMessage: messageID must be a non-empty string.'
  );
});
