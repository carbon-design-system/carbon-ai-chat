# GenericItem

- Kind: TypeAlias
- Category: Messaging
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/types/Type_reference.GenericItem.html

The basic class for items returned from an assistant as part of a message response. These are the items contained
in the MessageOutput.generic array.

## Signature

```ts
type GenericItem = TextItem<TUserDefinedType> | OptionItem<TUserDefinedType> | ConnectToHumanAgentItem<TUserDefinedType> | ImageItem<TUserDefinedType> | PauseItem<TUserDefinedType> | UserDefinedItem<TUserDefinedType> | IFrameItem<TUserDefinedType> | VideoItem<TUserDefinedType> | AudioItem<TUserDefinedType> | DateItem<TUserDefinedType> | InlineErrorItem<TUserDefinedType> | CardItem<TUserDefinedType> | CarouselItem<TUserDefinedType> | ButtonItem<TUserDefinedType> | GridItem<TUserDefinedType> | ConversationalSearchItem<TUserDefinedType> | PreviewCardItem<TUserDefinedType> | SystemMessageItem<TUserDefinedType>
```

## Related

- [MessageOutput.generic](./MessageOutput.md)
