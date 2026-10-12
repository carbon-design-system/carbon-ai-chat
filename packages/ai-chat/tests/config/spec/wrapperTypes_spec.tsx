/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Pins the public call signatures of the two React wrappers: their props, the
 * DOM attributes each forwards, both lifecycle callbacks, and all five render
 * props. Changing how the wrappers mount must not change what a host can pass.
 *
 * The assertions are compile-time. If one fails, ts-jest reports a compilation
 * error and fails this file.
 */

import React, { type HTMLAttributes, type MouseEvent } from 'react';

import { ChatContainer } from '../../../src/react/ChatContainer';
import {
  ChatCustomElement,
  ChatCustomElementProps,
} from '../../../src/react/ChatCustomElement';
import { ChatContainerProps } from '../../../src/types/component/ChatContainer';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type AssertTrue<T extends true> = T;

type ContainerProps = Parameters<typeof ChatContainer>[0];
type CustomElementProps = Parameters<typeof ChatCustomElement>[0];
type Lifecycle = (instance: ChatInstance) => Promise<void> | void;

type _ContainerSignature = AssertTrue<
  Equals<
    ContainerProps,
    ChatContainerProps &
      Omit<HTMLAttributes<HTMLElement>, keyof ChatContainerProps>
  >
>;
type _CustomElementSignature = AssertTrue<
  Equals<
    CustomElementProps,
    ChatCustomElementProps &
      Omit<HTMLAttributes<HTMLDivElement>, keyof ChatCustomElementProps>
  >
>;

type _BeforeRender = AssertTrue<
  Equals<ChatContainerProps['onBeforeRender'], Lifecycle | undefined>
>;
type _AfterRender = AssertTrue<
  Equals<ChatContainerProps['onAfterRender'], Lifecycle | undefined>
>;

type _CustomElementExtendsContainer = AssertTrue<
  ChatCustomElementProps extends ChatContainerProps ? true : false
>;
type _ClassNameRequired = AssertTrue<
  Equals<ChatCustomElementProps['className'], string>
>;
type _ClickTargetsDiv = AssertTrue<
  Equals<
    Parameters<NonNullable<CustomElementProps['onClick']>>[0],
    MouseEvent<HTMLDivElement>
  >
>;

/** Call sites a host writes today. Each must keep compiling. */
function hostCallSites() {
  const onDivClick = (event: MouseEvent<HTMLDivElement>) => event.currentTarget;
  const onHostClick = (event: MouseEvent<HTMLElement>) => event.currentTarget;
  const lifecycle = async (instance: ChatInstance) => {
    await instance.messaging.clearConversation();
  };

  return [
    <ChatContainer
      key="container"
      id="chat"
      className="chat"
      aria-label="Chat"
      onClick={onHostClick}
      onBeforeRender={lifecycle}
      onAfterRender={lifecycle}
      renderUserDefinedResponse={(state, instance) => (
        <button type="button" onClick={instance.requestFocus}>
          {state.fullMessage?.id}:{state.messageItem?.response_type}:
          {state.partialItems?.length}
        </button>
      )}
      renderUserDefinedInputNode={({ node, message }, instance) => (
        <button type="button" onClick={instance.requestFocus}>
          {node.type}:{message.input.text}
        </button>
      )}
      renderCustomMessageFooter={(slot, message, item, instance, data) => (
        <button type="button" id={slot} onClick={instance.requestFocus}>
          {message.output.generic.length}:{item.response_type}:
          {String(data?.label)}
        </button>
      )}
      renderCustomRequestFooter={(slot, message, instance) => (
        <button type="button" id={slot} onClick={instance.requestFocus}>
          {message.input.text}
        </button>
      )}
      renderWriteableElements={{ welcomeNodeBeforeElement: <p>Hi</p> }}
    />,
    <ChatCustomElement
      key="custom"
      className="chat"
      id="chat"
      aria-label="Chat"
      onClick={onDivClick}
      onBeforeRender={lifecycle}
      onAfterRender={() => undefined}
    />,
    // @ts-expect-error className sizes the host and stays required.
    <ChatCustomElement key="missing-class" />,
  ];
}

describe('React wrapper public signatures', () => {
  it('keeps the host call sites compiling', () => {
    expect(hostCallSites()).toHaveLength(3);
  });
});
