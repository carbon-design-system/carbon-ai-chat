# ChatCustomElementProps

- Kind: Interface
- Category: React
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html

Properties for the ChatContainer React component. This interface extends
ChatContainerProps and PublicConfig with additional component-specific props, flattening all
config properties as top-level props for better TypeScript IntelliSense.

## Signature

```ts
interface ChatCustomElementProps
```

## Members

### aiEnabled

`aiEnabled?: boolean`

Enables Carbon AI theme styling. Defaults to true.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#aienabled)

### assistantAvatarUrl

`assistantAvatarUrl?: string`

Sets the URL pointing to a custom avatar for the response author. This image should be a square. If not provided, the default Watsonx icon will be used.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#assistantavatarurl)

### assistantName

`assistantName?: string`

Sets the name of the assistant. Defaults to "watsonx". Used in screen reader announcements and error messages.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#assistantname)

### className

`className: string`

A CSS class name that will be added to the custom element. This class must define the size of the
your custom element (width and height or using logical inline-size/block-size).

You can make use of onViewPreChange and/or onViewChange to mutate this className value so have open/close animations.

By default, the chat will just set the chat shell to a 0x0 size and mark everything but the launcher (is you are using it)
as display: none; if the chat is set to closed.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#classname)

### debug

`debug?: boolean`

Add a bunch of noisy console.log messages!

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#debug)

### disableCustomElementMobileEnhancements

`disableCustomElementMobileEnhancements?: boolean`

This value is only used when a custom element is being used to render the widget. By default, a number of
enhancements to the widget are activated on mobile devices which can interfere with a custom element. This
value can be used to disable those enhancements while using a custom element.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#disablecustomelementmobileenhancements)

### disclaimer

`disclaimer?: DisclaimerPublicConfig`

Disclaimer screen configuration.

If `disclaimerHTML` changes after the disclaimer has been accepted, we request a user to accept again.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#disclaimer)

### header

`header?: HeaderConfig`

Extra config for controlling the behavior of the header.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#header)

### hideAvatar

`hideAvatar?: boolean`

Toggles the chat avatar on and off

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#hideavatar)

### history

`history?: HistoryConfig`

The config object for chat history.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#history)

### homescreen

`homescreen?: HomeScreenConfig`

Configuration for the homescreen.

If you change anything but `is_on` after the chat session has started, the chat will handle it gracefully.

If you turn on the homescreen after the user has already started chatting, it will show up in the header as
an icon, but the user won't be forced to go back to the homescreen (unlike turning on the disclaimer mid-chat).

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#homescreen)

### id

`id?: string`

An optional id that will be added to the custom element.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#id)

### injectCarbonTheme

`injectCarbonTheme?: CarbonTheme`

Which Carbon theme tokens to inject. If unset (falsy), the chat inherits tokens from the host page.
Set to a specific theme to force token injection.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#injectcarbontheme)

### input

`input?: InputConfig`

Configuration for the main input field on the chat.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#input)

### isReadonly

`isReadonly?: boolean`

Sets the chat into a read only mode for displaying old conversations.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#isreadonly)

### keyboardShortcuts

`keyboardShortcuts?: KeyboardShortcuts`

**Experimental.**

Configuration for keyboard shortcuts in the chat.
Allows customization of keyboard shortcuts for various actions.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#keyboardshortcuts)

### launcher

`launcher?: LauncherConfig`

Configuration for the launcher.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#launcher)

### layout

`layout?: LayoutConfig`

The config object for changing Carbon AI Chat's layout.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#layout)

### locale

`locale?: string`

The locale to use for the widget. This controls the language pack and regional formatting.
Example values include: 'en', 'en-us', 'fr', 'es'.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#locale)

### markdown

`markdown?: ChatContainerPropsMarkdown`

**Experimental.**

Markdown rendering customization. Extends the framework-neutral
PublicConfigMarkdown with React-layer custom renderers.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#markdown)

### messaging

`messaging?: PublicConfigMessaging`

Config options for controlling messaging.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#messaging)

### namespace

`namespace?: string`

An optional namespace that can be added to the Carbon AI Chat that must be 30 characters or under. This value is
intended to enable multiple instances of the Carbon AI Chat to be used on the same page. The namespace for this web
chat. This value is used to generate a value to append to anything unique (id, session keys, etc) to allow
multiple Carbon AI Chats on the same page.

Note: this value is used in the aria region label for the Carbon AI Chat. This means this value will be read out loud
by users using a screen reader.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#namespace)

### onAfterRender

`onAfterRender?: (instance: ChatInstance) => void | Promise<void>`

This function is called after the render function of Carbon AI Chat is called. This function can return a Promise
which will cause Carbon AI Chat to wait for it before rendering.

Like ChatContainerProps.onBeforeRender, it receives the ChatInstance; use it when you need the
instance only after the first render has completed.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#onafterrender)

### onBeforeRender

`onBeforeRender?: (instance: ChatInstance) => void | Promise<void>`

This function is called before the render function of Carbon AI Chat is called. This function can return a Promise
which will cause Carbon AI Chat to wait for it before rendering.

Use it to capture the ChatInstance so you can call instance methods later.

## Examples

```tsx
function App() {
  const [instance, setInstance] = useState<ChatInstance | null>(null);
  return (
    <ChatContainer
      onBeforeRender={(chat) => setInstance(chat)}
      messaging={messaging}
    />
  );
}
```

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#onbeforerender)

### onError

`onError?: (data: OnErrorData) => void`

This is a one-off listener for catastrophic errors. This is used instead of a normal event bus handler because this function can be
defined and called before the event bus has been created.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#onerror)

### onViewChange

`onViewChange?: (event: BusEventViewChange, instance: ChatInstance) => void`

Called when the chat view change is complete. If no callback is provided here, the default behavior will be to set
the chat shell to 0x0 size and set all inner contents aside from the launcher, if you are using it, to display: none.
The inner contents of the chat shell (aside from the launcher if you are using it) are always set to display: none
regardless of what is configured with this callback to prevent invisible tab stops and screen reader issues.

Use this callback to update your className value when the chat has finished being opened or closed.

You can provide a different callback here if you want custom animation behavior when the chat is opened or closed.
The animation behavior defined here will run in concert with the chat inside your custom container being hidden.

If you want to run animations before the inner contents of the chat shell is shrunk and the inner contents are hidden,
make use of onViewPreChange.

A common pattern is to use this for when the chat is opening and to use onViewPreChange for when the chat closes.

Note that this function can only be provided before Carbon AI Chat is loaded as it is registered before the
chat renders. After Carbon AI Chat is loaded, the callback will not be updated.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#onviewchange)

### onViewPreChange

`onViewPreChange?: (event: BusEventViewPreChange, instance: ChatInstance) => void | Promise<void>`

Called before a view change (chat opening/closing). The chat will hide the chat shell inside your custom element
to prevent invisible keyboard stops when the view change is *complete*.

Use this callback to update your className value *before* the view change happens if you want to add any open/close
animations to your custom element before the chat shell inner contents are hidden. It is async and so you can
tie it to native the AnimationEvent and only return when your animations have completed.

A common pattern is to use this for when the chat is closing and to use onViewChange for when the chat opens.

Note that this function can only be provided before Carbon AI Chat is loaded as it is registered before the
chat renders. After Carbon AI Chat is loaded, the callback will not be updated.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#onviewprechange)

### openChatByDefault

`openChatByDefault?: boolean`

By default, the chat window will be rendered in a "closed" state.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#openchatbydefault)

### persistFeedback

`persistFeedback?: boolean`

Allows for feedback to persist in all messages, not just the latest message.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#persistfeedback)

### persistedState

`persistedState?: PersistedStateConfig`

Hands session-state persistence to the host page. By default the chat persists session state to
the browser's `sessionStorage`; set this to boot from your own
PersistedStateConfig.initialState and receive changes via
PersistedStateConfig.onStateChange instead. See PersistedStateConfig.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#persistedstate)

### renderCustomMessageFooter

`renderCustomMessageFooter?: RenderCustomMessageFooter`

This is the function that this component will call when a custom footer should be rendered.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#rendercustommessagefooter)

### renderUserDefinedResponse

`renderUserDefinedResponse?: RenderUserDefinedResponse`

This is the function that this component will call when a user defined response should be rendered.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#renderuserdefinedresponse)

### renderWriteableElements

`renderWriteableElements?: RenderWriteableElementResponse`

This is the render function this component will call when it needs to render a writeable element.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#renderwriteableelements)

### serviceDesk

`serviceDesk?: ServiceDeskPublicConfig`

Any public config to apply to service desks.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#servicedesk)

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

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#servicedeskfactory)

### shouldSanitizeHTML

`shouldSanitizeHTML?: boolean`

Indicates if Carbon AI Chat should sanitize HTML from the assistant.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#shouldsanitizehtml)

### shouldTakeFocusIfOpensAutomatically

`shouldTakeFocusIfOpensAutomatically?: boolean`

If the Carbon AI Chat should grab focus if the chat is open on page load.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#shouldtakefocusifopensautomatically)

### strings

`strings?: DeepPartial<LanguagePack>`

Optional partial language pack overrides. Values merge with defaults.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#strings)

### upload

`upload?: UploadConfig`

**Experimental.**

Configuration for file upload behavior in the chat input.
When `is_on` is `true`, the chat renders a file attachment button in the input area.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChatCustomElementProps.html#upload)

## Related

- [ChatContainerProps](./ChatContainerProps.md)
- [PublicConfig](./PublicConfig.md)
