#!/usr/bin/env node

/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const fs = require("fs");
const { execSync } = require("child_process");

/**
 * Public packages published under the `alpha` dist-tag. Each is versioned
 * independently: its alpha number is derived from what is already on npm, so
 * repeated alpha runs increment (alpha.0 -> alpha.1) without relying on any git
 * tag or committed version bump.
 */
const PACKAGES = [
  {
    name: "@carbon/ai-chat-components",
    dir: "packages/ai-chat-components",
    envKey: "COMPONENTS_ALPHA",
    baseEnvKey: "COMPONENTS_BASE",
  },
  {
    name: "@carbon/ai-chat",
    dir: "packages/ai-chat",
    envKey: "AI_CHAT_ALPHA",
    baseEnvKey: "AI_CHAT_BASE",
  },
];

const bump = process.env.BUMP === "patch" ? "patch" : "minor";

/**
 * Returns the base release version the alpha is a preview of: the next minor
 * (or patch) after the package's current stable version. e.g. 1.17.0 -> 1.18.0.
 *
 * @param {string} version The current package.json version.
 * @returns {string} The base version for the alpha prerelease.
 */
function nextBase(version) {
  const [major, minor, patch] = version.split("-")[0].split(".").map(Number);
  return bump === "patch"
    ? `${major}.${minor}.${patch + 1}`
    : `${major}.${minor + 1}.0`;
}

/**
 * Compares two plain `x.y.z` versions.
 *
 * @param {string} a The first version.
 * @param {string} b The second version.
 * @returns {number} Negative if a < b, zero if equal, positive if a > b.
 */
function compare(a, b) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let index = 0; index < 3; index++) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }
  return 0;
}

/**
 * Returns the explicit base version requested for a package, if any. Feature
 * branches often land a release or more after the next one (e.g. work on
 * `feat/prompt-line` ships in 1.19.0 while 1.18.0 is already in flight), so the
 * base cannot always be derived from the current stable version.
 *
 * @param {{ name: string, baseEnvKey: string }} pkg The package descriptor.
 * @returns {string | undefined} The requested base version, if provided.
 */
function requestedBase(pkg) {
  const value = (process.env[pkg.baseEnvKey] || "").trim();
  if (!value) {
    return undefined;
  }
  if (!/^\d+\.\d+\.\d+$/.test(value)) {
    throw new Error(
      `Invalid base version "${value}" for ${pkg.name}: expected a plain x.y.z release version with no prerelease suffix.`,
    );
  }
  return value;
}

/**
 * Fails unless the explicit base versions are given for every package or for
 * none of them. Half an override silently derives the other package's base from
 * `bump`, which pairs an alpha of one release with an alpha of another.
 *
 * @returns {void}
 */
function assertCompleteOverride() {
  const overridden = PACKAGES.filter((pkg) => requestedBase(pkg));
  if (overridden.length !== 0 && overridden.length !== PACKAGES.length) {
    const missing = PACKAGES.filter((pkg) => !requestedBase(pkg));
    throw new Error(
      `Base versions must be set for every package or none. Missing: ${missing
        .map((pkg) => `${pkg.baseEnvKey} (${pkg.name})`)
        .join(", ")}.`,
    );
  }
}

/**
 * Returns every version currently published for the given package, or an empty
 * array if the package has never been published.
 *
 * @param {string} name The npm package name.
 * @returns {string[]} The published versions.
 */
function publishedVersions(name) {
  try {
    const output = execSync(`npm view ${name} versions --json`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    // Package or its versions are not on the registry yet: start fresh.
    return [];
  }
}

/**
 * Computes the next alpha version for a package: `<base>-alpha.<n>`, where `n`
 * is one greater than the highest alpha already published for that base.
 *
 * @param {{ name: string, dir: string }} pkg The package descriptor.
 * @returns {string} The next alpha version to publish.
 */
function computeAlpha(pkg) {
  const { version } = JSON.parse(
    fs.readFileSync(`${pkg.dir}/package.json`, "utf8"),
  );
  const override = requestedBase(pkg);
  const base = override || nextBase(version);
  if (override && compare(override, version.split("-")[0]) <= 0) {
    throw new Error(
      `Base version ${override} for ${pkg.name} is not ahead of its current version ${version}.`,
    );
  }
  const alphaPattern = new RegExp(
    `^${base.replace(/\./g, "\\.")}-alpha\\.(\\d+)$`,
  );
  let highest = -1;
  for (const published of publishedVersions(pkg.name)) {
    const match = alphaPattern.exec(published);
    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  }
  return `${base}-alpha.${highest + 1}`;
}

const envLines = [];
try {
  assertCompleteOverride();
  for (const pkg of PACKAGES) {
    const alpha = computeAlpha(pkg);
    envLines.push(`${pkg.envKey}=${alpha}`);
    console.log(`${pkg.name} -> ${alpha}`);
  }
} catch (error) {
  // A bad base version is operator error, not a crash: keep the log readable.
  console.error(error.message);
  process.exit(1);
}

// Expose the computed versions to later GitHub Actions steps.
if (process.env.GITHUB_ENV) {
  fs.appendFileSync(process.env.GITHUB_ENV, `${envLines.join("\n")}\n`);
}
