/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cloneDeep from "lodash-es/cloneDeep.js";
import {
  THREAD_ID_MAIN,
  addDefaultsToMessage,
  createMessageRequestForButtonItemOption,
  createMessageRequestForChoice,
  createMessageRequestForFileUpload,
  createMessageRequestForText,
  createMessageResponseForItem,
  createMessageResponseForText,
  getOptionType,
  hasServiceDesk,
  isTyping,
  isButtonResponseType,
  isCardResponseType,
  isCarouselResponseType,
  isConnectToHumanAgent,
  isEventRequest,
  isGridResponseType,
  isItemSupportedInResponseBody,
  isLiveHumanAgentMessage,
  isOptionItem,
  isPause,
  isRequest,
  isResponse,
  isResponseWithNestedItems,
  isShowPanelButtonType,
  isStreamCompleteItem,
  isStreamFinalResponse,
  isStreamPartialItem,
  isTextItem,
  renderAsUserDefinedMessage,
  streamItemID,
} from "../../../src/chat/utils/messageUtils";
import {
  ButtonItemType,
  MessageInputType,
  MessageResponseTypes,
} from "../../../src/types/messaging/Messages";
import { FileStatusValue } from "../../../src/chat/utils/constants";

describe("messageUtils", () => {
  it("addDefaultsToMessage applies ids, thread, timestamps, and flags", () => {
    const msg = addDefaultsToMessage({} as any);
    expect(msg.id).toBeDefined();
    expect(msg.thread_id).toBe(THREAD_ID_MAIN);
    expect(msg.history.timestamp).toBeDefined();
    expect(msg.ui_state_internal.from_history).toBe(false);
  });

  it("isResponse and isRequest type guards", () => {
    const response = { output: {} } as any;
    const request = { input: {} } as any;
    expect(isResponse(response)).toBe(true);
    expect(isRequest(response)).toBe(false);
    expect(isRequest(request)).toBe(true);
    expect(isResponse(request)).toBe(false);
  });

  it("detects event requests", () => {
    const event = {
      input: { message_type: MessageInputType.EVENT },
    } as any;
    expect(isEventRequest(event)).toBe(true);
  });

  it("detects live human agent messages", () => {
    const message = {
      item: { agent_message_type: "agent" },
    } as any;
    expect(isLiveHumanAgentMessage(message)).toBe(true);
    const resp = {
      output: { generic: [{ agent_message_type: "x" }] },
    } as any;
    expect(
      isResponse(resp) &&
        resp.output.generic.some((item: any) => item.agent_message_type),
    ).toBe(true);
  });

  it("creates message requests for choice and button items", () => {
    const choiceReq = createMessageRequestForChoice(
      { label: "L", value: { input: { text: "t" } } } as any,
      "resp-1",
    );
    expect(choiceReq.history.related_message_id).toBe("resp-1");
    const buttonReq = createMessageRequestForButtonItemOption(
      { label: "lbl" } as any,
      "resp-2",
    );
    expect(buttonReq.input.text).toBe("lbl");
    expect(buttonReq.history.related_message_id).toBe("resp-2");
  });

  it("creates message requests for text/file", () => {
    const textReq = createMessageRequestForText("hello");
    expect(textReq.input.text).toBe("hello");
    const fileReq = createMessageRequestForFileUpload({
      id: "file-1",
      file: { name: "f" },
    } as any);
    expect(fileReq.history.file_upload_status).toBe(FileStatusValue.UPLOADING);
  });

  it("creates message responses", () => {
    const resp = createMessageResponseForText("hi", "thread-1");
    expect(resp.thread_id).toBe("thread-1");
    expect((resp.output.generic[0] as any).text).toBe("hi");

    const itemResp = createMessageResponseForItem({
      response_type: "text",
    } as any);
    expect(itemResp.id).toBeDefined();
    expect(itemResp.thread_id).toBe(THREAD_ID_MAIN);
  });

  it("response/item type guards", () => {
    const button = {
      response_type: MessageResponseTypes.BUTTON,
      button_type: ButtonItemType.SHOW_PANEL,
    } as any;
    expect(isButtonResponseType(button)).toBe(true);
    expect(isShowPanelButtonType(button)).toBe(true);
    expect(
      isOptionItem({
        response_type: MessageResponseTypes.OPTION,
        options: [],
      } as any),
    ).toBe(true);
    expect(
      isCardResponseType({ response_type: MessageResponseTypes.CARD } as any),
    ).toBe(true);
    expect(
      isCarouselResponseType({
        response_type: MessageResponseTypes.CAROUSEL,
      } as any),
    ).toBe(true);
    expect(
      isGridResponseType({ response_type: MessageResponseTypes.GRID } as any),
    ).toBe(true);
    expect(
      isItemSupportedInResponseBody({
        response_type: MessageResponseTypes.AUDIO,
      } as any),
    ).toBe(true);
  });

  it("nested/streaming helpers", () => {
    expect(
      isResponseWithNestedItems({
        response_type: MessageResponseTypes.GRID,
      } as any),
    ).toBe(true);
    expect(renderAsUserDefinedMessage({ response_type: "custom" } as any)).toBe(
      true,
    );
    expect(isStreamPartialItem({ partial_item: {} } as any)).toBe(true);
    expect(isStreamCompleteItem({ complete_item: {} } as any)).toBe(true);
    expect(isStreamFinalResponse({ final_response: {} } as any)).toBe(true);
    expect(
      streamItemID("msg-1", { streaming_metadata: { id: "chunk-1" } }),
    ).toBe("msg-1-chunk-1");
  });

  it("getOptionType returns dropdown when many options", () => {
    expect(getOptionType(undefined as any, 5)).toBe("dropdown");
    expect(getOptionType("button" as any, 2)).toBe("button");
  });

  it("hasServiceDesk checks config", () => {
    expect(
      hasServiceDesk({
        public: { serviceDeskFactory: () => null as any },
      } as any),
    ).toBe(true);
    expect(hasServiceDesk({ public: {} } as any)).toBe(false);
  });

  it("isConnectToHumanAgent detects agent connect type", () => {
    expect(
      isConnectToHumanAgent({
        response_type: MessageResponseTypes.CONNECT_TO_HUMAN_AGENT,
      } as any),
    ).toBe(true);
  });

  it("isTextItem, isTyping, isPause guards", () => {
    expect(isTextItem({ response_type: "text", text: "hi" } as any)).toBe(true);
    expect(
      isTyping({
        response_type: MessageResponseTypes.PAUSE,
        typing: true,
      } as any),
    ).toBe(true);
    expect(isPause({ response_type: MessageResponseTypes.PAUSE } as any)).toBe(
      true,
    );
  });

  it("clone safety for choice request", () => {
    const option = { label: "L", value: { input: { text: "x" } } };
    const cloned = createMessageRequestForChoice(option as any);
    expect(cloned).not.toBe(option.value);
    expect(cloneDeep(option.value)).toEqual(option.value);
  });
});
