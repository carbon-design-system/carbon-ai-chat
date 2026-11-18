/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import {
  mkdir,
  readFile,
  readdir,
  realpath,
  writeFile,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const packageName = '@carbon/ai-chat-components';
const barrelSpecifier = `${packageName}/react`;

/**
 * Lists each module the packed React barrel re-exports from, with one
 * re-exported binding to import it by: `local` in the module, `exported` in
 * the barrel.
 */
async function barrelModules(packageRoot) {
  const source = await readFile(join(packageRoot, 'es/react/index.js'), 'utf8');
  const modules = new Map();
  for (const [, list, file] of source.matchAll(
    /export\s*\{([^}]*)\}\s*from\s*['"]\.\/([^'"]+)['"]/g
  )) {
    const [local, exported = local] = list
      .split(',')[0]
      .trim()
      .split(/\s+as\s+/);
    if (local && !modules.has(file)) {
      modules.set(file, { local, exported });
    }
  }
  for (const [, file] of source.matchAll(
    /export\s*\*\s*from\s*['"]\.\/([^'"]+)['"]/g
  )) {
    assert.fail(
      `es/react/index.js re-exports ./${file} with export *, which this proof cannot name. Build the barrel with named re-exports.`
    );
  }
  return modules;
}

async function wrapperFiles(directory, root = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!['__tests__', 'utils'].includes(entry.name)) {
        files.push(...(await wrapperFiles(path, root)));
      }
    } else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
      files.push(relative(root, path).split('\\').join('/'));
    }
  }
  return files;
}

async function bundledModules(vite, consumer, packageRoot, name, source) {
  const directory = join(consumer, 'react-barrel');
  await mkdir(directory, { recursive: true });
  const entry = join(directory, `${name}.js`);
  await writeFile(entry, source);
  const result = await vite.build({
    configFile: false,
    logLevel: 'silent',
    root: consumer,
    build: {
      write: false,
      minify: false,
      lib: { entry, formats: ['es'], fileName: name },
      rollupOptions: {
        external: (id) =>
          !id.startsWith('.') &&
          !id.startsWith('/') &&
          !id.startsWith(packageName),
      },
    },
  });
  const chunks = (Array.isArray(result) ? result[0] : result).output.filter(
    (item) => item.type === 'chunk'
  );
  const modules = chunks
    .flatMap((chunk) => chunk.moduleIds ?? Object.keys(chunk.modules))
    .filter((id) => id.startsWith(`${packageRoot}/`))
    .map((id) => id.slice(packageRoot.length + 1))
    .filter((id) => id !== 'es/react/index.js');
  // Carbon and other packages stay external, so compare what each bundle
  // imports from them too.
  // imports and dynamicImports also name this build's own split chunks, whose
  // hashes differ between the two entries; leave those out.
  const emitted = new Set(chunks.map((chunk) => chunk.fileName));
  const external = chunks
    .flatMap((chunk) => [...chunk.imports, ...chunk.dynamicImports])
    .filter((id) => !emitted.has(id));
  return {
    modules: [...new Set(modules)].sort(),
    external: [...new Set(external)].sort(),
  };
}

/**
 * Importing one binding through `@carbon/ai-chat-components/react` must bundle
 * exactly what its deep `es/react/*.js` import bundles: its own component and
 * registration, the same external imports, and no other wrapper.
 */
export async function assertReactBarrelShaking({ consumer }) {
  const packageRoot = await realpath(
    join(consumer, 'node_modules', packageName)
  );
  const require = createRequire(join(consumer, 'package.json'));
  const vite = await import(pathToFileURL(require.resolve('vite')).href);
  const modules = await barrelModules(packageRoot);
  assert.deepEqual(
    (await wrapperFiles(join(packageRoot, 'es/react'))).filter(
      (file) => !modules.has(file)
    ),
    [],
    `${barrelSpecifier} must re-export every React wrapper and hook module.`
  );
  // vite.build sets process.env.NODE_ENV to production, and every npm the
  // harness spawns later would inherit it and skip devDependencies.
  const nodeEnv = process.env.NODE_ENV;
  try {
    for (const [file, { local, exported }] of modules) {
      const deepPath = `${packageName}/es/react/${file}`;
      const deep = await bundledModules(
        vite,
        consumer,
        packageRoot,
        `${exported}-deep`,
        `import { ${local} as binding } from '${deepPath}';\nglobalThis.binding = binding;\n`
      );
      const shaken = await bundledModules(
        vite,
        consumer,
        packageRoot,
        `${exported}-barrel`,
        `import { ${exported} as binding } from '${barrelSpecifier}';\nglobalThis.binding = binding;\n`
      );
      assert.ok(
        deep.modules.includes(`es/react/${file}`),
        `${deepPath}: the deep import must bundle its own module.`
      );
      assert.deepEqual(
        shaken,
        deep,
        `${exported}: importing it from ${barrelSpecifier} must bundle the same modules and external imports as ${deepPath}.`
      );
    }
    process.stdout.write(
      `React barrel: ${modules.size} wrapper and hook modules bundle the same through ${barrelSpecifier} as through their deep paths.\n`
    );
  } finally {
    if (nodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = nodeEnv;
    }
  }
}
