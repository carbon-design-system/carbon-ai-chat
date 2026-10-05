<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# ChatCustomElement

- Kind: Function
- Category: React
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0-rc.1/docs/functions/Type_reference.ChatCustomElement.html

This is the React component for people injecting a Carbon AI Chat with a custom element.

It provides said element any class or id defined on itself for styling. It then calls ChatContainer with the custom
element passed in as a property to be used instead of generating an element with the default properties for a
floating chat.

## Signature

```ts
ChatCustomElement(props: ChatCustomElementProps & Omit<HTMLAttributes<HTMLDivElement>, keyof ChatCustomElementProps>): Element
```
