# CdsAiChatContainerAttributes

- Kind: Interface
- Category: Web component
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html

Attributes interface for the cds-aichat-container web component.
This interface extends PublicConfig with additional component-specific props,
flattening all config properties as top-level properties for better TypeScript IntelliSense.

## Signature

```ts
interface CdsAiChatContainerAttributes
```

## Members

### aiEnabled

`aiEnabled?: boolean`

Enables Carbon AI theme styling. Defaults to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#aienabled)

### assistantAvatarUrl

`assistantAvatarUrl?: string`

Sets the URL pointing to a custom avatar for the response author. This image should be a square. If not provided, the default Watsonx icon will be used.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#assistantavatarurl)

### assistantName

`assistantName?: string`

Sets the name of the assistant. Defaults to "watsonx". Used in screen reader announcements and error messages.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#assistantname)

### debug

`debug?: boolean`

Add a bunch of noisy console.log messages!

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#debug)

### disableCustomElementMobileEnhancements

`disableCustomElementMobileEnhancements?: boolean`

This value is only used when a custom element is being used to render the widget. By default, a number of
enhancements to the widget are activated on mobile devices which can interfere with a custom element. This
value can be used to disable those enhancements while using a custom element.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#disablecustomelementmobileenhancements)

### disclaimer

`disclaimer?: DisclaimerPublicConfig`

Disclaimer screen configuration.

If `disclaimerHTML` changes after the disclaimer has been accepted, we request a user to accept again.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#disclaimer)

### header

`header?: HeaderConfig`

Extra config for controlling the behavior of the header.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#header)

### hideAvatar

`hideAvatar?: boolean`

Toggles the chat avatar on and off

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#hideavatar)

### history

`history?: HistoryConfig`

The config object for chat history.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#history)

### homescreen

`homescreen?: HomeScreenConfig`

Configuration for the homescreen.

If you change anything but `is_on` after the chat session has started, the chat will handle it gracefully.

If you turn on the homescreen after the user has already started chatting, it will show up in the header as
an icon, but the user won't be forced to go back to the homescreen (unlike turning on the disclaimer mid-chat).

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#homescreen)

### injectCarbonTheme

`injectCarbonTheme?: CarbonTheme`

Which Carbon theme tokens to inject. If unset (falsy), the chat inherits tokens from the host page.
Set to a specific theme to force token injection.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#injectcarbontheme)

### input

`input?: InputConfig`

Configuration for the main input field on the chat.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#input)

### isReadonly

`isReadonly?: boolean`

Sets the chat into a read only mode for displaying old conversations.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#isreadonly)

### keyboardShortcuts

`keyboardShortcuts?: KeyboardShortcuts`

**Experimental.**

Configuration for keyboard shortcuts in the chat.
Allows customization of keyboard shortcuts for various actions.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#keyboardshortcuts)

### launcher

`launcher?: LauncherConfig`

Configuration for the launcher.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#launcher)

### layout

`layout?: LayoutConfig`

The config object for changing Carbon AI Chat's layout.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#layout)

### locale

`locale?: string`

The locale to use for the widget. This controls the language pack and regional formatting.
Example values include: 'en', 'en-us', 'fr', 'es'.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#locale)

### markdown

`markdown?: WCMarkdown`

**Experimental.**

Markdown rendering customization. Extends the framework-neutral
`PublicConfig.markdown` with web-component `customRenderers`.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#markdown)

### messaging

`messaging?: PublicConfigMessaging`

Config options for controlling messaging.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#messaging)

### namespace

`namespace?: string`

An optional namespace that can be added to the Carbon AI Chat that must be 30 characters or under. This value is
intended to enable multiple instances of the Carbon AI Chat to be used on the same page. The namespace for this web
chat. This value is used to generate a value to append to anything unique (id, session keys, etc) to allow
multiple Carbon AI Chats on the same page.

Note: this value is used in the aria region label for the Carbon AI Chat. This means this value will be read out loud
by users using a screen reader.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#namespace)

### onAfterRender

`onAfterRender?: (instance: ChatInstance) => void | Promise<void>`

This function is called after the render function of Carbon AI Chat is called.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#onafterrender)

### onBeforeRender

`onBeforeRender?: (instance: ChatInstance) => void | Promise<void>`

This function is called before the render function of Carbon AI Chat is called. This function can return a Promise
which will cause Carbon AI Chat to wait for it before rendering.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#onbeforerender)

### onError

`onError?: (data: OnErrorData) => void`

This is a one-off listener for catastrophic errors. This is used instead of a normal event bus handler because this function can be
defined and called before the event bus has been created.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#onerror)

### onViewChange

`onViewChange?: (event: BusEventViewChange, instance: ChatInstance) => void`

Called when a view change (the chat opening or closing) is complete. This is an opt-in observation hook
with no default visibility behavior.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#onviewchange)

### onViewPreChange

`onViewPreChange?: (event: BusEventViewPreChange) => void | Promise<void>`

Called before a view change (the chat opening or closing). Async — return a Promise to defer the view
change until it resolves. This is an opt-in observation hook with no default visibility behavior.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#onviewprechange)

### openChatByDefault

`openChatByDefault?: boolean`

By default, the chat window will be rendered in a "closed" state.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#openchatbydefault)

### persistFeedback

`persistFeedback?: boolean`

Allows for feedback to persist in all messages, not just the latest message.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#persistfeedback)

### persistedState

`persistedState?: PersistedStateConfig`

Hands session-state persistence to the host page. By default the chat persists session state to
the browser's `sessionStorage`; set this to boot from your own
PersistedStateConfig.initialState and receive changes via
PersistedStateConfig.onStateChange instead. See PersistedStateConfig.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#persistedstate)

### renderCustomMessageFooter

`renderCustomMessageFooter?: WCRenderCustomMessageFooter`

Optional callback to render custom message footers. When provided, the library manages all event listening,
slot tracking, and element lifecycle. When omitted, the legacy event + manual slot approach continues to work.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#rendercustommessagefooter)

### renderUserDefinedResponse

`renderUserDefinedResponse?: WCRenderUserDefinedResponse`

Optional callback to render user defined responses. When provided, the library manages all event listening,
slot tracking, streaming state, and element lifecycle.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#renderuserdefinedresponse)

### serviceDesk

`serviceDesk?: ServiceDeskPublicConfig`

Any public config to apply to service desks.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#servicedesk)

### serviceDeskFactory

`serviceDeskFactory?: (parameters: ServiceDeskFactoryParameters) => Promise<ServiceDesk>`

This is a factory for producing custom implementations of service desks. If this value is set, then this will
be used to create an instance of a ServiceDesk when the user attempts to connect to an agent.

If it is changed in the middle of a conversation (you should obviously avoid this) the conversation with the
human agent will be disconnected.

This factory is compared by reference. Provide a stable reference (for example
a module-level function or a memoized `useCallback`); a new function identity
on every render is treated as a change and, while an agent chat is active, tears
down and rebuilds the service desk connection.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#servicedeskfactory)

### shouldSanitizeHTML

`shouldSanitizeHTML?: boolean`

Indicates if Carbon AI Chat should sanitize HTML from the assistant.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#shouldsanitizehtml)

### shouldTakeFocusIfOpensAutomatically

`shouldTakeFocusIfOpensAutomatically?: boolean`

If the Carbon AI Chat should grab focus if the chat is open on page load.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#shouldtakefocusifopensautomatically)

### strings

`strings?: DeepPartial<LanguagePack>`

Optional partial language pack overrides. Values merge with defaults.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#strings)

### upload

`upload?: UploadConfig`

**Experimental.**

Configuration for file upload behavior in the chat input.
When `is_on` is `true`, the chat renders a file attachment button in the input area.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.CdsAiChatContainerAttributes.html#upload)

## Related

- [PublicConfig](./PublicConfig.md)
