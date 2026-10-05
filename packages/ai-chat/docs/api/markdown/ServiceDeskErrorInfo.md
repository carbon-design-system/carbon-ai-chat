<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# ServiceDeskErrorInfo

- Kind: TypeAlias
- Category: Service desk
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/types/Type_reference.ServiceDeskErrorInfo.html

The type for the information passed to ServiceDeskCallback#setErrorStatus. It is a discriminating union
where the type property is the discriminating value that determines which child interface is to be used.

## Signature

```ts
type ServiceDeskErrorInfo = ConnectingErrorInfo | DisconnectedErrorInfo | UserMessageErrorInfo
```

## Related

- [ServiceDeskCallback.setErrorStatus](./ServiceDeskCallback.md)
