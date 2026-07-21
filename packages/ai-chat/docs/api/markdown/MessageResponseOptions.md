# MessageResponseOptions

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponseOptions.html

This interface contains options for a MessageResponse.

## Signature

```ts
interface MessageResponseOptions
```

## Members

### chain_of_thought

`chain_of_thought?: ChainOfThoughtStep[]`

Controls the display of the chain of thought component.

Most people should use reasoning steps instead of chain of thought.

Chain of thought it meant more for technical "called X API and got Y result back".

Reasoning steps can include that kind of detail depending on your use case, but is meant more for user friendly
content than debugging technical internal content.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponseOptions.html#chain_of_thought)

### reasoning

`reasoning?: ReasoningSteps`

Controls the display of the reasoning steps component.

Most people should use reasoning steps instead of chain of thought.

Chain of thought it meant more for technical "called X API and got Y result back".

Reasoning steps can include that kind of detail depending on your use case, but is meant more for user friendly
content than debugging technical internal content.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponseOptions.html#reasoning)

### response_user_profile

`response_user_profile?: ResponseUserProfile`

This is the profile for the human or assistant who sent or triggered this message.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.MessageResponseOptions.html#response_user_profile)

## Related

- [MessageResponse](./MessageResponse.md)
