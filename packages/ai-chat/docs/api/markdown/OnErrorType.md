# OnErrorType

- Kind: Enum
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.OnErrorType.html

The different categories of errors that the system can record. These values are published for end user consumption.

## Signature

```ts
enum OnErrorType
```

## Members

### HYDRATION

`HYDRATION = "HYDRATION"`

This indicates that some error occurred while trying to hydrate the chat. This will prevent the chat from
functioning.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.OnErrorType.html#hydration)

### INTEGRATION_ERROR

`INTEGRATION_ERROR = "INTEGRATION_ERROR"`

This indicates a known error with the configuration for a service desk. Fired when a connect_to_agent
response type is received, but none is configured.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.OnErrorType.html#integration_error)

### MESSAGE_COMMUNICATION

`MESSAGE_COMMUNICATION = "MESSAGE_COMMUNICATION"`

Indicates an error sending a message to the assistant. This error is only generated after all retries have
failed and the system has given up.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.OnErrorType.html#message_communication)

### RENDER

`RENDER = "RENDER"`

This indicates an error in one of the components that occurs as part of rendering the UI.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/enums/Type_reference.OnErrorType.html#render)
