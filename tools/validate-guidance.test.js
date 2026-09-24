/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

function write(root, file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function skill(body, name = 'caic-fixture') {
  return `---\nname: ${name}\ndescription: Validate guidance fixtures.\n---\n${body}\n`;
}

function mirrors(root) {
  for (const mirror of ['.agents/skills', '.claude/skills']) {
    fs.cpSync(path.join(root, '.bob/skills'), path.join(root, mirror), {
      recursive: true,
    });
  }
}

function fixture(context) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'guidance-test-'));
  context.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const root = path.join(temporary, 'repo');
  fs.mkdirSync(path.join(root, 'tools'), { recursive: true });
  for (const file of [
    'guidance-links-lib.js',
    'validate-agents-docs.js',
    'validate-skills.js',
  ]) {
    fs.copyFileSync(path.join(__dirname, file), path.join(root, 'tools', file));
  }
  write(root, 'AGENTS.md', '# Fixture\n');
  write(root, '.bob/skills/caic-fixture/SKILL.md', skill('# Fixture'));
  return root;
}

function run(root, cli, expected, diagnostic) {
  const result = spawnSync(process.execPath, [path.join(root, 'tools', cli)], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.ifError(result.error);
  const output = `${result.stdout}${result.stderr}`;
  assert.equal(result.status, expected, output);
  if (diagnostic) {
    assert.match(output, diagnostic);
  }
  return output;
}

const validators = [
  { cli: 'validate-agents-docs.js', source: 'nested/AGENTS.md' },
  { cli: 'validate-skills.js', source: '.bob/skills/caic-fixture/SKILL.md' },
];

function guidance(root, source, body) {
  write(root, source, source.endsWith('SKILL.md') ? skill(body) : body);
  mirrors(root);
}

for (const { cli, source } of validators) {
  test(`${cli}: valid local links and duplicate heading anchors`, (context) => {
    const root = fixture(context);
    write(
      root,
      path.join(path.dirname(source), 'other guide.md'),
      '# Résumé\n'
    );
    guidance(
      root,
      source,
      '# Repeat\n# Repeat\n# Repeat-1\n' +
        '[self](#repeat) [duplicate](#repeat-1) [collision](#repeat-1-1)\n' +
        '[cross](<other guide.md#r%C3%A9sum%C3%A9>)\n' +
        '[line](other%20guide.md:12#r%C3%A9sum%C3%A9)\n' +
        '[external](https://example.com/missing#missing) [mail](mailto:dev@example.com)\n'
    );
    run(root, cli, 0);
  });

  test(`${cli}: wrong relative path cannot resolve by basename`, (context) => {
    const root = fixture(context);
    write(root, 'guide.md', '# Present elsewhere\n');
    guidance(root, source, '[wrong](guide.md)\n');
    run(root, cli, 1, /guide\.md.*does not resolve relative/);
  });

  test(`${cli}: backtick paths keep repo-root prose conventions`, (context) => {
    const root = fixture(context);
    write(root, 'guide.md', '# Repo-root guide\n');
    guidance(root, source, '`guide.md`\n');
    run(root, cli, 0);
  });

  test(`${cli}: line suffixes do not hide broken files or anchors`, (context) => {
    const root = fixture(context);
    write(root, path.join(path.dirname(source), 'other.md'), '# Present\n');
    guidance(
      root,
      source,
      '[missing](missing.md:12) [bad](other.md:12#absent)\n'
    );
    const output = run(
      root,
      cli,
      1,
      /missing.md:12.*does not resolve relative/
    );
    assert.match(output, /other.md:12#absent.*no heading anchored at #absent/);
    guidance(root, source, '[valid](other.md:12#present)\n');
    run(root, cli, 0);
  });

  for (const destination of ['#missing', 'other.md#missing']) {
    test(`${cli}: rejects missing anchor ${destination}`, (context) => {
      const root = fixture(context);
      write(root, path.join(path.dirname(source), 'other.md'), '# Present\n');
      guidance(root, source, `# Present\n[wrong](${destination})\n`);
      run(root, cli, 1, /no heading anchored at #missing/);
    });
  }

  test(`${cli}: fenced examples do not add links or headings`, (context) => {
    const root = fixture(context);
    const examples =
      '````md\n# Example\n```\n[wrong](missing.md)\n````\n' +
      '~~~md\n# Tilde\n[wrong](also-missing.md)\n~~~\n';
    guidance(root, source, examples);
    run(root, cli, 0);
    guidance(root, source, `${examples}\n[wrong](#example)\n[wrong](#tilde)\n`);
    const output = run(root, cli, 1, /no heading anchored at #example/);
    assert.match(output, /no heading anchored at #tilde/);
  });

  test(`${cli}: a heading after a closed fence is checked`, (context) => {
    const root = fixture(context);
    guidance(
      root,
      source,
      '```md\n# Hidden\n```\n## Visible\n[ok](#visible)\n'
    );
    run(root, cli, 0);
  });

  test(`${cli}: rejects links through outside-directory symlinks`, (context) => {
    const root = fixture(context);
    write(path.dirname(root), 'outside/guide.md', '# Outside\n');
    fs.mkdirSync(path.join(root, path.dirname(source)), { recursive: true });
    fs.symlinkSync(
      path.join(path.dirname(root), 'outside'),
      path.join(root, path.dirname(source), 'linked'),
      'dir'
    );
    guidance(root, source, '[outside](linked/guide.md)\n');
    run(root, cli, 1, /symlink outside the repository/);
  });
}

test('AGENTS file references ignore fenced paths but warn on prose paths', (context) => {
  const root = fixture(context);
  const examples =
    '```md\n`missing.ts`\n```\n' + '~~~md\n`also-missing.ts`\n~~~\n';
  write(root, 'AGENTS.md', examples);
  const fencedOutput = run(root, 'validate-agents-docs.js', 0);
  assert.doesNotMatch(fencedOutput, /File reference may be outdated/);

  write(root, 'AGENTS.md', `${examples}\n\`missing.ts\`\n`);
  const proseOutput = run(
    root,
    'validate-agents-docs.js',
    0,
    /File reference may be outdated: `missing\.ts`/
  );
  assert.match(proseOutput, /Validation complete: 0 errors, 1 warnings/);
});

test('AGENTS discovery checks unlinked and hidden entry points and their topics', (context) => {
  const root = fixture(context);
  write(root, 'nested/AGENTS.md', '[bad](missing.md)\n');
  write(root, '.config/AGENTS.md', '[topic](references/topic.md)\n');
  write(root, '.config/references/topic.md', '[bad](absent.md)\n');
  const output = run(root, 'validate-agents-docs.js', 1, /nested\/AGENTS.md/);
  assert.match(output, /\.config\/references\/topic.md.*absent.md/);
});

test('AGENTS discovery skips artifacts, drafts, mirrors, and directory symlinks', (context) => {
  const root = fixture(context);
  for (const directory of [
    '.git',
    'node_modules',
    'nested/dist',
    'nested/es',
    'nested/es-custom',
    'nested/lib',
    'nested/umd',
    'nested/build',
    'nested/coverage',
    'nested/.nyc_output',
    'nested/.parcel-cache',
    'nested/.next',
    'nested/generated_docs',
    'nested/storybook-static',
    'nested/storybook-react-static',
    '.agents/skills',
    '.claude/skills',
    '.bob/skills/carbon-builder',
    '.github/plan-drafts',
    '.github/pr-drafts',
    '.github/issue-drafts',
    '.github/adr-drafts',
    'packages/ai-chat/docs/api/markdown',
  ]) {
    write(root, `${directory}/AGENTS.md`, '[bad](missing.md)\n');
  }
  write(path.dirname(root), 'outside/AGENTS.md', '[bad](missing.md)\n');
  fs.symlinkSync(
    path.join(path.dirname(root), 'outside'),
    path.join(root, 'linked'),
    'dir'
  );
  write(root, 'AGENTS.md', '[generated](nested/dist/AGENTS.md)\n');
  run(root, 'validate-agents-docs.js', 0, /Checked 1 AGENTS.md files/);
});

test('AGENTS per-file budget remains 12 KiB', (context) => {
  const root = fixture(context);
  write(root, 'AGENTS.md', 'x'.repeat(12 * 1024));
  run(root, 'validate-agents-docs.js', 0);
  write(root, 'AGENTS.md', 'x'.repeat(12 * 1024 + 1));
  run(root, 'validate-agents-docs.js', 1, /12.0 KiB per-file budget/);
});

test('AGENTS ancestor chain budget remains 28 KiB', (context) => {
  const root = fixture(context);
  write(root, 'AGENTS.md', 'x'.repeat(10 * 1024));
  write(root, 'nested/AGENTS.md', 'x'.repeat(10 * 1024));
  write(root, 'nested/leaf/AGENTS.md', 'x'.repeat(8 * 1024));
  run(root, 'validate-agents-docs.js', 0);
  write(root, 'nested/leaf/AGENTS.md', 'x'.repeat(8 * 1024 + 1));
  run(root, 'validate-agents-docs.js', 1, /28.0 KiB chain budget/);
});

test('owned skill files retain the 12 KiB budget', (context) => {
  const root = fixture(context);
  const prefix = skill('');
  const file = '.bob/skills/caic-fixture/SKILL.md';
  write(root, file, prefix + 'x'.repeat(12 * 1024 - Buffer.byteLength(prefix)));
  mirrors(root);
  run(root, 'validate-skills.js', 0);
  fs.appendFileSync(path.join(root, file), 'x');
  mirrors(root);
  run(root, 'validate-skills.js', 1, /12.0 KiB per-file budget/);
});

test('skill frontmatter and mirror protections remain active', (context) => {
  const root = fixture(context);
  guidance(root, '.bob/skills/caic-fixture/SKILL.md', '# Valid\n');
  write(root, '.agents/skills/caic-fixture/SKILL.md', 'different');
  run(root, 'validate-skills.js', 1, /Differs from the canonical copy/);
  write(
    root,
    '.bob/skills/caic-fixture/SKILL.md',
    '---\nname: wrong\ndescription: invalid: value\n---\n'
  );
  mirrors(root);
  const output = run(
    root,
    'validate-skills.js',
    1,
    /must match the directory name/
  );
  assert.match(output, /YAML reads as a nested mapping/);
});

test('skill references and collection README links receive strict checks', (context) => {
  const root = fixture(context);
  write(root, '.bob/skills/README.md', '[bad](#absent)\n');
  write(
    root,
    '.bob/skills/caic-fixture/references/rule.md',
    '[bad](#missing)\n'
  );
  mirrors(root);
  const output = run(root, 'validate-skills.js', 1, /README.md.*#absent/);
  assert.match(output, /references\/rule.md.*#missing/);
});

test('vendored skills retain shape and mirror checks but not owned content rules', (context) => {
  const root = fixture(context);
  write(
    root,
    '.bob/skills/carbon-builder/SKILL.md',
    skill('[bad](missing.md)\n' + 'x'.repeat(13 * 1024), 'carbon-builder')
  );
  mirrors(root);
  run(root, 'validate-skills.js', 0);
  write(root, '.bob/skills/carbon-builder/SKILL.md', 'missing frontmatter');
  mirrors(root);
  run(root, 'validate-skills.js', 1, /frontmatter block/);
});
