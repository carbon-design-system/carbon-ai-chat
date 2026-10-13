/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  ChatInstance,
  CustomSendMessageOptions,
  MessageRequest,
} from '@carbon/ai-chat';

import { doAudioSoundCloud, doAudioMp3 } from './doAudio';
import { doButton } from './doButton';
import { doCard } from './doCard';
import { doPreviewCard } from './doPreviewCard';
import { doCarousel } from './doCarousel';
import { doCode, doCodeStreaming } from './doCode';
import {
  doConversationalSearch,
  doConversationalSearchStreaming,
} from './doConversationalSearch';
import { doDate } from './doDate';
import { doError } from './doError';
import { doGrid } from './doGrid';
import { doHumanAgent } from './doHumanAgent';
import { doIFrame } from './doIFrame';
import { doImage } from './doImage';
import { doList } from './doList';
import { doOption } from './doOption';
import { doOrderedList } from './doOrderedList';
import { doTable, doTableStreaming } from './doTable';
import {
  doHTML,
  doHTMLStreaming,
  doText,
  doTextChainOfThought,
  doTextChainOfThoughtStreaming,
  doTextStreaming,
  doTextStreamingEarlyResolve,
  doTextStreamingWithNonWatsonAssistantProfile,
  doTextWithFeedback,
  doTextWithFeedbackStreaming,
  doTextWithHumanProfile,
  doTextWithNonWatsonAssistantProfile,
  doTextWithReasoningStepsStreaming,
  doTextWithReasoningTraceStreaming,
  doTextWithWatsonAgentProfile,
} from './doText';
import { doUserDefined, doUserDefinedStreaming } from './doUserDefined';
import { doSystemMessage } from './doSystemMessage';
import { doVideoYouTube, doVideoVimeo, doVideoKaltura } from './doVideo';

const sortResponseMap = <T extends Record<string, unknown>>(map: T): T =>
  Object.fromEntries(
    Object.entries(map).sort(([leftKey], [rightKey]) =>
      leftKey.localeCompare(rightKey)
    )
  ) as T;

const RESPONSE_MAP: Record<
  string,
  (
    instance: ChatInstance,
    requestOptions?: CustomSendMessageOptions,
    requestID?: MessageRequest['id']
  ) => Promise<void> | void
> = sortResponseMap({
  'audio - soundcloud': (instance, _requestOptions, requestID) =>
    doAudioSoundCloud(instance, requestID),
  'audio - mp3': (instance, _requestOptions, requestID) =>
    doAudioMp3(instance, requestID),
  button: (instance, _requestOptions, requestID) =>
    doButton(instance, requestID),
  card: (instance, _requestOptions, requestID) => doCard(instance, requestID),
  'workspace preview card (open start)': (
    instance,
    _requestOptions,
    requestID
  ) => doPreviewCard(instance, 'start', requestID),
  'workspace preview card (open end)': (instance, _requestOptions, requestID) =>
    doPreviewCard(instance, 'end', requestID),
  carousel: (instance, _requestOptions, requestID) =>
    doCarousel(instance, requestID),
  code: (instance, _requestOptions, requestID) => doCode(instance, requestID),
  'code (stream)': (instance, requestOptions, requestID) =>
    doCodeStreaming(instance, requestOptions, requestID),
  'conversational search': (instance, _requestOptions, requestID) =>
    doConversationalSearch(instance, requestID),
  'conversational search (stream)': (instance, requestOptions, requestID) =>
    doConversationalSearchStreaming(
      instance,
      undefined,
      requestOptions,
      requestID
    ),
  date: (instance, _requestOptions, requestID) => doDate(instance, requestID),
  grid: (instance, _requestOptions, requestID) => doGrid(instance, requestID),
  'human agent': (instance, _requestOptions, requestID) =>
    doHumanAgent(instance, requestID),
  iframe: (instance, _requestOptions, requestID) =>
    doIFrame(instance, requestID),
  'inline error': (instance, _requestOptions, requestID) =>
    doError(instance, requestID),
  image: (instance, _requestOptions, requestID) => doImage(instance, requestID),
  'unordered list': (instance, _requestOptions, requestID) =>
    doList(instance, requestID),
  'option list': (instance, _requestOptions, requestID) =>
    doOption(instance, requestID),
  'ordered list': (instance, _requestOptions, requestID) =>
    doOrderedList(instance, requestID),
  'system message (inline)': (instance, _requestOptions, requestID) =>
    doSystemMessage(instance, true, undefined, requestID),
  'system message (stand alone, default variant)': (
    instance,
    _requestOptions,
    requestID
  ) => doSystemMessage(instance, false, 'default', requestID),
  'system message (stand alone, date variant)': (
    instance,
    _requestOptions,
    requestID
  ) => doSystemMessage(instance, false, 'date', requestID),
  'system message (stand alone, agent variant)': (
    instance,
    _requestOptions,
    requestID
  ) => doSystemMessage(instance, false, 'agent', requestID),
  table: (instance, _requestOptions, requestID) => doTable(instance, requestID),
  'table (stream)': (instance, requestOptions, requestID) =>
    doTableStreaming(instance, requestOptions, requestID),
  text: (instance, _requestOptions, requestID) =>
    doText(
      instance,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      requestID
    ),
  'text (stream)': (instance, requestOptions, requestID) =>
    doTextStreaming(
      instance,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      requestOptions,
      requestID
    ),
  'text (stream early resolve)': (instance, requestOptions, requestID) =>
    doTextStreamingEarlyResolve(instance, requestOptions, requestID),
  'text with feedback': (instance, _requestOptions, requestID) =>
    doTextWithFeedback(instance, requestID),
  'text with feedback (stream)': (instance, requestOptions, requestID) =>
    doTextWithFeedbackStreaming(instance, requestOptions, requestID),
  'text from watsonx agent': (instance, _requestOptions, requestID) =>
    doTextWithWatsonAgentProfile(instance, undefined, undefined, requestID),
  'text from third party human': (instance, _requestOptions, requestID) =>
    doTextWithHumanProfile(instance, undefined, undefined, requestID),
  'text from third party bot': (instance, _requestOptions, requestID) =>
    doTextWithNonWatsonAssistantProfile(
      instance,
      undefined,
      undefined,
      requestID
    ),
  'text (stream) from third party bot': (instance, requestOptions, requestID) =>
    doTextStreamingWithNonWatsonAssistantProfile(
      instance,
      undefined,
      undefined,
      undefined,
      requestOptions,
      requestID
    ),
  'text with chain of thought': (instance, _requestOptions, requestID) =>
    doTextChainOfThought(instance, undefined, undefined, undefined, requestID),
  'text (stream) with chain of thought': (
    instance,
    requestOptions,
    requestID
  ) =>
    doTextChainOfThoughtStreaming(
      instance,
      undefined,
      undefined,
      undefined,
      undefined,
      requestOptions,
      requestID
    ),
  'text (stream) with reasoning steps': (instance, requestOptions, requestID) =>
    doTextWithReasoningStepsStreaming(instance, requestOptions, requestID),
  'text (stream) with single reasoning trace': (
    instance,
    requestOptions,
    requestID
  ) => doTextWithReasoningTraceStreaming(instance, requestOptions, requestID),
  'text (delayed response)': async (instance, requestOptions, requestID) => {
    const signal = requestOptions?.signal;

    // Check if already aborted
    if (signal?.aborted) {
      return;
    }

    instance.updateIsMessageLoadingCounter('increase', 'Thinking...');

    // Return a Promise that resolves when the work is done or canceled
    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // Double-check signal wasn't aborted during delay
        if (signal?.aborted) {
          instance.updateIsMessageLoadingCounter('decrease');
          reject(new Error('Aborted'));
          return;
        }
        instance.updateIsMessageLoadingCounter('decrease');
        doText(
          instance,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          requestID
        );
        resolve();
      }, 3000);

      // Cancel timeout if signal is aborted
      const abortHandler = () => {
        clearTimeout(timeoutId);
        instance.updateIsMessageLoadingCounter('decrease');
        reject(new Error('Aborted'));
      };
      signal?.addEventListener('abort', abortHandler, { once: true });
    });
  },
  'text (delayed streaming response)': async (
    instance,
    requestOptions,
    requestID
  ) => {
    const signal = requestOptions?.signal;

    // Check if already aborted
    if (signal?.aborted) {
      return;
    }

    instance.updateIsMessageLoadingCounter('increase', 'Thinking...');

    // Return a Promise that resolves when the work is done or canceled
    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        // Double-check signal wasn't aborted during delay
        if (signal?.aborted) {
          instance.updateIsMessageLoadingCounter('decrease');
          reject(new Error('Aborted'));
          return;
        }
        instance.updateIsMessageLoadingCounter('decrease');
        try {
          await doTextStreaming(
            instance,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            requestOptions,
            requestID
          );
          resolve();
        } catch (error) {
          reject(error);
        }
      }, 3000);

      // Cancel timeout if signal is aborted
      const abortHandler = () => {
        clearTimeout(timeoutId);
        instance.updateIsMessageLoadingCounter('decrease');
        reject(new Error('Aborted'));
      };
      signal?.addEventListener('abort', abortHandler, { once: true });
    });
  },
  'text (consecutive responses)': (instance, _requestOptions, requestID) => {
    instance.updateIsMessageLoadingCounter('increase', 'Thinking...');
    setTimeout(() => {
      instance.updateIsMessageLoadingCounter('decrease');
      doTextWithFeedback(instance, requestID);
      setTimeout(() => {
        doTextWithFeedback(instance, requestID);
      }, 1000);
    }, 3000);
  },
  html: (instance, _requestOptions, requestID) =>
    doHTML(instance, undefined, undefined, undefined, requestID),
  'html (stream)': (instance, requestOptions, requestID) =>
    doHTMLStreaming(
      instance,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      requestOptions,
      requestID
    ),
  user_defined: (instance, _requestOptions, requestID) =>
    doUserDefined(instance, requestID),
  'user_defined (stream)': (instance, requestOptions, requestID) =>
    doUserDefinedStreaming(instance, requestOptions, requestID),
  'video - youtube': (instance, _requestOptions, requestID) =>
    doVideoYouTube(instance, requestID),
  'video - vimeo': (instance, _requestOptions, requestID) =>
    doVideoVimeo(instance, requestID),
  'video - kaltura': (instance, _requestOptions, requestID) =>
    doVideoKaltura(instance, requestID),
});

export { RESPONSE_MAP };
