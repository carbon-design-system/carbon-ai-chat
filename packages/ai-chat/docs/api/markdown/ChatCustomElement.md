# ChatCustomElement

- Kind: Function
- Category: React
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/functions/Type_reference.ChatCustomElement.html

This is the React component for people injecting a Carbon AI Chat with a custom element.

It provides said element any class or id defined on itself for styling. It then calls ChatContainer with the custom
element passed in as a property to be used instead of generating an element with the default properties for a
floating chat.

## Signature

```ts
ChatCustomElement(props: ChatCustomElementProps & Omit<HTMLAttributes<HTMLDivElement>, keyof ChatCustomElementProps>): Element
```
