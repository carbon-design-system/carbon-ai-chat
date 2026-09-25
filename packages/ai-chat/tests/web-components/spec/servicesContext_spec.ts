/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `cds-aichat-container` provides its chat's service manager to Lit elements
 * rendered inside it, through Lit context rather than a React hook. Each chat
 * provides its own, and a detached chat provides none.
 */

import { ContextConsumer } from '@lit/context';
import { LitElement } from 'lit';
import { waitFor } from '@testing-library/react';

import '../../../src/web-components/cds-aichat-container';
import { serviceManagerContext } from '../../../src/web-components/shared/service-manager-context';
import { ChatInstance } from '../../../src/types/instance/ChatInstance';
import { PublicConfig } from '../../../src/types/config/PublicConfig';
import {
  createBaseConfig,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

class ServicesProbe extends LitElement {
  services = new ContextConsumer(this, {
    context: serviceManagerContext,
    subscribe: true,
  });
}
customElements.define('test-services-probe', ServicesProbe);

function mountChat() {
  const instances: ChatInstance[] = [];
  const host = document.createElement('cds-aichat-container') as HTMLElement & {
    config: PublicConfig;
    onBeforeRender: (instance: ChatInstance) => void;
  };
  host.config = createBaseConfig();
  host.onBeforeRender = (instance) => {
    instances.push(instance);
  };
  const probe = document.createElement('test-services-probe') as ServicesProbe;
  host.appendChild(probe);
  document.body.appendChild(host);
  return { host, probe, instances };
}

describe('service manager context', () => {
  beforeEach(setupBeforeEach);
  afterEach(setupAfterEach);

  it('gives each chat its own manager and withdraws it on detach', async () => {
    const first = mountChat();
    const second = mountChat();
    await waitFor(
      () => {
        expect(first.instances).toHaveLength(1);
        expect(second.instances).toHaveLength(1);
      },
      { timeout: 5000 }
    );

    // Compared as booleans against a field the instance's own copy shares:
    // `instance.serviceManager` is a copy, and a manager is too large to print
    // if a comparison fails.
    expect(
      first.probe.services.value.store ===
        first.instances[0].serviceManager.store
    ).toBe(true);
    expect(
      second.probe.services.value.store ===
        second.instances[0].serviceManager.store
    ).toBe(true);
    expect(first.probe.services.value === second.probe.services.value).toBe(
      false
    );

    first.host.remove();
    expect(first.probe.services.value).toBeUndefined();
    expect(
      second.probe.services.value.store ===
        second.instances[0].serviceManager.store
    ).toBe(true);
  });
});
