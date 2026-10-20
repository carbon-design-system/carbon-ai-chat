/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { readSource } from './manifest-source.js';
import { readEvents } from './manifest-event-producers.js';

function inside(node, owner) {
  for (let current = node; current; current = current.parent) {
    if (current === owner) {
      return true;
    }
  }
  return false;
}

function computedProducers(model, element, producers) {
  return producers.filter(
    (producer) =>
      producer.element === element &&
      inside(producer.constructor, element.node) &&
      !model.ts.isStringLiteralLike(producer.constructor.arguments[0])
  );
}

function normalizeEvents(model, element, declaration, producers) {
  const unnamed = (declaration.events ?? []).filter((event) => !event.name);
  if (!unnamed.length) {
    return;
  }
  const computed = computedProducers(model, element, producers);
  if (!computed.length) {
    model.fail(
      element.node,
      'Resolve the manifest event without a name to a concrete source producer.'
    );
  }
  const events = declaration.events.filter((event) => event.name);
  for (const event of unnamed) {
    const matches = computed.filter(
      (producer) =>
        event.type?.text ===
        (producer.custom ? 'CustomEvent' : producer.eventType)
    );
    const synthetic =
      !event.description &&
      Object.keys(event).every((key) => ['name', 'type'].includes(key));
    if (!synthetic || !matches.length) {
      model.fail(
        element.node,
        'Resolve the manifest event without a name to an analyzer-shaped concrete source producer.'
      );
    }
    for (const producer of matches) {
      if (!events.some((entry) => entry.name === producer.name)) {
        events.push({ ...event, name: producer.name });
      }
    }
  }
  declaration.events = events;
}

export function manifestEventsPlugin({ model } = {}) {
  return {
    name: 'source-computed-event-names',
    packageLinkPhase({ customElementsManifest }) {
      const source = model ?? readSource();
      const producers = readEvents(source);
      for (const module of customElementsManifest.modules) {
        for (const declaration of module.declarations ?? []) {
          const element = source.elements.find(
            (entry) => entry.tagName === declaration.tagName
          );
          if (element) {
            normalizeEvents(source, element, declaration, producers);
          }
        }
      }
    },
  };
}
