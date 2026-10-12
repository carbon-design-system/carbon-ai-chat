<!--
  GENERATED FILE - do not edit. A release regenerates and commits it
  (`npm run docs:api`, see release-base.yml); a branch never should.
  Edit the JSDoc it is generated from instead.
-->

# ObjectMap

- Kind: TypeAlias
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.22.0/docs/types/Type_reference.ObjectMap.html

This interface represents an object which behaves like a map. The object contains a set of properties representing
keys in the map and the values of those properties are all of the same type (TPropertyType). The type of the keys
defaults to any string but you can specify a type that is a string enum instead if you want a map that contains
only keys for a given enum (or other similar type).

## Signature

```ts
type ObjectMap = Partial<Record<TKeyType, TPropertyType>>
```
