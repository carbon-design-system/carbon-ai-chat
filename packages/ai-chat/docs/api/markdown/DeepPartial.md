# DeepPartial

- Kind: TypeAlias
- Category: Utilities
- Reference: https://chat.carbondesignsystem.com/version/v1.18.0-rc.0/docs/types/Type_reference.DeepPartial.html

Utility type that makes all properties in T optional recursively.

This type is useful for configuration objects where you want to allow
partial updates to nested object structures. It recursively applies
the optional modifier (?) to all properties, including nested objects.

## Signature

```ts
type DeepPartial = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] }
```

## Examples

```typescript
interface Config {
  server: {
    host: string;
    port: number;
  };
  database: {
    url: string;
    timeout: number;
  };
}

// All properties become optional, including nested ones
const partialConfig: DeepPartial<Config> = {
  server: {
    host: "localhost" // port is optional
  }
  // database is optional entirely
};
```
