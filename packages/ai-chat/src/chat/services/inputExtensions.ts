/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { Extension } from '@tiptap/core';
import {
  getBuildCarbonExtensionsIfLoaded,
  loadBuildCarbonExtensions,
} from '../components/input/buildExtensionsLoader';

type Builder = NonNullable<ReturnType<typeof getBuildCarbonExtensionsIfLoaded>>;
type NormalizedConfig = Parameters<Builder>[0];
const EMPTY_EXTENSIONS: Extension[] = [];

export function buildInputExtensions(
  config: NormalizedConfig,
  hostExtensions: Extension[] | undefined,
  builder: Builder | null
): Extension[] {
  const carbon = builder ? builder(config) : EMPTY_EXTENSIONS;
  const host = hostExtensions ?? EMPTY_EXTENSIONS;
  if (carbon.length) {
    return [...carbon, ...host];
  }
  return host.length ? host : EMPTY_EXTENSIONS;
}

export class InputExtensions {
  private generation = 0;
  private previousInputs: unknown[] | undefined;
  private extensions = EMPTY_EXTENSIONS;

  connect(enabled: boolean, onLoaded: () => void) {
    this.disconnect();
    const generation = this.generation;
    if (enabled && !getBuildCarbonExtensionsIfLoaded()) {
      void loadBuildCarbonExtensions().then(() => {
        if (generation === this.generation) {
          onLoaded();
        }
      });
    }
  }

  disconnect = () => {
    this.generation += 1;
  };

  getBuilder(enabled: boolean): Builder | null {
    return enabled ? getBuildCarbonExtensionsIfLoaded() : null;
  }

  getExtensions(
    config: NormalizedConfig,
    hostExtensions: Extension[] | undefined,
    enabled: boolean
  ): Extension[] {
    const builder = this.getBuilder(enabled);
    const inputs = [
      builder,
      config.mention,
      config.command,
      config.autocomplete,
      config.starters,
      hostExtensions,
    ];
    if (this.previousInputs?.every((value, index) => value === inputs[index])) {
      return this.extensions;
    }
    this.extensions = buildInputExtensions(config, hostExtensions, builder);
    this.previousInputs = inputs;
    return this.extensions;
  }
}
