# PublicChatState

- Kind: TypeAlias
- Category: Instance
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/types/Type_reference.PublicChatState.html

Type returned by ChatInstance.getState.

## Signature

```ts
type PublicChatState = Readonly<Omit<PersistedState, "humanAgentState"> & { activeResponseId: string | null; customPanels: PublicCustomPanelsState; humanAgent: PublicChatHumanAgentState; input: PublicInputState; isHydratingCounter: number; isMessageLoadingCounter: number; isMessageLoadingText?: string; workspace: PublicWorkspaceCustomPanelState }>
```

## Related

- [ChatInstance.getState](./ChatInstance.md)
