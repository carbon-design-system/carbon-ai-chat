/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createBaseConfig,
  renderChatAndGetInstance,
  setupBeforeEach,
  setupAfterEach,
} from "../helpers/chatInstanceTestHelpers";

describe("ChatInstance.messaging", () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it("should have messaging property available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(instance.messaging).toBeDefined();
    expect(typeof instance.messaging).toBe("object");
  });

  it("should have all messaging methods available", async () => {
    const config = createBaseConfig();
    const instance = await renderChatAndGetInstance(config);

    expect(typeof instance.messaging.addMessage).toBe("function");
    expect(typeof instance.messaging.addMessageChunk).toBe("function");
    expect(typeof instance.messaging.removeMessages).toBe("function");
    expect(typeof instance.messaging.clearConversation).toBe("function");
    expect(typeof instance.messaging.insertHistory).toBe("function");
  });
});
