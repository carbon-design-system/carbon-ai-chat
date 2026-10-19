# Element manifests

Edit the source table and public types when changing flattened host config. The CEM plugin reads those literal declarations and fails on unsupported expressions. Keep property-only fields free of attributes.

The public host interfaces can extend a config field's type. The plugin reads those overrides from source too. The field table still controls its HTML attribute. Keep each host linked to its public interface in the analyzer config.

`npm run build --workspace=@carbon/ai-chat` bundles the package, then runs its `custom-elements` script. The analyzer generates `custom-elements.json`; never edit or commit it. `npm run test:manifest --workspace=@carbon/ai-chat` runs the pure analyzer fixtures. The package test script runs them before Jest.

The Rollup watcher does not rerun the analyzer. After table, type, or host metadata edits, run `npm run custom-elements --workspace=@carbon/ai-chat` from the root to refresh the CEM.

The manifest projects both concrete hosts onto their published default entries. Inherited config metadata stays on each host. The abstract base has no public module or tag. Keep declaration and export references resolvable in packed packages.

The root `test:manifest-consumer` check compares the packed manifest with built runtime properties and attributes. It checks types against the packed public config and host interfaces. It also checks JSON discovery and published module references. Run it after a fresh build; see the [build preflight](../../../references/commands.md#build-preflight).

## What builds and checks do

The build generates the host manifest from the literal config table, public types, and each linked host interface.
It reads existing decorators for tag names and own reactive fields. You do not maintain a second list of config metadata.
The analyzer rejects unsupported table syntax, duplicate fields, and table/type mismatches.

The root `npm run test:manifest-consumer` checks packed discovery, shipped references, and host metadata against runtime attributes, runtime properties, and declarations.
It runs from the root test gate. Run it after a fresh build; it does not build the packages itself.
The split GitHub test jobs do not run this root script. Run it before opening a PR that changes manifest inputs.
Its negative mutations catch missing or duplicate fields, lost host overrides, and optional callback type errors.

## Steps for a config or host change

- Add config fields to `PublicConfig` and `FLATTENED_PUBLIC_CONFIG_FIELDS`. Use literal entries that the analyzer can read.
- Keep runtime attribute options accurate. `attribute: false` means property-only. Keep `aiEnabled` Boolean in the public type despite its custom converter.
- Put host-specific type overrides in the linked public host interface. Keep that interface association in the analyzer config.
- For own reactive fields, keep the decorator, source type, and public interface aligned. Default Lit attribute names are lowercase.
- For a new host, add its source, published entry, and interface to the analyzer config. Extend the packed host expectations and declaration entries.
- Add a pure fixture when new source syntax needs parser support. Unsupported syntax must fail instead of dropping fields.
- Rebuild, then run the following checks from the repository root.
- Inspect the changed fresh manifest entries and the affected rendered docs. Follow the package gate for runtime or public type changes.

```bash
npm run test:manifest --workspace=@carbon/ai-chat-components
npm run test:manifest --workspace=@carbon/ai-chat
npm run test:manifest-consumer
```

The checks do not prove all event detail types, slots, style hooks, or external type symbols. Those broader guards belong to #2287 and #2551.
Keep any new coverage claim scoped to the checks that ran.

## Related guidance

- [Package guidance](../AGENTS.md) — source, build, and test rules
- [Components manifest pipeline](../../ai-chat-components/references/component-authoring.md#manifest-and-react-wrappers) — shared tag plugin and component metadata
