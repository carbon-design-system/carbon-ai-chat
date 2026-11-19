/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function createManifestEventArgTypes(entries) {
  const registry = new Map();
  for (const entry of entries) {
    const previous = registry.get(entry.component);
    if (
      previous &&
      JSON.stringify(previous.events) !== JSON.stringify(entry.events)
    ) {
      throw new Error(
        `Conflicting event documentation for ${entry.module}#${entry.exportName}.`
      );
    }
    registry.set(entry.component, entry);
  }
  return (component) => {
    const entry = registry.get(component);
    if (!entry) {
      throw new Error(
        'The React component is missing from the generated event documentation registry.'
      );
    }
    return Object.fromEntries(
      entry.events.map((event) => [
        event.callback,
        {
          description: event.description,
          control: false,
          action: event.callback,
          table: { category: 'Events', type: { summary: event.type } },
        },
      ])
    );
  };
}
