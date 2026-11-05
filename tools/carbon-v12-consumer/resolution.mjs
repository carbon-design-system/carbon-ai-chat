/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as sass from 'sass';
import ts from 'typescript';
import { componentEntries } from './entry-paths.mjs';
import { eventContractSource } from './event-contracts.mjs';
import { propertyContractSource } from './property-contracts.mjs';

const consumerSource = `
import { createElement, type ComponentProps, type ComponentType, type ReactElement } from 'react';
import { Card as AggregateCard } from '@carbon/ai-chat-components/es';
import CanonicalCard from '@carbon/ai-chat-components/es/components/aichat-card/aichat-card.js';
import { Card as BarrelCard } from '@carbon/ai-chat-components/es/components/aichat-card/index.js';
import PureContainerHost from '@carbon/ai-chat/es/web-components/cds-aichat-container/cds-aichat-container.js';
import PureOuterHost from '@carbon/ai-chat/es/web-components/cds-aichat-custom-element/cds-aichat-custom-element.js';
import CardElement from '@carbon/ai-chat-components/es/components/card/src/card.js';
import '@carbon/ai-chat-components/es/components/card/index.js';
import { AudioPlayer as AudioPlayerElement, Transcript as TranscriptElement } from '@carbon/ai-chat-components/es/components/audio-player/index.js';
import TranscriptDefault, { Transcript } from '@carbon/ai-chat-components/es/react/transcript.js';
import AudioPlayerDefault, { AudioPlayer } from '@carbon/ai-chat-components/es/react/audio-player.js';
import CardDefault, { Card, CardFooter, CardSteps } from '@carbon/ai-chat-components/es/react/card.js';
import Autocomplete from '@carbon/ai-chat-components/es/react/autocomplete.js';
import { HistoryShell, HistoryHeader, HistoryToolbar, HistoryContent, HistoryLoading, HistoryPanel, HistoryPanelMenu, HistoryPanelItem, HistoryPanelItems, HistorySearchItem, HistoryPanelItemInput, HistoryDeletePanel } from '@carbon/ai-chat-components/es/react/history/index.js';
import prefix, { prefix as namedPrefix } from '@carbon/ai-chat-components/es/globals/settings.js';
import { defineCustomElement, type DefineCustomElementOptions, type CarbonCustomElementConstructor } from '@carbon/ai-chat-components/es/globals/register.js';
import type componentsManifest from '@carbon/ai-chat-components/custom-elements.json';
import type chatManifest from '@carbon/ai-chat/custom-elements.json';
import * as ChatRoot from '@carbon/ai-chat';
import * as ChatEs from '@carbon/ai-chat/es';
import * as ChatEntry from '@carbon/ai-chat/es/aiChatEntry.js';
import * as ChatServer from '@carbon/ai-chat/server';
import * as ChatServerEntry from '@carbon/ai-chat/es/serverEntry.js';
import ContainerHost from '@carbon/ai-chat/es/web-components/cds-aichat-container/index.js';
import CustomElementHost from '@carbon/ai-chat/es/web-components/cds-aichat-custom-element/index.js';
import OriginalContainerHost from '@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js';
import OriginalCustomElementHost from '@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js';

const canonical: typeof CardElement = CanonicalCard;
const barrel: typeof CardElement = BarrelCard;
const pureContainer: typeof ContainerHost = PureContainerHost;
const pureOuter: typeof CustomElementHost = PureOuterHost;
const card = new CardElement();
card.isFlush = true;
// @ts-expect-error The packed class must retain its Boolean property type.
card.isFlush = 'yes';
const aggregateCard: CardElement = new AggregateCard();
aggregateCard.isFlush = true;
const audio: AudioPlayerElement = new AudioPlayerElement();
const transcript: TranscriptElement = new TranscriptElement();
transcript.text = 'Transcript';
transcript.expanded = true;

const transcriptProps: ComponentProps<typeof Transcript> = { text: 'Transcript', expanded: true };
// @ts-expect-error Transcript retains its Boolean property type.
const invalidTranscriptProps: ComponentProps<typeof Transcript> = { expanded: 'yes' };
const wrappers: ReactElement[] = [
  createElement(TranscriptDefault, transcriptProps),
  createElement(Transcript, { expanded: true }),
  createElement(AudioPlayerDefault), createElement(AudioPlayer),
  createElement(CardDefault, { isFlush: true }), createElement(Card),
  createElement(CardFooter), createElement(CardSteps), createElement(Autocomplete),
  createElement(HistoryShell), createElement(HistoryHeader),
  createElement(HistoryToolbar), createElement(HistoryContent),
  createElement(HistoryLoading), createElement(HistoryPanel),
  createElement(HistoryPanelMenu), createElement(HistoryPanelItem),
  createElement(HistoryPanelItems), createElement(HistorySearchItem),
  createElement(HistoryPanelItemInput), createElement(HistoryDeletePanel),
];
// @ts-expect-error A component export must not collapse to any.
const invalidCard: typeof Card = 1;

class ConsumerElement extends HTMLElement { static is = 'packed-resolution-element'; }
const constructor: CarbonCustomElementConstructor = ConsumerElement;
const options: DefineCustomElementOptions = { name: ConsumerElement.is, registry: customElements };
const registered: typeof ConsumerElement = defineCustomElement(ConsumerElement, options);
// @ts-expect-error Helper options must retain their published string constraint.
const invalidOptions: DefineCustomElementOptions = { name: 1 };
const defaultPrefix: 'cds' = prefix;
const namedPrefixType: typeof prefix = namedPrefix;
const defaultPrefixType: typeof namedPrefix = prefix;
const componentSchema: typeof componentsManifest.schemaVersion = '1.0.0';
const chatSchema: typeof chatManifest.schemaVersion = '1.0.0';

const rootApi: typeof ChatRoot = ChatEs;
const esApi: typeof ChatEs = ChatRoot;
const entryApi: typeof ChatRoot = ChatEntry;
const serverApi: typeof ChatServer = ChatServerEntry;
const containerConstructor: CustomElementConstructor = ContainerHost;
const outerConstructor: CustomElementConstructor = CustomElementHost;
const oldContainer: typeof ContainerHost = OriginalContainerHost;
const oldOuter: typeof CustomElementHost = OriginalCustomElementHost;
const container = new ContainerHost();
const outer = new CustomElementHost();
const containerTag: string = ContainerHost.is;
const outerTag: string = CustomElementHost.is;
container.aiEnabled = true;
container.openChatByDefault = true;
outer.aiEnabled = true;
outer.header = { title: 'Packed host' };
createElement(ChatRoot.ChatContainer, { openChatByDefault: true });
createElement(ChatEs.ChatContainer, { openChatByDefault: true });
// @ts-expect-error Browser host defaults are HTMLElement constructors, not React wrappers.
const hostAsReact: ComponentType<any> = ContainerHost;
// @ts-expect-error The outer host is also an HTMLElement constructor.
const outerAsReact: ComponentType<any> = CustomElementHost;
// @ts-expect-error The React root wrapper is not the browser host constructor.
const reactAsHost: typeof ContainerHost = ChatRoot.ChatContainer;
// @ts-expect-error Aggregate classes are HTMLElement constructors, not React wrappers.
const aggregateAsReact: ComponentType<any> = AggregateCard;
// @ts-expect-error Host instance properties retain their Boolean contract.
outer.aiEnabled = 'yes';

export { canonical, barrel, pureContainer, pureOuter, card, aggregateCard, audio, transcript, wrappers, constructor, registered, defaultPrefix, namedPrefixType, defaultPrefixType, componentSchema, chatSchema, rootApi, esApi, entryApi, serverApi, containerConstructor, outerConstructor, oldContainer, oldOuter, container, outer, containerTag, outerTag };
`;

async function assertPackageAliases(consumer) {
  const require = createRequire(join(consumer, 'package.json'));
  const componentRoot = join(
    consumer,
    'node_modules/@carbon/ai-chat-components'
  );
  const chatRoot = join(consumer, 'node_modules/@carbon/ai-chat');
  const components = JSON.parse(
    await readFile(join(componentRoot, 'package.json'), 'utf8')
  );
  const chat = JSON.parse(
    await readFile(join(chatRoot, 'package.json'), 'utf8')
  );
  assert.equal(
    Object.hasOwn(components.exports, '.'),
    false,
    'Components must not expose a bare package root.'
  );
  for (const path of ['carbon-element.js', 'index.js']) {
    assert.throws(
      () =>
        require.resolve(
          `@carbon/ai-chat-components/es/globals/decorators/${path}`
        ),
      { code: 'MODULE_NOT_FOUND' },
      'The removed decorator entry must fail packed resolution.'
    );
  }
  assert.throws(() => require.resolve('@carbon/ai-chat-components'), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
  });
  assert.deepEqual(chat.exports['./es'], chat.exports['.']);
  assert.deepEqual(chat.exports['./es/aiChatEntry.js'], chat.exports['.']);
  assert.deepEqual(
    chat.exports['./es/serverEntry.js'],
    chat.exports['./server']
  );
  assert.equal(chat.exports['./es/*'], './dist/es/*');
  assert.equal(chat.exports['./dist/es/*'], './dist/es/*');
  const hostSpecifiers = [
    'cds-aichat-container',
    'cds-aichat-custom-element',
  ].flatMap((host) => [
    `@carbon/ai-chat/es/web-components/${host}/index.js`,
    `@carbon/ai-chat/dist/es/web-components/${host}/index.js`,
  ]);
  const hostUrls = JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `process.stdout.write(JSON.stringify(${JSON.stringify(hostSpecifiers)}.map((specifier) => import.meta.resolve(specifier))));`,
      ],
      { cwd: consumer, encoding: 'utf8' }
    )
  );
  for (const host of ['cds-aichat-container', 'cds-aichat-custom-element']) {
    const alias = `./es/web-components/${host}/index.js`;
    const original = `./dist/es/web-components/${host}/index.js`;
    assert.deepEqual(chat.exports[alias], chat.exports[original]);
    assert.equal(
      chat.exports[alias].types,
      `./dist/types/web-components/${host}/index.d.ts`
    );
    assert.equal(
      hostUrls[hostSpecifiers.indexOf(`@carbon/ai-chat/${alias.slice(2)}`)],
      hostUrls[hostSpecifiers.indexOf(`@carbon/ai-chat/${original.slice(2)}`)]
    );
  }
  const chunk = (await readdir(join(chatRoot, 'dist/es'))).find(
    (name) =>
      name.endsWith('.js') &&
      !['aiChatEntry.js', 'serverEntry.js'].includes(name)
  );
  assert.ok(
    chunk,
    'The packed app must contain a runtime chunk for the wildcard alias proof.'
  );
  assert.equal(
    await realpath(require.resolve(`@carbon/ai-chat/es/${chunk}`)),
    await realpath(require.resolve(`@carbon/ai-chat/dist/es/${chunk}`))
  );
  const settings = await import(
    pathToFileURL(
      require.resolve('@carbon/ai-chat-components/es/globals/settings.js')
    ).href
  );
  assert.equal(settings.default, settings.prefix);
  assert.equal(settings.prefix, 'cds');
  await writeFile(
    join(consumer, 'resolution-aliases.json'),
    JSON.stringify(
      {
        componentBareRoot: false,
        prefix: settings.prefix,
        wildcardChunk: chunk,
        hostAliases: true,
      },
      null,
      2
    )
  );
}

async function assertLegacyPrefixRemoval(consumer) {
  const require = createRequire(join(consumer, 'package.json'));
  for (const name of ['@carbon/ai-chat', '@carbon/ai-chat-components']) {
    const metadata = JSON.parse(
      await readFile(
        join(consumer, 'node_modules', name, 'package.json'),
        'utf8'
      )
    );
    for (const field of ['exports', 'files', 'typesVersions', 'sideEffects']) {
      assert.doesNotMatch(
        JSON.stringify(metadata[field] ?? {}),
        /es-custom/,
        `${name}: ${field} must not advertise the removed output.`
      );
    }
  }
  const specifiers = [
    '@carbon/ai-chat/es-custom',
    '@carbon/ai-chat/dist/es-custom/aiChatEntry.js',
    '@carbon/ai-chat/dist/es-custom/web-components/cds-aichat-container/index.js',
    '@carbon/ai-chat-components/es-custom',
    '@carbon/ai-chat-components/es-custom/components/card/index.js',
    '@carbon/ai-chat-components/es-custom/globals/decorators/carbon-element.js',
    '@carbon/ai-chat-components/es-custom/globals/decorators/index.js',
  ];
  for (const specifier of specifiers) {
    assert.throws(() => require.resolve(specifier), {
      code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
    });
  }
  const failures = JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `process.stdout.write(JSON.stringify(${JSON.stringify(specifiers)}.map((specifier) => { try { return { specifier, resolved: import.meta.resolve(specifier) }; } catch (error) { return { specifier, code: error.code }; } })));`,
      ],
      { cwd: consumer, encoding: 'utf8' }
    )
  );
  assert.deepEqual(
    failures,
    specifiers.map((specifier) => ({
      specifier,
      code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
    }))
  );
  await writeFile(
    join(consumer, 'removed-prefix-resolution.json'),
    JSON.stringify(
      { failures, metadata: 'No legacy exports or files.' },
      null,
      2
    )
  );
}

async function compileConsumerTypes(consumer, name, module, moduleResolution) {
  const fixture = join(consumer, 'resolution.ts');
  const options = {
    module,
    moduleResolution,
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
    resolveJsonModule: true,
    esModuleInterop: true,
    noUncheckedSideEffectImports: true,
  };
  const program = ts.createProgram([fixture], options);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => consumer,
    getCanonicalFileName: (path) => path,
    getNewLine: () => '\n',
  });
  await writeFile(join(consumer, `resolution-${name}.log`), formatted);
  assert.equal(
    diagnostics.length,
    0,
    `${name}: packed consumer type errors:\n${formatted}`
  );

  const installed = await realpath(join(consumer, 'node_modules'));
  const imports = [];
  for (const statement of program.getSourceFile(fixture).statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !statement.moduleSpecifier.text.startsWith('@carbon/')
    ) {
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    const result = ts.resolveModuleName(
      specifier,
      fixture,
      options,
      ts.sys,
      undefined,
      undefined,
      ts.ModuleKind.ESNext
    ).resolvedModule;
    assert.ok(result, `${name}: unresolved packed import ${specifier}.`);
    const path = await realpath(result.resolvedFileName);
    assert.ok(
      !relative(installed, path).startsWith('..'),
      `${name}: ${specifier} escaped the installed consumer.`
    );
    assert.match(
      path,
      /(?:\.d\.[cm]?ts|\.json)$/,
      `${name}: ${specifier} must resolve published types or JSON.`
    );
    imports.push({ specifier, path: relative(consumer, path) });
  }
  await writeFile(
    join(consumer, `resolution-${name}.json`),
    JSON.stringify({ imports, diagnostics: [] }, null, 2)
  );
  console.log(`${name}: packed deep entries and their consumer types compile.`);
}

async function compileConsumerScss(consumer) {
  const require = createRequire(join(consumer, 'package.json'));
  for (const [name, target] of [
    ['@carbon/ai-chat-components', './scss/*'],
    ['@carbon/ai-chat', './dist/scss/*'],
  ]) {
    const packageJson = JSON.parse(
      await readFile(
        join(consumer, 'node_modules', name, 'package.json'),
        'utf8'
      )
    );
    assert.equal(
      packageJson.exports['./scss/*'],
      target,
      `${name}: Sass needs the existing bare wildcard target.`
    );
  }
  const partials = [
    '@carbon/ai-chat-components/scss/_utilities.scss',
    '@carbon/ai-chat-components/scss/_tokens-layout.scss',
    '@carbon/ai-chat-components/scss/_tokens-component.scss',
    '@carbon/ai-chat/scss/_chat-theme.scss',
  ].map((specifier) => ({ specifier, path: require.resolve(specifier) }));
  const theme = partials
    .find((partial) => partial.specifier.startsWith('@carbon/ai-chat/'))
    .path.replaceAll('\\', '/');
  const source = `
@use '@carbon/ai-chat-components/scss/utilities' as utilities;
@use '@carbon/ai-chat-components/scss/tokens-layout' as layout;
@use '@carbon/ai-chat-components/scss/tokens-component' as component;
@use ${JSON.stringify(theme)} as chat;
.packed-resolution {
  --consumer-prefix: #{utilities.$prefix};
  inline-size: layout.$messages-max-width;
  border-radius: component.$card-border-radius;
  z-index: chat.$z-index;
}
`;
  await writeFile(join(consumer, 'resolution.scss'), source);
  const warnings = [];
  const result = sass.compileString(source, {
    url: pathToFileURL(join(consumer, 'resolution.scss')),
    loadPaths: [join(consumer, 'node_modules')],
    quietDeps: true,
    logger: { warn: (message) => warnings.push(message) },
  });
  assert.match(result.css, /--consumer-prefix: cds;/);
  assert.match(result.css, /\.packed-resolution/);
  await writeFile(join(consumer, 'resolution.css'), result.css);
  await writeFile(
    join(consumer, 'resolution-scss.json'),
    JSON.stringify({ partials, warnings }, null, 2)
  );
  console.log(
    'SCSS: packed partial exports and extensionless Sass imports compile.'
  );
}

export async function assertPackedResolution({ consumer }) {
  await assertLegacyPrefixRemoval(consumer);
  await assertPackageAliases(consumer);
  const classAliases = componentEntries
    .map(
      (entry, index) => `
import Canonical${index} from '@carbon/ai-chat-components/es/components/${entry.path}';
import Legacy${index} from '@carbon/ai-chat-components/es/components/${entry.legacyPath}';
const canonical${index}: typeof Legacy${index} = Canonical${index};
const legacy${index}: typeof Canonical${index} = Legacy${index};
const constructor${index}: CustomElementConstructor = Canonical${index};
${
  entry.tag === 'cds-aichat-button-skeleton'
    ? `
const canonicalSkeleton = new Canonical${index}();
const legacySkeleton = new Legacy${index}();
canonicalSkeleton.disabled = true;
canonicalSkeleton.href = '/canonical-skeleton';
legacySkeleton.disabled = false;
legacySkeleton.href = '/legacy-skeleton';
// @ts-expect-error The inherited Boolean property must remain precisely typed.
canonicalSkeleton.disabled = 'yes';
// @ts-expect-error The compatibility declaration retains the same Boolean type.
legacySkeleton.disabled = 'yes';
export { canonicalSkeleton, legacySkeleton };
`
    : ''
}
export { canonical${index}, legacy${index}, constructor${index} };
`
    )
    .join('\n');
  await writeFile(
    join(consumer, 'resolution.ts'),
    consumerSource +
      classAliases +
      eventContractSource('@carbon/ai-chat-components/es') +
      propertyContractSource('@carbon/ai-chat-components/es')
  );
  await compileConsumerTypes(
    consumer,
    'node16',
    ts.ModuleKind.Node16,
    ts.ModuleResolutionKind.Node16
  );
  await compileConsumerTypes(
    consumer,
    'bundler',
    ts.ModuleKind.ESNext,
    ts.ModuleResolutionKind.Bundler
  );
  await compileConsumerScss(consumer);
}
