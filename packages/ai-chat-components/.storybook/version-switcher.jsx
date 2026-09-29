/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useState } from 'react';
import { addons, types } from 'storybook/manager-api';
import {
  currentVersion,
  getOptions,
  parseVersions,
} from './version-switcher-utils';

const VERSIONS_URL = 'https://chat.carbondesignsystem.com/versions.js';

export function VersionSwitcher({ flavor }) {
  const current = currentVersion(window.location);
  const [versions, setVersions] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    async function load() {
      try {
        const response = await fetch(VERSIONS_URL, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Could not load components versions');
        }
        const text = await response.text();
        if (!controller.signal.aborted) {
          setVersions(parseVersions(text));
        }
      } catch {
        if (
          !controller.signal.aborted ||
          controller.signal.reason !== 'unmount'
        ) {
          setFailed(true);
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    load();
    return () => controller.abort('unmount');
  }, []);

  const { options, selected } = versions
    ? getOptions(window.location, flavor, versions)
    : {
        options: [
          {
            value: 'current',
            label:
              current.type === 'version'
                ? current.value
                : current.type === 'tag'
                  ? { latest: 'Latest', next: 'Pre-release', alpha: 'Alpha' }[
                      current.value
                    ]
                  : current.value,
          },
        ],
        selected: 'current',
      };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <select
        aria-label="Select @carbon/ai-chat-components version"
        aria-describedby="carbon-storybook-version-hint"
        disabled={!versions || failed}
        value={selected}
        onChange={(event) => {
          const option = options.find(
            (item) => item.value === event.target.value
          );
          if (option && option.value !== selected) {
            window.location.assign(option.href);
          }
        }}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span id="carbon-storybook-version-hint" style={{ fontSize: 12 }}>
        Opens Storybook home
      </span>
    </span>
  );
}

export function registerVersionSwitcher(flavor) {
  addons.register(`carbon-ai-chat/${flavor}-versions`, () => {
    addons.add(`carbon-ai-chat/${flavor}-versions/tool`, {
      type: types.TOOL,
      title: 'Components version',
      match: ({ viewMode }) => ['story', 'docs'].includes(viewMode),
      render: () => <VersionSwitcher flavor={flavor} />,
    });
  });
}
