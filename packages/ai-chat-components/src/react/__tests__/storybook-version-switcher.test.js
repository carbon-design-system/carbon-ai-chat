/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  currentVersion,
  getOptions,
  parseVersions,
} from '../../../.storybook/version-switcher-utils';

const versions = ['v1.11.0', 'v1.10.0'];
const locationAt = (path, hostname = 'chat.carbondesignsystem.com') => ({
  pathname: path,
  hostname,
  href: `https://${hostname}${path}`,
});

describe('Storybook version navigation', () => {
  test('reads the published components list without reading the chat list', () => {
    const source = `
      export const AI_CHAT_VERSIONS = ['v9.0.0'];
      export const AI_CHAT_COMPONENTS_VERSIONS = [
        'v1.11.0',
        'v1.10.0',
      ];
    `;
    expect(parseVersions(source)).toEqual(versions);
    expect(() =>
      parseVersions('export const AI_CHAT_VERSIONS = [];')
    ).toThrow();
    expect(() =>
      parseVersions(
        "export const AI_CHAT_COMPONENTS_VERSIONS = ['v1.11.0-rc.0'];"
      )
    ).toThrow();
    expect(() =>
      parseVersions('export const AI_CHAT_COMPONENTS_VERSIONS = [];')
    ).toThrow();
  });

  test('maps latest to the first stable release without a Latest choice', () => {
    const { options, selected } = getOptions(
      locationAt('/components/storybook/tag/latest/index.html'),
      'web-components',
      versions
    );
    expect(selected).toBe('v1.11.0');
    expect(options.map((option) => option.label)).toEqual([
      'Pre-release',
      'v1.11.0',
      'v1.10.0',
    ]);
  });

  test.each(['web-components', 'react'])(
    'keeps %s links in the same Storybook',
    (flavor) => {
      const path = `/components/storybook${flavor === 'react' ? '/react' : ''}`;
      const { options, selected } = getOptions(
        locationAt(`${path}/tag/next/index.html`),
        flavor,
        versions
      );
      expect(selected).toBe('tag:next');
      expect(options.map((option) => option.href)).toEqual([
        `https://chat.carbondesignsystem.com${path}/tag/next/index.html`,
        `https://chat.carbondesignsystem.com${path}/version/v1.11.0/index.html`,
        `https://chat.carbondesignsystem.com${path}/version/v1.10.0/index.html`,
      ]);
    }
  );

  test('shows Alpha only on the alpha route', () => {
    const alpha = getOptions(
      locationAt('/components/storybook/tag/alpha/index.html'),
      'web-components',
      versions
    );
    expect(alpha.selected).toBe('tag:alpha');
    expect(alpha.options.map((option) => option.label)).toEqual([
      'Pre-release',
      'Alpha',
      ...versions,
    ]);
    expect(
      getOptions(
        locationAt('/components/storybook/version/v1.11.0/index.html'),
        'web-components',
        versions
      ).options.some((option) => option.label === 'Alpha')
    ).toBe(false);
  });

  test('keeps a directly opened version selected when history starts later', () => {
    const url = locationAt(
      '/components/storybook/version/v1.9.0-rc.1/index.html'
    );
    expect(currentVersion(url)).toEqual({
      type: 'version',
      value: 'v1.9.0-rc.1',
    });
    const { options, selected } = getOptions(url, 'web-components', versions);
    expect(selected).toBe('v1.9.0-rc.1');
    expect(options[0].href).toBe(
      'https://chat.carbondesignsystem.com/components/storybook/version/v1.9.0-rc.1/index.html'
    );
  });

  test('marks local Storybook without inventing a deployed version', () => {
    const { options, selected } = getOptions(
      locationAt('/', 'localhost'),
      'react',
      versions
    );
    expect(selected).toBe('preview');
    expect(options[0].label).toBe('Local');
  });
});
