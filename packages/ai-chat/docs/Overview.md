---
title: Overview
---

## Overview

Carbon AI Chat is a backend-agnostic chat UI designed for modern AI-based flows. This page shows you how to install it, configure it, and connect it to your server.

Try our [demo](../../demo/index.html), which shows the full-featured chat interface with its many customization options and response types.

## Using the API

### Picking your component

This package provides both React and web component versions of Carbon AI Chat. Each framework exports two versions. One uses a float layout — the classic launcher with the chat in the lower-right corner for customer service use cases. The other renders the chat into a container element you choose (sidebar, fullscreen, and so on), growing responsively to fill it.

See the [React](./React.md) and [web component](./WebComponent.md) docs. Angular is supported through the web component version — see the [Angular](./Angular.md) docs for the framework-specific wiring.

## Configuration

Each component accepts {@link PublicConfig} options as props that control how the chat looks and behaves before your users see it. Set where the chat renders along with its size, frame, and corners ({@link LayoutConfig}); choose which surfaces appear — the {@link LauncherConfig launcher} (IBM's or your own), {@link HeaderConfig header}, {@link HomeScreenConfig home screen}, and {@link InputConfig input}; control how the chat reaches your server ({@link PublicConfigMessaging}); and set its theme, language, and assistant identity. See {@link PublicConfig} for every option.

## Instance methods

You get the {@link ChatInstance} from the {@link ChatContainerProps.onBeforeRender} callback, which the chat calls with the instance before it renders. Each instance provides imperative runtime methods your website can call any time after the instance is available. These methods aren't attributes or props — they affect internal or shared chat state.

Use the instance to add, update, and remove messages ({@link ChatInstanceMessaging}); open, close, or switch the chat view ({@link ChatInstance.changeView}); read or seed the input field ({@link ChatInstanceInput}); subscribe to events ({@link EventHandlers.on}); hand off to a human agent ({@link ChatInstanceServiceDeskActions}); and render your own content into the chat's slots ({@link WriteableElements}). See {@link ChatInstance} for the full API.

## Events

The Carbon AI Chat fires {@link BusEvent events} throughout its life cycle. Subscribe with {@link EventHandlers.on} to react to messages received ({@link BusEventType.RECEIVE}), the chat opening or closing ({@link BusEventType.VIEW_CHANGE}), user feedback ({@link BusEventType.FEEDBACK}), and human-agent handoff. Many events also fire in a `pre:` form the chat awaits before it acts ({@link BusEventType.PRE_SEND}), so a handler can inspect, change, or cancel what happens next. See {@link BusEvent} for every event.

## Connecting to your server

The Carbon AI Chat can send messages to your server and retrieve conversations from it. It supports both streamed and non-streamed responses.

For details, see the [connect to your server](./CustomServer.md) guide.

## Customizing the view

Customize Carbon AI Chat at three levels, from the quickest to the most involved:

- **Configure** — set behavior and appearance through {@link PublicConfig} props.
- **Restyle** — apply a Carbon [theme](./Theming.md) and override CSS custom-property tokens for color, sizing, and placement.
- **Inject your own content** — render your own markup into [slots](./WriteableElements.md), [custom panels](./CustomPanels.md), [responses](./Responses.md), and [message footers](./CustomMessageFooter.md).

See [UI customization](./Customization.md).

## Service desks

Add human agent support with a [service desk](./CustomServiceDesks.md) integration.

## Accessibility

Carbon AI Chat targets [Web Content Accessibility 2.2 Level AA](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) and [CI 162](https://ibm.biz/IBMCHS162) compliance by end of 2026. Check the current status in the [IBM Accessibility Compliance System](https://able.ibm.com/acs/record/41d02b48-a930-4e17-b6f5-661297349650/dashboard).

## Internationalization

Translate built-in text, format dates for a region, and support right-to-left languages. See [Internationalization](./Internationalization.md).

## Cookies and GDPR

The Carbon AI Chat does not use any cookies. It uses the browser's temporary session storage for required behavior to track the Carbon AI Chat's state as you move from page to page — for example, whether the home screen should be visible, and so on.

## Related

- [Using with React](./React.md) — render the chat in React.
- [Using as a Web component](./WebComponent.md) — render the chat as a custom element.
- [Server communication](./CustomServer.md) — send messages and load conversations.
- [UI customization](./Customization.md) — theme the chat, control its layout, and inject your own content into slots, panels, responses, and footers.
- [Service desks](./CustomServiceDesks.md) — hand off to a human agent.
- [Internationalization](./Internationalization.md) — translate text, format for a region, and support RTL.
