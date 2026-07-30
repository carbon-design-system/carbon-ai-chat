# RenderUserDefinedState

- Kind: Interface
- Category: React
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.RenderUserDefinedState.html

The user_defined message object passed into the renderUserDefinedResponse property on the main chat components.

## Signature

```ts
interface RenderUserDefinedState
```

## Members

### fullMessage

`fullMessage?: Message`

The entire message object received when the entire message (not just the individual messageItem) has finished processing.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.RenderUserDefinedState.html#fullmessage)

### messageItem

`messageItem?: GenericItem`

The messageItem after all partial chunks are received. This will first be set to the value of the `complete_item`
chunk.
Once the fullMessage is resolved, this value will update to the value of the item in the fullMessage, which will
be the same value unless you have done any post-processing mutations.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.RenderUserDefinedState.html#messageitem)

### partialItems

`partialItems?: DeepPartial<GenericItem>[]`

An array of each user defined item partial chunk. Each chunk contains the new chunk information, they are not
concatenated for you. When messageItem has been set an no more chunks are expected, this property is removed
to avoid memory leaks.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.RenderUserDefinedState.html#partialitems)

### state

`state?: MessageState`

**Experimental.**

The current MessageState of the containing message at the moment the renderer
was invoked. Use this to drive in-widget streaming indicators or error treatments
without inspecting the message items directly.

 Field is additive; its presence and semantics may evolve as the
lifecycle model stabilizes.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.RenderUserDefinedState.html#state)
