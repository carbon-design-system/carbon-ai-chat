# OnErrorData

- Kind: Interface
- Category: Config
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.OnErrorData.html

Fired when a serious error in the chat occurs.

## Signature

```ts
interface OnErrorData
```

## Members

### catastrophicErrorType

`catastrophicErrorType?: boolean`

If the error is of the severity that requires a whole restart of Carbon AI Chat.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.OnErrorData.html#catastrophicerrortype)

### errorType

`errorType: OnErrorType`

The type of error that occurred.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.OnErrorData.html#errortype)

### message

`message: string`

A message associated with the error.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.OnErrorData.html#message)

### otherData

`otherData?: unknown`

An extra blob of data associated with the error. This may be a stack trace for thrown errors.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.OnErrorData.html#otherdata)
