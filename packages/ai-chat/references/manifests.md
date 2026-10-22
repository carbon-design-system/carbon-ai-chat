# Element manifests

Edit the source table and public types when changing flattened host config. The CEM plugin reads those literal declarations and fails on unsupported expressions. Keep property-only fields free of attributes.

The public host interfaces can extend a config field's type. The plugin reads those overrides from source too. The field table still controls its HTML attribute. Keep each host linked to its public interface in the analyzer config.

`npm run build` bundles the package, then runs `npm run custom-elements`. Both commands generate `custom-elements.json`; never edit or commit it. `npm run test:manifest` runs the pure analyzer fixtures. The package test script runs them before Jest.

The manifest keeps each concrete host declaration on its pure class module. Its public registering index owns the custom-element definition and points back to that declaration. Inherited config metadata stays on each host. The plugin checks that the public barrel loads the actual registration; a type-only import does not count. The abstract base has no public module or tag. Keep all references resolvable in packed packages.

The root `test:carbon-consumer` check compares the packed manifest with built runtime properties and attributes. It checks types against the packed public config and host interfaces. It also checks JSON discovery and published module references. Run it after a fresh build; see the [build preflight](../../../references/commands.md#build-preflight).

## Related guidance

- [Package guidance](../AGENTS.md) — source, build, and test rules
- [Components manifest pipeline](../../ai-chat-components/references/component-authoring.md#manifest-and-react-wrappers) — shared tag plugin and component metadata
