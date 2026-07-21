# ChainOfThoughtStep

- Kind: Interface
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChainOfThoughtStep.html

A chain of thought step is meant to show tool calls and other steps made by your agent
to reach its final answer.

## Signature

```ts
interface ChainOfThoughtStep
```

## Members

### description

`description?: string`

An optional human readable description of what the tool does.

Accepts markdown formatted text.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChainOfThoughtStep.html#description)

### request

`request?: { args?: unknown }`

Optional request metadata sent to a tool.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChainOfThoughtStep.html#request)

### response

`response?: { content: unknown }`

Optional response from a tool.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChainOfThoughtStep.html#response)

### status

`status?: ChainOfThoughtStepStatus`

Optionally, share the status of this step. An icon will appear in the view showing the status. If no status is
shared, the UI will assume success.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChainOfThoughtStep.html#status)

### title

`title?: string`

The plain text name of the step.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChainOfThoughtStep.html#title)

### tool_name

`tool_name?: string`

The plain text name of the tool called.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.ChainOfThoughtStep.html#tool_name)
