/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import createHumanAgentService from "../../../src/chat/services/haa/HumanAgentServiceImpl";
import { ServiceManager } from "../../../src/chat/services/ServiceManager";

/**
 * A stub manager whose store reports a live agent connection, enough for endChat to reach the
 * pre:endChat decision point.
 */
const createManagerStub = () =>
  ({
    store: {
      getState: () => ({
        persistedToBrowserStorage: {
          humanAgentState: { isConnected: true, isSuspended: false },
        },
      }),
    },
  }) as unknown as ServiceManager;

/**
 * Builds a service with a started chat and a stub service desk, with firePreEndChat and doEndChat
 * spied so the test can assert which path endChat took without a real service-desk connection.
 */
const createStartedService = (cancelEndChat: boolean) => {
  const service = createHumanAgentService(createManagerStub()) as any;
  service.chatStarted = true;
  service.serviceDesk = {};
  service.firePreEndChat = jest.fn().mockResolvedValue({ cancelEndChat });
  service.doEndChat = jest.fn().mockResolvedValue(undefined);
  return service;
};

describe("HumanAgentService.endChat forceEnd", () => {
  it("honors a pre:endChat veto on the normal path", async () => {
    const service = createStartedService(true);

    await service.endChat(true, false, false);

    // A listener set cancelEndChat, so the disconnect is vetoed.
    expect(service.firePreEndChat).toHaveBeenCalledTimes(1);
    expect(service.doEndChat).not.toHaveBeenCalled();
  });

  it("skips the cancellable pre:endChat event and always ends when forceEnd is set", async () => {
    const service = createStartedService(true);

    await service.endChat(true, false, false, { forceEnd: true });

    // Teardown must not be vetoable: the pre event is never fired and the chat ends regardless.
    expect(service.firePreEndChat).not.toHaveBeenCalled();
    expect(service.doEndChat).toHaveBeenCalledTimes(1);
  });
});
