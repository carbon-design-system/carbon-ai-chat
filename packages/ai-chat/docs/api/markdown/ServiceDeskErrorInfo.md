# ServiceDeskErrorInfo

- Kind: TypeAlias
- Category: Service desk
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/types/Type_reference.ServiceDeskErrorInfo.html

The type for the information passed to ServiceDeskCallback#setErrorStatus. It is a discriminating union
where the type property is the discriminating value that determines which child interface is to be used.

## Signature

```ts
type ServiceDeskErrorInfo = ConnectingErrorInfo | DisconnectedErrorInfo | UserMessageErrorInfo
```

## Related

- [ServiceDeskCallback.setErrorStatus](./ServiceDeskCallback.md)
