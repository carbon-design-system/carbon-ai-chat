/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, relative } from 'node:path';

export function canonicalEvidencePath(path) {
  return path.replace(/\.json$/, '-canonical.json');
}

function virtualModule(id) {
  // Rollup/Vite mark virtual modules with NUL; browser externals use this named stub.
  return (
    id.startsWith('\0') ||
    id === '__vite-browser-external' ||
    id.startsWith('__vite-browser-external:')
  );
}

export async function recordCanonicalModules(consumer, path) {
  const raw = JSON.parse(await readFile(path, 'utf8'));
  const owner = await realpath(consumer);
  const physical = [];
  const virtual = [];
  for (const id of raw) {
    if (virtualModule(id)) {
      virtual.push(id);
      continue;
    }
    assert.ok(
      isAbsolute(id),
      `Unrecognized nonphysical production module ID: ${id}`
    );
    const canonical = await realpath(id.split('?')[0]);
    const local = relative(owner, canonical);
    assert.ok(
      !local.startsWith('..') && !isAbsolute(local),
      `Production module escaped its canonical consumer ${owner}: ${id} → ${canonical}`
    );
    physical.push({ raw: id, canonical });
  }
  const evidence = { consumer: owner, physical, virtual };
  await writeFile(
    canonicalEvidencePath(path),
    JSON.stringify(evidence, null, 2)
  );
  return evidence;
}
