/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

const SITE_ORIGIN = 'https://chat.carbondesignsystem.com';
const SITE_HOSTNAME = new URL(SITE_ORIGIN).hostname;
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0'];
const STABLE_VERSION = /^v\d+\.\d+\.\d+$/;
const DIRECT_VERSION = /^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export function parseVersions(source) {
  const match = source.match(
    /export\s+const\s+AI_CHAT_COMPONENTS_VERSIONS\s*=\s*(\[[\s\S]*?\]);?/
  );
  if (!match) {
    throw new Error('Components versions are missing');
  }

  const versions = JSON.parse(
    match[1].replace(/'/g, '"').replace(/,\s*\]/g, ']')
  );
  if (
    !Array.isArray(versions) ||
    versions.length === 0 ||
    versions.some((version) => !STABLE_VERSION.test(version))
  ) {
    throw new Error('Components versions are invalid');
  }

  return [...new Set(versions)];
}

export function currentVersion(location) {
  if (
    location.hostname !== SITE_HOSTNAME &&
    !LOCAL_HOSTNAMES.includes(location.hostname)
  ) {
    return { type: 'preview', value: 'Preview' };
  }

  const path = location.pathname;
  const version = path.match(/\/version\/([^/]+)\//)?.[1];
  if (version && DIRECT_VERSION.test(version)) {
    return { type: 'version', value: version };
  }

  const tag = path.match(/\/tag\/(latest|next|alpha)\//)?.[1];
  if (tag) {
    return { type: 'tag', value: tag };
  }

  return {
    type: 'preview',
    value: LOCAL_HOSTNAMES.includes(location.hostname) ? 'Local' : 'Preview',
  };
}

export function getOptions(location, flavor, versions) {
  const current = currentVersion(location);
  const base = `${SITE_ORIGIN}/components/storybook${flavor === 'react' ? '/react' : ''}`;
  const options = [
    {
      value: 'tag:next',
      label: 'Pre-release',
      href: `${base}/tag/next/index.html`,
    },
  ];

  if (current.type === 'tag' && current.value === 'alpha') {
    options.push({
      value: 'tag:alpha',
      label: 'Alpha',
      href: `${base}/tag/alpha/index.html`,
    });
  }

  options.push(
    ...versions.map((version) => ({
      value: version,
      label: version,
      href: `${base}/version/${version}/index.html`,
    }))
  );

  if (current.type === 'version' && !versions.includes(current.value)) {
    options.unshift({
      value: current.value,
      label: current.value,
      href: `${base}/version/${current.value}/index.html`,
    });
  }

  if (current.type === 'preview') {
    options.unshift({
      value: 'preview',
      label: current.value,
      href: location.href,
    });
  }

  const selected =
    current.type === 'preview'
      ? 'preview'
      : current.type === 'version'
        ? current.value
        : current.value === 'latest'
          ? versions[0]
          : `tag:${current.value}`;

  return { options, selected };
}
