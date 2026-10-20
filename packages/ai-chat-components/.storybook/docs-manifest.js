/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

function separateSlotNames(declaration) {
  const fields = [
    ...(declaration.members ?? []),
    ...(declaration.properties ?? []),
    ...(declaration.attributes ?? []),
  ].filter((field) => field.kind !== 'method');
  const fieldNames = new Set(fields.map((field) => field.name));
  const slots = declaration.slots ?? [];
  const usedNames = new Set(
    [
      ...fields,
      ...slots,
      ...(declaration.events ?? []),
      ...(declaration.cssProperties ?? []),
      ...(declaration.cssParts ?? []),
    ].map((row) => row.name)
  );
  const names = new Map();
  for (const slot of slots) {
    if (!slot.name || !fieldNames.has(slot.name)) {
      continue;
    }
    const publicName = slot.name;
    let key = `slot:${publicName}`;
    while (usedNames.has(key)) {
      key = `slot:${key}`;
    }
    usedNames.add(key);
    names.set(key, publicName);
    slot.name = key;
  }
  return names;
}

function displaySlotNames(argTypes, names) {
  if (!argTypes || !names?.size) {
    return argTypes;
  }
  return Object.fromEntries(
    Object.entries(argTypes).map(([key, argType]) => [
      key,
      names.has(key) ? { ...argType, name: names.get(key) } : argType,
    ])
  );
}

export function createDocsManifest(source, extractArgTypes) {
  const manifest = JSON.parse(JSON.stringify(source));
  const slotNames = new Map();
  for (const module of manifest.modules) {
    for (const declaration of module.declarations ?? []) {
      if (declaration.members) {
        declaration.members = declaration.members.filter(
          (member) => member.privacy !== 'private' && !member.static
        );
      }
      // Storybook otherwise lets a slot replace a field with the same name.
      slotNames.set(declaration.tagName, separateSlotNames(declaration));
    }
  }
  return {
    manifest,
    extractArgTypes: (component) =>
      displaySlotNames(extractArgTypes(component), slotNames.get(component)),
  };
}
