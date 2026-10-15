/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

function opaqueRgb(color) {
  const match =
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(
      color
    );
  assert.ok(match, `Computed menu color must be RGB: ${color}`);
  const channels = match.slice(1, 4).map(Number);
  assert.ok(
    channels.every((channel) => channel >= 0 && channel <= 255),
    `Computed RGB channels must be in range: ${color}`
  );
  assert.equal(
    Number(match[4] ?? 1),
    1,
    `Computed menu color must be opaque: ${color}`
  );
  return channels;
}

function relativeLuminance(color) {
  const linear = opaqueRgb(color).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear.reduce(
    (total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index],
    0
  );
}

function menuContrast(foreground, background) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

async function readMenuPaint(action, context) {
  return action.evaluate((element, context) => {
    const host = element.parentElement;
    const surface = host.shadowRoot?.querySelector('[role="menu"]') ?? host;
    const style = getComputedStyle(surface);
    const renderedLabel = element.shadowRoot?.querySelector(
      '[class$="--menu-item__label"], button, a'
    );
    if (!renderedLabel) {
      throw new Error(
        `Generated menu item has no rendered label: ${element.localName}`
      );
    }
    const labelStyle = getComputedStyle(renderedLabel);
    const layer = style.getPropertyValue('--cds-layer').trim();
    const rect = surface.getBoundingClientRect();
    const record = {
      ...context,
      surface: surface.localName,
      layer,
      validLayer: !!layer && CSS.supports('color', layer),
      background: style.backgroundColor,
      surfaceColor: style.color,
      color: labelStyle.color,
      fontFamily: labelStyle.fontFamily,
      labelTag: renderedLabel.localName,
      labelClass: renderedLabel.className,
      labelText: renderedLabel.innerText?.trim() || element.textContent?.trim(),
      surfaceRect: {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
    window.prefixStates[context.label].menuPaint.push(record);
    return record;
  }, context);
}

async function recordMenuContrast(action, context, contrast) {
  await action.evaluate(
    (element, value) => {
      const record = window.prefixStates[value.label].menuPaint.find(
        (item) => item.counter === value.counter && item.phase === value.phase
      );
      record.contrast = value.contrast;
    },
    { ...context, contrast }
  );
}

function assertMenuPlacement(paint) {
  const { surfaceRect: rect, trigger, viewport } = paint;
  assert.ok(
    rect.width > 0 && rect.height > 0,
    'An open menu must have positive painted area.'
  );
  assert.ok(
    rect.left >= -1 &&
      rect.top >= -1 &&
      rect.right <= viewport.width + 1 &&
      rect.bottom <= viewport.height + 1,
    'An open menu must remain within the viewport (1px rounding tolerance).'
  );
  const overlap =
    Math.min(rect.right, trigger.x + trigger.width) -
    Math.max(rect.left, trigger.x);
  assert.ok(
    overlap > 0,
    'An open menu must overlap its native trigger horizontally.'
  );
}

async function assertMenuPaint(action, overflow, context) {
  const trigger = await overflow.locator('button').first().boundingBox();
  assert.ok(trigger, 'An open menu must have a rendered native trigger.');
  const paint = await readMenuPaint(action, { ...context, trigger });
  assertMenuPlacement(paint);
  assert.equal(
    paint.validLayer,
    true,
    'An open generated menu must inherit a real Carbon layer token.'
  );
  assert.ok(
    !['transparent', 'rgba(0, 0, 0, 0)'].includes(paint.background),
    'An open generated menu must paint its surface.'
  );
  assert.notEqual(
    paint.color,
    paint.background,
    'Menu text and surface colors must differ.'
  );
  const contrast = menuContrast(paint.color, paint.background);
  await recordMenuContrast(action, context, contrast);
  assert.ok(
    contrast >= 4.5,
    `Rendered menu text must meet WCAG 2.1 AA normal-text contrast: ${contrast}`
  );
}

async function exerciseMenu(page, overflow, action, label, counter) {
  await overflow.locator('button').first().click();
  await action.waitFor({ state: 'visible' });
  await assertMenuPaint(action, overflow, {
    label,
    counter,
    phase: 'beforeEscape',
  });
  assert.equal(
    await overflow.evaluate(async (element) => {
      await element.updateComplete;
      return element.open;
    }),
    true,
    'The generated menu must be open before exercising Escape.'
  );
  await page.keyboard.press('Escape');
  assert.equal(
    await overflow.evaluate(async (element) => {
      await element.updateComplete;
      return element.open;
    }),
    false,
    'The generated menu must close through the keyboard.'
  );
  await overflow.locator('button').first().click();
  await action.waitFor({ state: 'visible' });
  await assertMenuPaint(action, overflow, {
    label,
    counter,
    phase: 'beforeAction',
  });
  await action.click();
  await page.waitForFunction(
    ({ key, field }) => window.prefixStates[key][field] === 1,
    { key: label, field: counter }
  );
}

async function exerciseComponents(page, label, prefix) {
  const section = page.locator(`#${label}`);
  const toolbar = section.locator(`#${label}-toolbar`);
  await exerciseMenu(
    page,
    toolbar.locator(`${prefix}-overflow-menu`),
    toolbar.locator(`[data-testid="${label}-action-7"]`),
    label,
    'actions'
  );
  const header = section.locator(`#${label}-header`);
  await exerciseMenu(
    page,
    header.locator(`${prefix}-overflow-menu`),
    header.locator(`[data-testid="${label}-header-action"]`),
    label,
    'headerActions'
  );
  const history = section.locator(`#${label}-history-fixture`);
  await exerciseMenu(
    page,
    history.locator(`${prefix}-overflow-menu`),
    history.locator(`${prefix}-menu-item, ${prefix}-overflow-menu-item`),
    label,
    'historyActions'
  );
  await section.locator(`#${label}-child`).click();
  await section
    .locator(`#${label}-transcript`)
    .getByRole('button', { name: `Show ${label} transcript`, exact: true })
    .click();
  await page.waitForFunction(
    (key) =>
      window.prefixStates[key].events === 1 &&
      window.prefixStates[key].transcript.expanded,
    label
  );
  await section
    .getByText(`${label} expanded transcript`, { exact: true })
    .first()
    .waitFor({ state: 'visible' });
}

async function send(page, label, text) {
  const chat = page.locator(`#${label}-chat`);
  await chat.getByTestId('input_field').click();
  await page.keyboard.type(text);
  await chat.getByTestId('input_send').click();
  await page.waitForFunction(
    ({ key, message }) =>
      window.prefixStates[key].sent.some(
        (item) => item.input?.text === message
      ),
    { key: label, message: text }
  );
  await chat
    .getByText(text, { exact: true })
    .first()
    .waitFor({ state: 'visible' });
}

function assertCallbacks(callbacks, expectedText) {
  const userMessages = callbacks.filter((item) => item.input?.text);
  assert.deepEqual(
    userMessages.map((item) => item.input.text),
    [expectedText],
    'Each chat must send exactly its own user message once.'
  );
  for (const callback of callbacks.filter((item) => !item.input?.text)) {
    assert.equal(callback.history?.is_welcome_request, true);
    assert.equal(callback.history?.silent, true);
  }
}

async function hostProof(page, label, prefix) {
  await page.waitForFunction((key) => window.prefixStates?.[key]?.ready, label);
  const text = `Independent ${label} message`;
  await send(page, label, text);
  const state = await page.evaluate(() => window.describeHost());
  assert.equal(state.ready, true);
  assertCallbacks(state.callbacks, text);
  assert.deepEqual(
    state.tags.filter((tag) => !tag.defined || !tag.upgraded),
    [],
    'The public host barrel alone must upgrade every rendered child.'
  );
  assert.deepEqual(
    state.tags.filter((tag) => !tag.tag.startsWith(`${prefix}-`)),
    [],
    'The host-only graph must retain the selected prefix throughout.'
  );
  for (const suffix of [
    'aichat-custom-element',
    'aichat-container',
    'aichat-chat-header',
    'aichat-toolbar',
  ]) {
    assert.ok(
      state.tags.some((tag) => tag.tag === `${prefix}-${suffix}` && tag.shadow),
      `The host-only page must render its ${suffix} child.`
    );
  }
  return state;
}

function assertMenuRuntime(state, label) {
  assert.equal(
    state.menuPaint.length,
    6,
    'All three menus must paint before both keyboard close and action.'
  );
  assert.equal(
    state.actions,
    1,
    'The generated overflow menu must deliver its action.'
  );
  assert.equal(
    state.headerActions,
    1,
    'The generated header action must work.'
  );
  assert.equal(
    state.historyActions,
    1,
    'The generated history action must work.'
  );
  assert.equal(state.historyEvents[0].itemId, `${label}-history`);
  assert.equal(state.historyEvents[0].itemName, `${label} conversation`);
  assert.equal(state.historyEvents[0].action, `${label} history action`);
}

function assertEventRuntime(state) {
  assert.equal(
    state.childActions,
    1,
    'The generated Carbon child must deliver a click.'
  );
  assert.equal(
    state.events,
    1,
    'A real interaction must emit the renamed transcript event.'
  );
  assert.equal(
    state.unprefixedEvents,
    0,
    'Generated components must not emit the default event.'
  );
  assert.equal(state.transcriptExpanded, true);
}

function assertStyledTags(state, prefix) {
  assert.equal(
    state.styledButton,
    true,
    'The generated Carbon button must retain its component styling.'
  );
  assert.ok(
    state.buttonClass.includes(`${prefix}--btn`),
    'The Carbon child must use the selected CSS prefix.'
  );
  assert.deepEqual(
    state.tags.filter((tag) => !tag.defined || !tag.upgraded),
    [],
    'Every rendered generated tag must upgrade.'
  );
  assert.deepEqual(
    state.tags.filter((tag) => !tag.tag.startsWith(`${prefix}-`)),
    [],
    'Generated children must not escape to another/default tag namespace.'
  );
  assert.ok(
    state.tags.some((tag) => tag.tag === `${prefix}-button` && tag.shadow)
  );
  assert.ok(
    state.tags.some(
      (tag) => tag.tag === `${prefix}-aichat-markdown` && tag.shadow
    ),
    'Expanded transcript must render its generated child.'
  );
}

function assertThemedHost(state, prefix) {
  assert.equal(
    state.themeLayer,
    true,
    'The selected Carbon theme must reach the generated chat.'
  );
  assert.equal(
    state.validThemeValue,
    true,
    'The actual theme element must resolve a valid --cds-background color.'
  );
  assert.ok(
    state.visibleBackground,
    'The themed chat must paint a visible background.'
  );
  assert.ok(
    state.tags.some(
      (tag) => tag.tag === `${prefix}-aichat-custom-element` && tag.shadow
    )
  );
  assert.ok(
    state.tags.some(
      (tag) => tag.tag === `${prefix}-aichat-container` && tag.shadow
    )
  );
}

async function assertRuntime(page, label, prefix, withChat) {
  const state = await page.evaluate((key) => window.describePrefix(key), label);
  assert.equal(state.ready, true);
  assertMenuRuntime(state, label);
  assertEventRuntime(state);
  assertStyledTags(state, prefix);
  if (withChat) {
    assertThemedHost(state, prefix);
  }
  return state;
}

async function failureDocumentSnapshot(page) {
  return page.evaluate(() => {
    const elements = [];
    const roots = [document];
    while (roots.length) {
      const root = roots.pop();
      const descendants = Array.from(root.querySelectorAll('*'));
      elements.push(...descendants);
      roots.push(
        ...descendants.map((element) => element.shadowRoot).filter(Boolean)
      );
    }
    return elements
      .filter((element) => element.localName.includes('-'))
      .map((element) => {
        const constructor = customElements.get(element.localName);
        return {
          tag: element.localName,
          defined: !!constructor,
          upgraded: !!constructor && element instanceof constructor,
          shadow: !!element.shadowRoot,
        };
      });
  });
}

async function failureRuntimeSnapshot(page) {
  return page.evaluate(async () => {
    if (window.describeHost) {
      return { host: window.describeHost() };
    }
    const states = {};
    for (const key of Object.keys(window.prefixStates ?? {})) {
      states[key] = await window.describePrefix(key);
    }
    return states;
  });
}

function observePage(page, origin) {
  const errors = [];
  const messages = [];
  const failedRequests = [];
  const externalRequests = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    messages.push({ type: message.type(), text: message.text() });
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('requestfailed', (request) => failedRequests.push(request.url()));
  page.on('request', (request) => {
    if (
      /^https?:/.test(request.url()) &&
      new URL(request.url()).origin !== origin
    ) {
      externalRequests.push({
        url: request.url(),
        type: request.resourceType(),
      });
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  return { errors, messages, failedRequests, externalRequests };
}

async function pageProof({ browser, origin, consumer, name, path, exercise }) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1100 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  const observations = observePage(page, origin);
  const { errors, failedRequests, externalRequests } = observations;
  try {
    await page.goto(`${origin}/${path}`);
    const result = await exercise(page);
    assert.deepEqual(
      errors,
      [],
      `${name}: generated consumers must have no browser errors.`
    );
    assert.deepEqual(
      failedRequests,
      [],
      `${name}: every generated request must resolve.`
    );
    assert.deepEqual(
      externalRequests,
      [],
      `${name}: offline fixture must not request external fonts or assets.`
    );
    await writeFile(
      join(consumer, `${name}-runtime.json`),
      JSON.stringify({ result, ...observations }, null, 2)
    );
    await page.screenshot({
      path: join(consumer, `${name}.png`),
      fullPage: true,
    });
    console.log(`${name}: generated consumer runtime checks passed.`);
  } catch (error) {
    const runtime = await failureRuntimeSnapshot(page).catch(
      (snapshotError) => ({ error: String(snapshotError) })
    );
    const documentTags = await failureDocumentSnapshot(page).catch(
      (snapshotError) => ({ error: String(snapshotError) })
    );
    await writeFile(
      join(consumer, `${name}-failure.json`),
      JSON.stringify(
        {
          error: String(error),
          ...observations,
          documentTags,
          runtime,
        },
        null,
        2
      )
    );
    await page
      .screenshot({
        path: join(consumer, `${name}-failure.png`),
        fullPage: true,
      })
      .catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

async function singleProof(page, label, prefix, withChat) {
  await page.waitForFunction((key) => window.prefixStates?.[key]?.ready, label);
  await exerciseComponents(page, label, prefix);
  if (withChat) {
    await send(page, label, `Generated ${prefix} message`);
  }
  return assertRuntime(page, label, prefix, withChat);
}

async function coexistence(page, currentLabel, currentPrefix) {
  await page.waitForFunction(
    (key) =>
      window.prefixStates?.[key]?.ready &&
      window.prefixStates?.historical?.ready,
    currentLabel
  );
  const currentText = 'Current installed version message';
  const historicalText = 'Historical installed version message';
  await exerciseComponents(page, currentLabel, currentPrefix);
  await exerciseComponents(page, 'historical', 'history-v1');
  await send(page, currentLabel, currentText);
  await send(page, 'historical', historicalText);
  assert.equal(
    await page
      .locator(`#${currentLabel}-chat`)
      .getByText(historicalText, { exact: true })
      .count(),
    0
  );
  assert.equal(
    await page
      .locator('#historical-chat')
      .getByText(currentText, { exact: true })
      .count(),
    0
  );
  await page.locator('#default-carbon').click();
  const identities = await page.evaluate(
    (key) => ({
      separateInstances:
        window.prefixStates[key].instance !==
        window.prefixStates.historical.instance,
      currentCallbacks: window.prefixStates[key].sent,
      historicalCallbacks: window.prefixStates.historical.sent,
      defaultActions: window.defaultCarbonActions,
      constructors: new Set(
        [
          'cds-button',
          `${window.prefixStates[key].prefix}-button`,
          'history-v1-button',
        ].map((tag) => customElements.get(tag))
      ).size,
      defaultUpgraded:
        document.getElementById('default-carbon') instanceof
        customElements.get('cds-button'),
    }),
    currentLabel
  );
  assert.equal(identities.separateInstances, true);
  for (const [callbacks, expectedText] of [
    [identities.currentCallbacks, currentText],
    [identities.historicalCallbacks, historicalText],
  ]) {
    assertCallbacks(callbacks, expectedText);
  }
  assert.equal(identities.defaultActions, 1);
  assert.equal(identities.constructors, 3);
  assert.equal(identities.defaultUpgraded, true);
  const current = await assertRuntime(page, currentLabel, currentPrefix, true);
  const historical = await assertRuntime(
    page,
    'historical',
    'history-v1',
    true
  );
  assert.notEqual(
    current.themeValue,
    historical.themeValue,
    'The coexisting g10 and g90 chats must resolve different background theme tokens.'
  );
  return { identities, current, historical };
}

export async function assertPrefixProofs({ consumer, browser, origin, proof }) {
  for (const host of proof.hosts) {
    await pageProof({
      browser,
      origin,
      consumer,
      name: host.label,
      path: `${host.label}/index.html`,
      exercise: (page) => hostProof(page, host.label, host.prefix),
    });
  }
  for (const [index, receipt] of proof.current.receipts.entries()) {
    const label = proof.current.labels[index];
    await pageProof({
      browser,
      origin,
      consumer,
      name: label,
      path: `${label}.html`,
      exercise: (page) => singleProof(page, label, receipt.prefix, true),
    });
  }
  for (const [index, receipt] of proof.direct.receipts.entries()) {
    const label = proof.direct.labels[index];
    await pageProof({
      browser,
      origin,
      consumer,
      name: label,
      path: `prefix-direct/${label}.html`,
      exercise: (page) => singleProof(page, label, receipt.prefix, false),
    });
  }
  await pageProof({
    browser,
    origin,
    consumer,
    name: 'prefix-coexist',
    path: 'prefix-coexist.html',
    exercise: (page) =>
      coexistence(
        page,
        proof.current.labels[0],
        proof.current.receipts[0].prefix
      ),
  });
}
