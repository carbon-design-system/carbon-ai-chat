<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# PublicChatState

- Kind: TypeAlias
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0/docs/types/Type_reference.PublicChatState.html

Type returned by ChatInstance.getState.

## Signature

```ts
type PublicChatState = Readonly<Omit<PersistedState, "humanAgentState"> & { activeResponseId: string | null; customPanels: PublicCustomPanelsState; humanAgent: PublicChatHumanAgentState; input: PublicInputState; isHydratingCounter: number; isMessageLoadingCounter: number; isMessageLoadingText?: string; workspace: PublicWorkspaceCustomPanelState }>
```

## Related

- [ChatInstance.getState](./ChatInstance.md)
