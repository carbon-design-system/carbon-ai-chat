/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ResponseUserProfile,
  ServiceDesk,
  ServiceDeskCallback,
  ServiceDeskFactoryParameters,
  ChatInstance,
  MessageResponse,
  StartChatOptions,
  EndChatInfo,
  MessageRequest,
  AdditionalDataToAgent,
  FileUpload,
  ErrorType,
  AgentAvailability,
  MessageResponseTypes,
  VideoItem,
  TextItem,
  UserDefinedItem,
  UserType,
} from "@carbon/ai-chat";

import { v4 as uuid } from "uuid";

import { sleep } from "../framework/utils";
import { MARKDOWN } from "../customSendMessage/constants";

/**
 * This is a no-op function that's for the purpose of verifying at build time that a given item matches a given
 * type. To use, pass the item as the "item" parameter and pass the type as the "TItemType" type parameter. Since
 * this is incurring a runtime call for what is really a build-time check, this function should be used sparingly.
 */
function assertType<TItemType>(item: TItemType): TItemType {
  return item;
}

/**
 * Generates a {@link MessageResponse} for the given text message sent to the user.
 */
function createMessageResponseForText(
  text: string,
  responseType: MessageResponseTypes = MessageResponseTypes.TEXT,
): MessageResponse {
  const textItem: TextItem = {
    response_type: responseType as MessageResponseTypes,
    text,
  };
  const messageResponse: MessageResponse = {
    id: uuid(),
    output: {
      generic: [textItem],
    },
  };

  return messageResponse;
}

interface MockPreStartChatPayload {
  /**
   * The name the user provided to us.
   */
  userName: string;
}

interface MockPreEndChatPayload {
  /**
   * Indicates if the user thought the agent was helpful.
   */
  wasAgentHelpful?: boolean;
}

interface MockStep {
  /**
   * The amount of time to wait after the previous step.
   */
  delay?: number;

  /**
   * The callback to call to run this step.
   */
  callback: (instance: MockServiceDesk) => void;

  /**
   * Indicates if this step should return the given promise from the sendMessageToAgent function. This should be on
   * the last step.
   */
  returnPromise?: Promise<void>;
}

enum ConnectInfoType {
  /**
   * The connecting status will not show any information.
   */
  NONE = 1,

  /**
   * The connecting status will show information about the user's position in a queue.
   */
  LINE = 2,

  /**
   * The connecting status will show information about the wait time in minutes for the user.
   */
  MINUTES = 3,

  /**
   * The connecting status will show a series of custom messages.
   */
  MESSAGE = 4,

  /**
   * Starting a chat will result in a connecting error {@link ErrorType.CONNECTING}.
   */
  CONNECTING_ERROR = 5,

  /**
   * Starting a chat will just fail with the service desk throwing an error.
   */
  THROW_ERROR = 6,
}

interface MockState {
  /**
   * This is the multiplier to apply to the messages that are displayed while connecting.
   */
  connectDelayFactor: number;

  /**
   * The type of info to display when connecting.
   */
  connectInfoType: ConnectInfoType;

  /**
   * The amount of time to delay the response for agent availability.
   */
  agentAvailabilityDelay: number;

  /**
   * The current state of agent availability.
   */
  agentAvailability: boolean;

  /**
   * Indicates if we should show state changes.
   */
  showStateChanges: boolean;

  /**
   * The current agent.
   */
  currentAgent: ResponseUserProfile;
}

const HELLO_TEXT = (userName: string) =>
  `Hi${
    userName ? ` ${userName}` : ""
  }, I'm Shepard! I'm a **mock** service desk agent. Type *"help"* to see a list of messages you can mock me with. <script>alert("If you see this, it is a serious bug!");</script>`;

const MOCK_AGENT_PROFILE_SHEPARD: ResponseUserProfile = {
  id: "CommanderShepard-id",
  nickname: "Shepard",
  user_type: UserType.HUMAN,
};

const MOCK_AGENT_PROFILE_GARRUS: ResponseUserProfile = {
  id: "GarrusVakarian-id",
  nickname: "Garrus",
  user_type: UserType.HUMAN,
};

const MOCK_AGENT_PROFILE_LEGION: ResponseUserProfile = {
  id: "Legion-id",
  nickname: "Legion",
  user_type: UserType.HUMAN,
};

const MOCK_AGENT_PROFILE_EMPTY: ResponseUserProfile = {
  id: "",
  nickname: "",
  user_type: UserType.HUMAN,
};

// The agent we're currently talking to.

class MockServiceDesk implements ServiceDesk {
  /**
   * The current internal state for the mock service desk. This object is exported by this module and these values may
   * be controlled by external code.
   */
  readonly mockState: MockState = {
    connectDelayFactor: 1,
    connectInfoType: ConnectInfoType.LINE,
    agentAvailabilityDelay: 0,
    agentAvailability: true,
    showStateChanges: false,
    currentAgent: MOCK_AGENT_PROFILE_SHEPARD,
  };

  /**
   * The callback that is used to send events back to the chat widget.
   */
  callback: ServiceDeskCallback;

  /**
   * Indicates if a chat had been started at some point (but not necessarily still in progress).
   */
  hasStarted: boolean;

  /**
   * The payload that were provided when the last chat was started.
   */
  preStartChatPayload: MockPreStartChatPayload;

  /**
   * The original parameters passed to the constructor.
   */
  factoryParameters: ServiceDeskFactoryParameters;

  /**
   * The instance of the Carbon AI Chat.
   */
  chatInstance: ChatInstance;

  constructor(parameters: ServiceDeskFactoryParameters) {
    console.log("Creating MockServiceDesk");
    this.preStartChatPayload = {
      userName: "",
    };
    this.hasStarted = false;
    this.factoryParameters = parameters;
    this.chatInstance = parameters.instance;
    this.callback = parameters.callback;
    this.callback.updateCapabilities({
      allowFileUploads: true,
      allowedFileUploadTypes: "image/*,.txt",
      allowMultipleFileUploads: true,
    });
  }

  getName(): string {
    return "mock service desk";
  }

  startChat(
    connectMessage: MessageResponse,
    startChatOptions: StartChatOptions,
  ): Promise<void> {
    console.log(`MockServiceDesk [startChat]: connectMessage`, connectMessage);
    console.log(
      `MockServiceDesk [startChat]: startChatOptions`,
      startChatOptions,
    );

    this.preStartChatPayload =
      (startChatOptions.preStartChatPayload as MockPreStartChatPayload) || {};

    if (this.mockState.connectInfoType === ConnectInfoType.CONNECTING_ERROR) {
      return runSteps(this, START_CHAT_CONNECT_ERROR(this.mockState));
    }
    if (this.mockState.connectInfoType === ConnectInfoType.THROW_ERROR) {
      throw new Error("The mock service desk threw an error during startChat!");
    }
    if (this.mockState.connectDelayFactor === 0) {
      return runSteps(
        this,
        START_CHAT_IMMEDIATELY(this.preStartChatPayload.userName),
      );
    }
    if (this.mockState.connectInfoType === ConnectInfoType.NONE) {
      return runSteps(
        this,
        START_CHAT_NO_INFO(this.preStartChatPayload.userName, this.mockState),
      );
    }

    this.hasStarted = true;

    return runSteps(
      this,
      START_CHAT(this.preStartChatPayload.userName, this.mockState),
    );
  }

  endChat(passedInfo: EndChatInfo<unknown>): Promise<void> {
    console.log(`MockServiceDesk [endChat]`, passedInfo);

    const info = passedInfo as EndChatInfo<MockPreEndChatPayload>;

    let surveyResponse;
    if (info.preEndChatPayload?.wasAgentHelpful === true) {
      surveyResponse = "We understand that you found the agent helpful.";
    } else if (info.preEndChatPayload?.wasAgentHelpful === false) {
      surveyResponse = "We are sorry that the agent was not helpful.";
    }

    if (surveyResponse) {
      const text = `Thank you for responding to our survey. ${surveyResponse}`;
      this.sendMessageToUser(
        createMessageResponseForText(text),
        this.mockState.currentAgent.id,
      );
    }

    return Promise.resolve();
  }

  userTyping(isTyping: boolean): Promise<void> {
    console.log(`MockServiceDesk [userTyping]: isTyping=${isTyping}`);
    return Promise.resolve();
  }

  sendMessageToAgent(
    message: MessageRequest,
    _messageID: string,
    additionalData: AdditionalDataToAgent,
  ): Promise<void> {
    console.log(
      `MockServiceDesk [sendMessageToAgent]`,
      message,
      additionalData,
    );
    const { text } = message.input;

    // Send a message back whenever we get a message from the user.
    let steps: MockStep[] = [];
    if (!text) {
      // Ignore empty text. This occurs if the user just uploads files.
    } else {
      const textLower = text.toLowerCase();
      if (textLower.includes("help")) {
        steps = MESSAGE_TO_AGENT_HELP();
      } else if (textLower.includes("someone else")) {
        if (
          this.mockState.currentAgent === MOCK_AGENT_PROFILE_SHEPARD ||
          this.mockState.currentAgent === MOCK_AGENT_PROFILE_EMPTY
        ) {
          steps = TRANSFER_TO_GARRUS();
        } else if (this.mockState.currentAgent === MOCK_AGENT_PROFILE_GARRUS) {
          steps = TRANSFER_TO_LEGION();
        } else {
          steps = TRANSFER_TO_EMPTY();
        }
      } else if (textLower.includes("markdown")) {
        steps = MESSAGE_TO_AGENT_TEXT(MARKDOWN);
      } else if (textLower.includes("multiple")) {
        steps = MESSAGE_TO_AGENT_MULTIPLE();
      } else if (textLower.includes("intl")) {
        const message = this.factoryParameters.instance
          .getState()
          .intl.formatMessage({ id: "input_placeholder" });
        steps = MESSAGE_TO_AGENT_TEXT(
          `Intl string (input_placeholder): *${message}*`,
        );
      } else if (textLower.includes("leave")) {
        steps = MESSAGE_TO_AGENT_LEAVE_CHAT();
      } else if (textLower.includes("text")) {
        steps = MESSAGE_TO_AGENT_TEXT(
          "Carbon is awesome! I don't know how anyone can live without it.",
        );
      } else if (textLower.includes("upload")) {
        steps = MESSAGE_TO_AGENT_TEXT(
          "Alright, you can upload some files. But only .png files please.",
          0,
          false,
        );
      } else if (textLower.includes("message throw")) {
        steps = MESSAGE_THROW();
      } else if (textLower.includes("video")) {
        steps = MESSAGE_VIDEO();
      } else if (textLower.includes("custom")) {
        steps = MESSAGE_CUSTOM();
      } else if (textLower.includes("hang")) {
        steps = HANG_MESSAGE();
      } else {
        steps = MESSAGE_TO_AGENT_TEXT(
          'If you say so. Type *"help"* for a list of other things you can say.',
        );
      }
    }

    // Handle any file uploads we may have.
    if (additionalData.filesToUpload) {
      additionalData.filesToUpload.forEach((file) => {
        // Use a setTimeout to simulate a random amount of time it takes to upload a file.
        setTimeout(
          () => {
            let errorMessage = "";
            if (!file.file.name.endsWith(".png")) {
              errorMessage = "Only .png files may be uploaded.";
            }
            this.callback.setFileUploadStatus(
              file.id,
              Boolean(errorMessage.length),
              errorMessage,
            );
          },
          Math.random() * 5000 + 1,
        );
      });
    }

    return runSteps(this, steps);
  }

  filesSelectedForUpload(uploads: FileUpload[]): void {
    console.log(`MockServiceDesk [filesSelectedForUpload]`, uploads);
    uploads.forEach((file) => {
      if (file.file.name.toLowerCase().startsWith("a")) {
        this.callback.setFileUploadStatus(
          file.id,
          true,
          'You may not upload files that start with the letter "A"!',
        );
      }
    });
  }

  userReadMessages(): Promise<void> {
    console.log(`MockServiceDesk [userReadMessages]`);
    return Promise.resolve();
  }

  sendMessageToUser(message: MessageResponse | string, agentID: string): void {
    // As soon as the agent sends a message, make sure to clear the "isTyping" event for the agent.
    this.callback.agentTyping(false);
    this.callback.sendMessageToUser(message, agentID);
  }

  async areAnyAgentsOnline(): Promise<boolean | null> {
    if (this.mockState.agentAvailabilityDelay) {
      await sleep(this.mockState.agentAvailabilityDelay * 1000);
    }
    return this.mockState.agentAvailability;
  }

  async screenShareStop() {
    this.callback.sendMessageToUser(
      "Alright, you have stopped sharing your screen.",
      this.mockState.currentAgent.id,
    );
  }

  async reconnect(): Promise<boolean> {
    await sleep(2000);
    this.hasStarted = true;
    return true;
  }
}

/**
 * This function will run a series of steps to simulate some interaction between the agent and a user.
 */
function runSteps(instance: MockServiceDesk, steps: MockStep[]): Promise<void> {
  if (steps) {
    let totalTime = 0;
    steps.forEach((step) => {
      totalTime += step.delay || 0;
      setTimeout(() => {
        step.callback(instance);
      }, totalTime);
    });

    const lastStep = steps[steps.length - 1];

    // If the last step has some extra work to do in a Promise, then return that Promise. Otherwise, return a no-op.
    return lastStep.returnPromise || Promise.resolve();
  }
  return Promise.resolve();
}

// Immediately start a chat with no delays.
function START_CHAT_IMMEDIATELY(userName: string): MockStep[] {
  return [
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        instance.mockState.currentAgent = MOCK_AGENT_PROFILE_SHEPARD;
        instance.callback.agentJoined(MOCK_AGENT_PROFILE_SHEPARD);
        instance.sendMessageToUser(
          HELLO_TEXT(userName),
          instance.mockState.currentAgent.id,
        );
      },
    },
  ];
}

function START_CHAT_NO_INFO(
  userName: string,
  mockState: MockState,
): MockStep[] {
  return [
    {
      delay: 1000 * mockState.connectDelayFactor,
      callback: (instance: MockServiceDesk) => {
        mockState.currentAgent = MOCK_AGENT_PROFILE_SHEPARD;
        instance.callback.agentJoined(MOCK_AGENT_PROFILE_SHEPARD);
      },
    },
    {
      delay: 1000,
      callback: (instance: MockServiceDesk) => {
        instance.callback.agentTyping(true);
      },
    },
    {
      delay: 1000,
      callback: (instance: MockServiceDesk) => {
        instance.sendMessageToUser(
          HELLO_TEXT(userName),
          MOCK_AGENT_PROFILE_SHEPARD.id,
        );
      },
    },
  ];
}

function START_CHAT_CONNECT_ERROR(mockState: MockState): MockStep[] {
  return [
    {
      delay: 1000 * mockState.connectDelayFactor,
      callback: (instance: MockServiceDesk) => {
        mockState.currentAgent = MOCK_AGENT_PROFILE_SHEPARD;
        instance.callback.setErrorStatus({
          type: ErrorType.CONNECTING,
          logInfo: "Error!",
          messageToUser: "All our agents are offline",
        });
      },
    },
  ];
}

// Starts a chat with a standard sequence of events with low delays on them.
function START_CHAT(userName: string, mockState: MockState): MockStep[] {
  let availability: AgentAvailability[];

  switch (mockState?.connectInfoType) {
    case ConnectInfoType.MESSAGE: {
      availability = [
        { message: "Agent getting on a *plane*..." },
        { message: "Agent getting on a *train*..." },
        { message: "Agent getting into a *car*..." },
      ];
      break;
    }
    case ConnectInfoType.MINUTES: {
      availability = [
        { estimated_wait_time: 30 },
        { estimated_wait_time: 2 },
        { estimated_wait_time: 1 },
      ];
      break;
    }
    default: {
      availability = [
        { position_in_queue: 30 },
        { position_in_queue: 2 },
        { position_in_queue: 1 },
      ];
      break;
    }
  }

  return [
    {
      delay: 1000,
      callback: (instance: MockServiceDesk) => {
        instance.callback.updateAgentAvailability(availability[0]);
      },
    },
    {
      delay: 500 * mockState.connectDelayFactor,
      callback: (instance: MockServiceDesk) => {
        instance.callback.updateAgentAvailability(availability[1]);
      },
    },
    {
      delay: 1000 * mockState.connectDelayFactor,
      callback: (instance: MockServiceDesk) => {
        instance.callback.updateAgentAvailability(availability[2]);
      },
    },
    {
      delay: 1000,
      callback: (instance: MockServiceDesk) => {
        mockState.currentAgent = MOCK_AGENT_PROFILE_SHEPARD;
        instance.callback.agentJoined(MOCK_AGENT_PROFILE_SHEPARD);
      },
    },
    {
      delay: 1000,
      callback: (instance: MockServiceDesk) => {
        instance.callback.agentTyping(true);
      },
    },
    {
      delay: 1000,
      callback: (instance: MockServiceDesk) => {
        instance.sendMessageToUser(
          HELLO_TEXT(userName),
          mockState.currentAgent.id,
        );
      },
    },
  ];
}

// Help messages
const HELP_TEXT = `You can send me the messages below to get a specific response from me.\n\n
**text**: I will say something.
**someone else**: I will transfer you to someone not as nice as I am.
**multiple**: I will output a response with multiple items in it.
**intl**: I will output the current value for a translatable string.
**message throw**: This will throw an error while sending this message.
**hang**: The service desk will never respond to this message.
**leave**: I will leave the chat without ending it.
**video**: I will insert a video response.
**custom**: I will insert a custom response.
**markdown**: I will insert some markdown.`;

function MESSAGE_TO_AGENT_HELP(): MockStep[] {
  return [
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        instance.sendMessageToUser(
          "***These messages must be sent to an agent and not to the bot.*** \n" +
            HELP_TEXT,
          instance.mockState.currentAgent.id,
        );
        // instance.sendMessageToUser(
        //   HELP_TEXT,
        //   instance.mockState.currentAgent.id,
        // );
      },
    },
  ];
}

function MESSAGE_GARRUS_MESSAGE(): MockStep[] {
  return [
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        instance.sendMessageToUser("I'm Garrus", MOCK_AGENT_PROFILE_GARRUS.id);
      },
    },
  ];
}

function SCREEN_SHARE_REQUEST(): MockStep[] {
  return [
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        instance.callback.screenShareRequest();
      },
    },
  ];
}

function SCREEN_SHARE_END(): MockStep[] {
  return [
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        instance.callback.screenShareEnded();
      },
    },
  ];
}

function SERVER_CONNECTED(isConnected: boolean): MockStep[] {
  return [
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        instance.callback.setErrorStatus({
          type: ErrorType.DISCONNECTED,
          isDisconnected: !isConnected,
        });
      },
    },
  ];
}

function AGENT_TYPING(isTyping: boolean): MockStep[] {
  return [
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        instance.callback.agentTyping(isTyping);
      },
    },
  ];
}

function TRANSFER_TO_AGENT(agent: ResponseUserProfile): MockStep[] {
  return [
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        instance.callback.beginTransferToAnotherAgent();
      },
    },
    {
      delay: 1000,
      callback: (instance: MockServiceDesk) => {
        instance.mockState.currentAgent = agent;
        instance.callback.agentJoined(agent);
      },
    },
  ];
}

function UPDATE_IS_SUSPENDED(isSuspended: boolean): MockStep[] {
  return [
    {
      callback: (instance: MockServiceDesk) => {
        instance.chatInstance.serviceDesk.updateIsSuspended(isSuspended);
      },
    },
  ];
}

function AGENT_END_CHAT(): MockStep[] {
  return [
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        instance.callback.agentEndedChat();
      },
    },
  ];
}

// A message to the agent to respond with some simple text.
function MESSAGE_TO_AGENT_TEXT(
  text: string,
  delay = 1000,
  showTyping = true,
): MockStep[] {
  const steps: MockStep[] = [];
  if (showTyping) {
    steps.push({
      delay,
      callback: (instance: MockServiceDesk) => {
        instance.callback.agentReadMessages();
        instance.callback.agentTyping(true);
      },
    });
  }

  steps.push({
    delay,
    callback: (instance: MockServiceDesk) => {
      instance.sendMessageToUser(text, instance.mockState.currentAgent.id);
    },
  });

  return steps;
}

// A response to talk to someone else.
function TRANSFER_TO_GARRUS(): MockStep[] {
  return [
    {
      delay: 1000,
      callback: (instance: MockServiceDesk) => {
        instance.callback.agentReadMessages();
        instance.callback.agentTyping(true);
      },
    },
    {
      delay: 1000,
      callback: (instance: MockServiceDesk) => {
        instance.sendMessageToUser(
          "I thought we were getting along so well!",
          instance.mockState.currentAgent.id,
        );
      },
    },
    {
      delay: 500,
      callback: (instance: MockServiceDesk) => {
        instance.callback.agentReadMessages();
        instance.callback.agentTyping(true);
      },
    },
    {
      delay: 500,
      callback: (instance: MockServiceDesk) => {
        instance.sendMessageToUser(
          "Okay, I'll find **someone else** you can talk to.",
          instance.mockState.currentAgent.id,
        );
      },
    },
    {
      delay: 1000,
      callback: (instance: MockServiceDesk) => {
        instance.callback.beginTransferToAnotherAgent();
      },
    },
    {
      delay: 1000,
      callback: (instance: MockServiceDesk) => {
        instance.mockState.currentAgent = MOCK_AGENT_PROFILE_GARRUS;
        instance.callback.agentJoined(MOCK_AGENT_PROFILE_GARRUS);
      },
    },
    {
      delay: 1000,
      callback: (instance: MockServiceDesk) => {
        instance.callback.agentReadMessages();
        instance.callback.agentTyping(true);
      },
    },
    {
      delay: 500,
      callback: (instance: MockServiceDesk) => {
        instance.sendMessageToUser(
          "Hi! I'm **Garrus** and I'm nicer than **Shepard**!",
          instance.mockState.currentAgent.id,
        );
      },
    },
  ];
}

// A response to talk to a third agent.
function TRANSFER_TO_LEGION(): MockStep[] {
  return [
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        instance.sendMessageToUser(
          "You'll regret this.",
          instance.mockState.currentAgent.id,
        );
      },
    },
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        instance.callback.agentReadMessages();
        instance.callback.agentTyping(true);
      },
    },
    {
      delay: 1000,
      callback: (instance: MockServiceDesk) => {
        instance.mockState.currentAgent = MOCK_AGENT_PROFILE_LEGION;
        instance.callback.beginTransferToAnotherAgent(
          MOCK_AGENT_PROFILE_LEGION,
        );
        instance.callback.agentJoined(MOCK_AGENT_PROFILE_LEGION);
      },
    },
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        instance.sendMessageToUser(
          "Shepard-Commander.",
          instance.mockState.currentAgent.id,
        );
      },
    },
  ];
}

// A response to trigger the agent leaving the chat.
function MESSAGE_TO_AGENT_LEAVE_CHAT(): MockStep[] {
  return [
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        instance.sendMessageToUser(
          "I am leaving now!",
          instance.mockState.currentAgent.id,
        );
        instance.callback.agentLeftChat();
      },
    },
  ];
}

// A response to talk to an agent with no name.
function TRANSFER_TO_EMPTY(): MockStep[] {
  return [
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        instance.sendMessageToUser(
          "Transferring you to a no-name.",
          instance.mockState.currentAgent.id,
        );
        instance.mockState.currentAgent = MOCK_AGENT_PROFILE_EMPTY;
        instance.callback.agentJoined(MOCK_AGENT_PROFILE_EMPTY);
        instance.sendMessageToUser("Hi.", instance.mockState.currentAgent.id);
      },
    },
  ];
}

// A message from the user that fails.
function MESSAGE_THROW(): MockStep[] {
  return [
    {
      delay: 0,
      callback: () => {},
      returnPromise: Promise.reject(),
    },
  ];
}

function MESSAGE_VIDEO(): MockStep[] {
  return [
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        const message: MessageResponse = {
          output: {
            generic: [
              assertType<VideoItem>({
                response_type: MessageResponseTypes.VIDEO,
                title: "The video title",
                source: "https://www.youtube.com/watch?v=QuW4_bRHbUk",
                alt_text: "The video alternate text",
                description: "The video description",
              }),
            ],
          },
        };

        instance.sendMessageToUser(message, instance.mockState.currentAgent.id);
      },
    },
  ];
}

// A custom response.
function MESSAGE_CUSTOM(): MockStep[] {
  return [
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        const message: MessageResponse = {
          output: {
            generic: [
              assertType<TextItem>({
                response_type: MessageResponseTypes.TEXT,
                text: "Below is a custom response but you may not see it if no handler has been created.",
              }),
              assertType<UserDefinedItem>({
                response_type: MessageResponseTypes.USER_DEFINED,
                user_defined: {
                  user_defined_type: "green",
                  text: "This is a user_defined response.",
                },
              }),
            ],
          },
        };

        instance.sendMessageToUser(message, instance.mockState.currentAgent.id);
      },
    },
  ];
}

function MESSAGE_TO_AGENT_MULTIPLE(): MockStep[] {
  return [
    {
      delay: 0,
      callback: (instance: MockServiceDesk) => {
        const message: MessageResponse = {
          output: {
            generic: [
              {
                response_type: MessageResponseTypes.TEXT,
                text: "This is a text item in this response.",
              },
              {
                response_type: MessageResponseTypes.TEXT,
                text: "This is a second text item.",
              },
            ],
          },
        };

        instance.sendMessageToUser(message, instance.mockState.currentAgent.id);
      },
    },
  ];
}

// A message from the user that hangs.
function HANG_MESSAGE(): MockStep[] {
  return [
    {
      delay: 0,
      callback: () => {},
      returnPromise: new Promise<void>(() => {}),
    },
  ];
}

export {
  MockServiceDesk,
  MockPreStartChatPayload,
  MockPreEndChatPayload,
  ConnectInfoType,
  MockStep,
  runSteps,
  MOCK_AGENT_PROFILE_GARRUS,
  MOCK_AGENT_PROFILE_SHEPARD,
  MOCK_AGENT_PROFILE_LEGION,
  MOCK_AGENT_PROFILE_EMPTY,
  MESSAGE_TO_AGENT_MULTIPLE,
  MESSAGE_TO_AGENT_TEXT,
  MESSAGE_VIDEO,
  MESSAGE_CUSTOM,
  MESSAGE_GARRUS_MESSAGE,
  SCREEN_SHARE_REQUEST,
  SCREEN_SHARE_END,
  SERVER_CONNECTED,
  AGENT_END_CHAT,
  TRANSFER_TO_AGENT,
  AGENT_TYPING,
  UPDATE_IS_SUSPENDED,
};
