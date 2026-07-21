# BusEventHeaderMenuClick

- Kind: Interface
- Category: Events
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHeaderMenuClick.html

This event is fired when a user clicks on navigation items in the chat header.
This includes the homescreen button and overflow menu items.

## Signature

```ts
interface BusEventHeaderMenuClick
```

## Members

### clickType

`clickType: HeaderMenuClickType`

The type of navigation item that was clicked.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHeaderMenuClick.html#clicktype)

### menuItemIndex

`menuItemIndex?: number`

For overflow menu items, this is the index of the item clicked.
For homescreen button, this will be undefined.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHeaderMenuClick.html#menuitemindex)

### menuItemText

`menuItemText?: string`

For overflow menu items, this is the text label of the item clicked.
For homescreen button, this will be the back button label.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHeaderMenuClick.html#menuitemtext)

### type

`type: HEADER_MENU_CLICK`

The type of the event.

[Reference](https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/interfaces/Type_reference.BusEventHeaderMenuClick.html#type)
