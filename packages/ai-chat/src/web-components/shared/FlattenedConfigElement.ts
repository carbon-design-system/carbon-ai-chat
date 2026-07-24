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
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface FlattenedConfigElement extends Partial<PublicConfig> {}

/**
 * Base class contributing all flattened `PublicConfig` reactive properties.
 * Not registered as a custom element — only the concrete subclasses are.
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

  /**
   * The {@link PublicConfig} reconstructed from `config` plus every defined
   * flattened property.
   */
  protected get resolvedConfig(): PublicConfig {
    return resolveFlattenedConfig(this);
  }
}

export { FlattenedConfigElement };
