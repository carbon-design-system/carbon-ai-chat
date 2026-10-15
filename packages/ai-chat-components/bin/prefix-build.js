/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Copied from Carbon v12.0.0-alpha.3, commit
 * 659c96584a68027d391458b4d9c3dac479e1e357:
 * https://github.com/carbon-design-system/carbon/blob/659c96584a68027d391458b4d9c3dac479e1e357/packages/web-components/bin/create-prefixed-build.js
 *
 * Local adapters preserve module and map filenames, redirect installed child
 * package edges, and copy their declarations and advertised metadata.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  copyLayer,
  createLayout,
  layoutReceipt,
  transformFile,
  writeLayerMetadata,
} from './prefix-layout.js';

function helpFor(name) {
  const command = `create-${name}-prefixed-build`;
  return `
${command} — generate a custom-prefixed @carbon/${name} build

Usage:
  ${command} --prefix <prefix> [options]

Options:
  --prefix <prefix>   Required. Tag prefix to use (e.g. "foo" -> <foo-button>).
                      Lowercase letters, digits, hyphens; must start with a letter.
  --out <dir>         Output directory, in your project (committed or generated
                      in your build). Default: ./<prefix>-${name}.
                      Replaces the selected output directory and its contents.
  --src <dir>         Source ESM build to copy for @carbon/${name} only.
                      Default: this package's ./${name === 'ai-chat' ? 'dist/es' : 'es'}.
                      Child packages resolve from this installed package.
  --help              Show this help.

Example:
  npx -p @carbon/${name} ${command} --prefix foo --out ./vendor/${name}-foo

The output contains web-components/ and ai-chat-components/${name === 'ai-chat' ? ', plus ai-chat/' : ''}.
Each tree keeps its source filenames. The command prints its available entries.
Shared --cds design tokens remain unchanged. React, Lit, and other external
packages remain normal dependencies of your project.

Note: write to your project (not node_modules — it is ephemeral and read-only
under pnpm / Yarn PnP). Regenerate it as part of your build if not committed.
`;
}

function parseArgs(argv) {
  const args = {
    prefix: undefined,
    out: undefined,
    src: undefined,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      args.help = true;
    } else if (a === '--prefix') {
      args.prefix = argv[++i];
    } else if (a === '--out') {
      args.out = argv[++i];
    } else if (a === '--src') {
      args.src = argv[++i];
    } else {
      process.stderr.write(`Unknown argument: ${a}\n`);
      process.exit(1);
    }
  }
  return args;
}

const isValidPrefix = (p) => /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(p);

async function walk(dir) {
  const acc = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      acc.push(...(await walk(p)));
    } else {
      acc.push(p);
    }
  }
  return acc;
}

export async function run({ packageRoot, argv = process.argv.slice(2) }) {
  const metadata = JSON.parse(
    await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8')
  );
  const name = metadata.name.slice('@carbon/'.length);
  const HELP = helpFor(name);
  const { prefix, out, src, help } = parseArgs(argv);

  if (help) {
    process.stdout.write(HELP);
    return undefined;
  }
  if (!prefix) {
    process.stderr.write('Error: --prefix is required.\n' + HELP);
    process.exit(1);
  }
  if (!isValidPrefix(prefix)) {
    process.stderr.write(
      `Error: invalid --prefix "${prefix}". Use lowercase letters, digits, and hyphens, starting with a letter (e.g. "foo").\n`
    );
    process.exit(1);
  }
  if (prefix === 'cds') {
    process.stderr.write(
      'Error: --prefix "cds" is the default; choose a different prefix.\n'
    );
    process.exit(1);
  }

  const DEFAULT_SRC = path.resolve(
    packageRoot,
    name === 'ai-chat' ? 'dist/es' : 'es'
  );
  const source = src ? path.resolve(src) : DEFAULT_SRC;
  try {
    await fs.access(source);
  } catch {
    process.stderr.write(`Error: source build not found at ${source}.\n`);
    process.exit(1);
  }

  const dest = path.resolve(out ?? `${prefix}-${name}`);
  const layers = await createLayout(
    packageRoot,
    dest,
    src ? source : undefined
  );

  await fs.rm(dest, { recursive: true, force: true });
  for (const layer of layers) {
    await copyLayer(layer);
  }

  let changed = 0;
  for (const layer of layers) {
    for (const file of await walk(layer.destination)) {
      if (await transformFile(file, layer, layers, prefix)) {
        changed++;
      }
    }
    await writeLayerMetadata(layer, layers, prefix);
  }

  process.stdout.write(
    `Created prefixed build: cds -> ${prefix}\n` +
      `  output:  ${dest}\n` +
      `  files:   ${changed} re-prefixed\n` +
      `Point your imports at the generated entries:\n`
  );
  for (const layer of layers) {
    if (layer.entry) {
      process.stdout.write(
        `  import '${path.relative(process.cwd(), layer.entry)}';\n`
      );
    }
  }
  return { prefix, output: dest, layers: layoutReceipt(layers) };
}
