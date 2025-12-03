/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  CarbonTheme,
  ChatContainer,
  PublicConfig,
  ServiceDesk,
  ServiceDeskFactoryParameters,
} from "@carbon/ai-chat";
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { customSendMessage } from "./customSendMessage";
import { MockServiceDesk } from "./mockServiceDesk";

/**
 * The serviceDeskFactory is a special property. If its value changes, the service desk must be restarted and any
 * active conversations will be disconnected. Ideally, you will create your factory method outside of React and
 * be able to pass in a statically defined value as in the commented out example below defining the `serviceDeskFactory` const.
 *
 * However, you may need to pass in user data at runtime and need to include the creation of the `serviceDeskFactory`
 * inside your React code. In that case, you will want to make use of useMemo to ensure the serviceDeskFactory is only
 * re-created when you absolutely have to. Ideally, you are able to
 */

// const serviceDeskFactory = (parameters: ServiceDeskFactoryParameters) => Promise.resolve(new MockServiceDesk(parameters) as ServiceDesk);

interface UserData {
  name: string;
  id: string;
}

interface ChatProps {
  data?: UserData;
}

function Chat(props: ChatProps) {
  /**
   * If your serviceDeskFactory can't be statically defined, be sure to wrap it in useMemo and be careful about when you update it.
   *
   * When you update it any active chat with a live agent will be cancelled as the service reboots with your new factory.
   */
  const serviceDeskFactory = useMemo(() => {
    console.log({ data: props.data });
    const factory = (parameters: ServiceDeskFactoryParameters) => {
      return Promise.resolve(new MockServiceDesk(parameters) as ServiceDesk);
    };
    return factory;
  }, [props.data]);

  const config: PublicConfig = {
    messaging: {
      customSendMessage,
    },
    serviceDeskFactory,
    injectCarbonTheme: CarbonTheme.WHITE,
  };

  return <ChatContainer {...config} />;
}

function App() {
  const [data, setData] = useState<UserData>();

  // Mocking updating the user data in your React application.
  useEffect(() => {
    setTimeout(() => {
      setData({ name: "Bob", id: "1234" });
    }, 5000);
  }, []);

  return <Chat data={data} />;
}

const root = createRoot(document.querySelector("#root") as Element);

root.render(<App />);
