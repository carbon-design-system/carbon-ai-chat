/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from 'lodash-es/isEqual.js';

import { ServiceManager } from '../../sdk/services/ServiceManager';

import { PublicConfig } from '../../types/config/PublicConfig';

import { mergePublicConfig, reportNamespaceError } from './chatBoot';

import { applyConfigChangesDynamically } from './dynamicConfigUpdates';

import { consoleError, consoleWarn } from '../../sdk/utils/miscUtils';

import { viewActions } from '../state';

import { chatStore } from '../services/attachChatView';
import { copyConfig } from '../../sdk/utils/copyConfig';
import type { ChatClaim } from '../../sdk/registry';

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
 * Keeps the markdownConfig slice in sync with `config.markdown`, at startup
 * and on every update; it's the slice's one writer. It lives in its own slice
 * rather than the config tree, and is compared by value so an inline object
 * with unchanged content does not re-render every markdown message (#1833
 * O10). The slice holds a copy, so the host editing its object later changes
 * nothing; plugins and renderers keep their references.
 */
function syncMarkdownConfig(
  applied: AppliedConfig,
  markdown: PublicConfig['markdown'],
  serviceManager: ServiceManager,
  previousMarkdown?: PublicConfig['markdown']
) {
  const current = chatStore(serviceManager).getState().view.markdownConfig;
  if (isEqual(current, markdown)) {
    // The slice holds a copy, so compare the host's own objects to tell a
    // re-created prop from a stable one.
    if (markdown !== undefined && markdown !== previousMarkdown) {
      warnUnstableProp(applied, serviceManager, 'markdown');
    }
    return;
  }
  serviceManager.store.dispatch(
    viewActions.setViewValue('markdownConfig', copyConfig(markdown))
  );
}

/**
 * Applies the view's half of the config a mount starts with. The
 * conversation's half went in when the chat booted.
 */
function applyBootConfig(
  applied: AppliedConfig,
  config: PublicConfig,
  serviceManager: ServiceManager
) {
  syncMarkdownConfig(applied, config.markdown, serviceManager);
}

/**
 * Applies a config the host changed after startup, without rebooting. A
 * change to the human agent service while a chat is active ends that chat
 * quietly and recreates the service; see `applyConfigChangesDynamically`.
 *
 * With reuse on, a new namespace moves the chat's claim first. If another
 * chat holds that namespace, it reports the error and changes nothing.
 */
function applyConfigUpdate(
  applied: AppliedConfig,
  config: PublicConfig,
  serviceManager: ServiceManager,
  claim?: ChatClaim<ServiceManager>
) {
  const next = mergePublicConfig(config);
  const previous = applied.effective;
  const previousMarkdown = applied.source.markdown;
  applied.source = config;
  if (!moveClaim(claim, previous, next)) {
    return;
  }
  if (isEqual(previous, next)) {
    warnUnstableProp(applied, serviceManager, 'config');
  } else {
    applied.effective = next;
    applyConfigChangesDynamically(previous, next, serviceManager).catch(
      (error) =>
        consoleError('Failed to apply config changes dynamically:', error)
    );
  }
  syncMarkdownConfig(
    applied,
    config.markdown,
    serviceManager,
    previousMarkdown
  );
}

/**
 * Files a reused chat under its new namespace. Returns `false` after
 * reporting the error when another chat holds that namespace.
 */
function moveClaim(
  claim: ChatClaim<ServiceManager> | undefined,
  previous: PublicConfig,
  next: PublicConfig
) {
  if (!claim || previous.namespace === next.namespace) {
    return true;
  }
  try {
    claim.move(next.namespace);
    return true;
  } catch (error) {
    if (!reportNamespaceError(error, next)) {
      throw error;
    }
    return false;
  }
}

export {
  AppliedConfig,
  applyBootConfig,
  applyConfigUpdate,
  createAppliedConfig,
};
