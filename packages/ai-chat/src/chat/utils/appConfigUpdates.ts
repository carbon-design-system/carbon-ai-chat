/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from 'lodash-es/isEqual.js';

import appActions from '../store/actions';
import { ServiceManager } from '../services/ServiceManager';
import { PublicConfig } from '../../types/config/PublicConfig';
import { mergePublicConfig } from './chatBoot';
import { applyConfigChangesDynamically } from './dynamicConfigUpdates';
import { consoleError, consoleWarn } from './miscUtils';

/**
 * The config a mount last applied, plus the props it has already warned about.
 * A mount creates one at startup and passes it to every later update.
 */
interface AppliedConfig {
  /** The config as the chat merged it, for change detection. */
  effective: PublicConfig;
  /** The host config it was built from, compared by identity. */
  source: PublicConfig;
  warned: Set<string>;
}

function createAppliedConfig(
  effective: PublicConfig,
  source: PublicConfig
): AppliedConfig {
  return { effective, source, warned: new Set() };
}

/**
 * Dev-only diagnostic: a heavy object prop changed identity but its content is
 * unchanged, meaning the host is re-creating it every render and paying for
 * avoidable reconciliation. Gated behind `config.debug` and emitted once per
 * prop per mount. See the prop-stability contract in `src/types/AGENTS.md`.
 */
function warnUnstableProp(
  applied: AppliedConfig,
  serviceManager: ServiceManager,
  name: string
) {
  if (
    !serviceManager.store.getState().config.public.debug ||
    applied.warned.has(name)
  ) {
    return;
  }
  applied.warned.add(name);
  consoleWarn(
    `The \`${name}\` prop changed identity without changing content. Memoize it ` +
      `(e.g. useMemo / useCallback) so it does not trigger avoidable work on every render.`
  );
}

/**
 * Keeps the markdownConfig slice in sync with `config.markdown`. It lives in
 * its own slice rather than the config tree, and is compared by value so an
 * inline object with unchanged content does not re-render every markdown
 * message.
 */
function syncMarkdownConfig(
  applied: AppliedConfig,
  markdown: PublicConfig['markdown'],
  serviceManager: ServiceManager
) {
  const current = serviceManager.store.getState().markdownConfig;
  if (isEqual(current, markdown)) {
    if (markdown !== undefined && markdown !== current) {
      warnUnstableProp(applied, serviceManager, 'markdown');
    }
    return;
  }
  serviceManager.store.dispatch(
    appActions.setAppStateValue('markdownConfig', markdown)
  );
}

/**
 * Applies a config the host changed after startup, without rebooting. A
 * change to the human agent service while a chat is active ends that chat
 * quietly and recreates the service; see `applyConfigChangesDynamically`.
 */
function applyConfigUpdate(
  applied: AppliedConfig,
  config: PublicConfig,
  serviceManager: ServiceManager
) {
  const next = mergePublicConfig(config);
  const previous = applied.effective;
  applied.source = config;
  if (isEqual(previous, next)) {
    warnUnstableProp(applied, serviceManager, 'config');
  } else {
    applied.effective = next;
    applyConfigChangesDynamically(previous, next, serviceManager).catch(
      (error) =>
        consoleError('Failed to apply config changes dynamically:', error)
    );
  }
  syncMarkdownConfig(applied, config.markdown, serviceManager);
}

export { AppliedConfig, applyConfigUpdate, createAppliedConfig };
