/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Shared Lit base class for the web components that expose a flattened
 * {@link PublicConfig} surface (`cds-aichat-container` and
 * `cds-aichat-custom-element`).
 *
 * It contributes every flattened reactive property from the single
 * {@link FLATTENED_PUBLIC_CONFIG_FIELDS} table and derives `resolvedConfig`
 * from that same table, so each config field is defined in exactly one place.
 */

import { LitElement } from 'lit';
import type { PropertyDeclaration, PropertyDeclarations } from 'lit';

import { PublicConfig } from '../../types/config/PublicConfig';
import {
  FLATTENED_PUBLIC_CONFIG_FIELDS,
  resolveFlattenedConfig,
} from './flattenedPublicConfig';

/** The field values a resolved config was built from, in table order. */
function configInputs(source: FlattenedConfigElement): unknown[] {
  return [
    source.config,
    source.aiDisabled,
    ...FLATTENED_PUBLIC_CONFIG_FIELDS.map(
      (field) => (source as unknown as Record<string, unknown>)[field.name]
    ),
  ];
}

/**
 * Builds the Lit `static properties` object from the shared field table plus
 * the synthetic `config` (base config object) and `aiDisabled` (opt-out)
 * properties.
 */
function buildFlattenedProperties(): PropertyDeclarations {
  const properties: Record<string, PropertyDeclaration> = {
    config: { attribute: false, type: Object },
    aiDisabled: { type: Boolean, attribute: 'ai-disabled' },
  };
  for (const field of FLATTENED_PUBLIC_CONFIG_FIELDS) {
    properties[field.name] = field.options;
  }
  return properties;
}

/**
 * Declaration merging gives the instance typed access to `this.history`,
 * `this.debug`, ... without re-listing every {@link PublicConfig} field and
 * without emitting any runtime class field (so nothing shadows the accessors
 * Lit installs from `static properties`).
 */

interface FlattenedConfigElement extends Partial<PublicConfig> {}

/**
 * Base class contributing all flattened `PublicConfig` reactive properties.
 * Not registered as a custom element — only the concrete subclasses are.
 *
 * The `@attr` tags below exist solely so that web-component-analyzer can
 * discover the HTML attributes derived from {@link FLATTENED_PUBLIC_CONFIG_FIELDS}.
 * Lit registers them at runtime via `static properties = buildFlattenedProperties()`,
 * which WCA cannot statically analyze. Keep this list in sync with that table
 * (property-only fields with `attribute: false` are intentionally omitted).
 *
 * @attr ai-disabled
 * @attr ai-enabled
 * @attr assistant-name
 * @attr debug
 * @attr disclaimer
 * @attr disable-custom-element-mobile-enhancements
 * @attr expose-service-manager-for-testing
 * @attr header
 * @attr hide-avatar
 * @attr history
 * @attr homescreen
 * @attr inject-carbon-theme
 * @attr input
 * @attr is-readonly
 * @attr keyboardshortcuts
 * @attr launcher
 * @attr layout
 * @attr locale
 * @attr messaging
 * @attr namespace
 * @attr open-chat-by-default
 * @attr persist-feedback
 * @attr service-desk
 * @attr should-sanitize-html
 * @attr should-take-focus-if-opens-automatically
 * @attr strings
 */
abstract class FlattenedConfigElement extends LitElement {
  static properties: PropertyDeclarations = buildFlattenedProperties();

  /** Base config object. Flattened properties layer on top of this. */
  config?: PublicConfig;

  /**
   * Optional explicit opt-out attribute. If present, it wins over `ai-enabled`.
   * Not a {@link PublicConfig} field — it resolves into `config.aiEnabled`.
   */
  aiDisabled?: boolean;

  private resolvedConfigCache?: { inputs: unknown[]; config: PublicConfig };

  /**
   * The {@link PublicConfig} reconstructed from `config` plus every defined
   * flattened property.
   *
   * Cached against the fields it was built from, so a re-render that changed
   * none of them hands back the same object. Downstream code compares configs
   * by identity to tell a real change from render churn.
   */
  protected get resolvedConfig(): PublicConfig {
    const inputs = configInputs(this);
    const cached = this.resolvedConfigCache;
    if (
      cached &&
      inputs.every((value, index) => value === cached.inputs[index])
    ) {
      return cached.config;
    }
    const config = resolveFlattenedConfig(this);
    this.resolvedConfigCache = { inputs, config };
    return config;
  }
}

export { FlattenedConfigElement };
