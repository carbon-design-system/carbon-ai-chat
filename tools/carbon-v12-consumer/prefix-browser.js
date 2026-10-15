/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Close16 from '@carbon/icons/es/close/16.js';
import { collect } from './prefix-host-browser.js';

async function settleElement(element) {
  if (!element.updateComplete) {
    return;
  }
  let timer;
  try {
    await Promise.race([
      element.updateComplete,
      new Promise((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                `Generated element did not settle: ${element.localName}`
              )
            ),
          5000
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function settleElements(section) {
  for (let pass = 0; pass < 3; pass += 1) {
    await Promise.all(collect(section).map(settleElement));
  }
}

function buttonStyle(element) {
  if (!element) {
    return {};
  }
  const style = getComputedStyle(element);
  return { display: style.display, background: style.backgroundColor };
}

function buttonEvidence(controls, label) {
  const button = controls.find((element) => element.id === `${label}-child`);
  const nativeButton = button?.shadowRoot?.querySelector('button');
  const hostStyle = buttonStyle(button);
  const nativeStyle = buttonStyle(nativeButton);
  return {
    styledButton:
      hostStyle.display === 'inline-flex' &&
      nativeStyle.display === 'flex' &&
      !['transparent', 'rgba(0, 0, 0, 0)'].includes(nativeStyle.background),
    buttonHostDisplay: hostStyle.display,
    buttonNativeDisplay: nativeStyle.display,
    buttonBackground: nativeStyle.background,
    buttonClass: nativeButton?.className,
  };
}

function themeEvidence(state) {
  const theme =
    state.chat &&
    collect(state.chat).find((element) =>
      element.classList.contains(`${state.prefix}--${state.theme}`)
    );
  const themeValue =
    theme &&
    getComputedStyle(theme).getPropertyValue('--cds-background').trim();
  const visibleBackground =
    theme &&
    [theme, ...collect(theme)].find(
      (element) =>
        element.getBoundingClientRect().height > 0 &&
        !['transparent', 'rgba(0, 0, 0, 0)'].includes(
          getComputedStyle(element).backgroundColor
        )
    );
  return {
    themeLayer: !!theme,
    themeValue,
    validThemeValue: !!themeValue && CSS.supports('color', themeValue),
    visibleBackground:
      visibleBackground && getComputedStyle(visibleBackground).backgroundColor,
  };
}

function tagEvidence(controls) {
  return controls
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
}

export async function describePrefix(label) {
  const state = window.prefixStates[label];
  const section = document.getElementById(label);
  await settleElements(section);
  const controls = collect(section);
  return {
    prefix: state.prefix,
    ready: state.ready,
    sent: state.sent.map((message) => message.input?.text),
    callbacks: state.sent,
    actions: state.actions,
    headerActions: state.headerActions,
    historyActions: state.historyActions,
    historyEvents: state.historyEvents,
    menuPaint: state.menuPaint,
    fixtureTheme: window.prefixThemeEvidence?.[label],
    childActions: state.childActions,
    events: state.events,
    unprefixedEvents: state.unprefixedEvents,
    transcriptExpanded: state.transcript.expanded,
    state: state.instance?.getState(),
    ...buttonEvidence(controls, label),
    ...themeEvidence(state),
    tags: tagEvidence(controls),
  };
}

function createToolbar(prefix, label, state) {
  const toolbar = document.createElement(`${prefix}-aichat-toolbar`);
  toolbar.id = `${label}-toolbar`;
  toolbar.style.inlineSize = '180px';
  toolbar.titleText = label;
  toolbar.overflow = true;
  toolbar.actions = Array.from({ length: 8 }, (_, index) => ({
    text: `${label} action ${index}`,
    icon: Close16,
    testId: `${label}-action-${index}`,
    onClick() {
      state.actions += 1;
    },
  }));
  return toolbar;
}

function createHeader(prefix, label, state) {
  const header = document.createElement(`${prefix}-aichat-chat-header`);
  header.id = `${label}-header`;
  header.headerTitle = `${label} header`;
  header.navigationType = 'overflow';
  header.navigationOverflowLabel = `${label} navigation`;
  header.navigationOverflowIcon = Close16;
  header.navigationOverflowItems = [
    {
      text: `${label} header action`,
      testId: `${label}-header-action`,
      onClick() {
        state.headerActions += 1;
      },
    },
  ];
  return header;
}

function createHistory(prefix, label, state) {
  const container = document.createElement('div');
  container.id = `${label}-history-fixture`;
  container.setAttribute('data-floating-menu-container', '');
  container.style.position = 'relative';
  const history = document.createElement(`${prefix}-aichat-history-panel-item`);
  history.id = `${label}-history`;
  history.name = `${label} conversation`;
  history.showActions = true;
  history.actions = [{ text: `${label} history action` }];
  history.addEventListener('history-item-menu-action', (event) => {
    state.historyActions += 1;
    const { action, itemId, itemName } = event.detail;
    state.historyEvents.push({ action, itemId, itemName });
  });
  container.append(history);
  return container;
}

function createChildButton(prefix, label, state) {
  const button = document.createElement(`${prefix}-button`);
  button.id = `${label}-child`;
  button.textContent = `${label} Carbon child`;
  button.addEventListener('click', () => {
    state.childActions += 1;
  });
  return button;
}

function createTranscript(prefix, label, state) {
  const transcript = document.createElement(`${prefix}-aichat-transcript`);
  transcript.id = `${label}-transcript`;
  transcript.label = `${label} transcript`;
  transcript.text = `${label} expanded transcript`;
  transcript.addEventListener(`${prefix}-aichat-transcript-toggle`, (event) => {
    state.events += 1;
    transcript.expanded = event.detail.expanded;
  });
  transcript.addEventListener('cds-aichat-transcript-toggle', () => {
    state.unprefixedEvents += 1;
  });
  state.transcript = transcript;
  return transcript;
}

function createChat(prefix, label, state) {
  const chat = document.createElement(`${prefix}-aichat-custom-element`);
  chat.id = `${label}-chat`;
  chat.style.cssText = 'inline-size:500px;block-size:650px;display:block;';
  chat.openChatByDefault = true;
  chat.launcher = { isOn: false };
  chat.layout = { showFrame: false };
  chat.injectCarbonTheme = state.theme;
  chat.messaging = {
    customSendMessage(message) {
      state.sent.push(message);
    },
  };
  chat.onBeforeRender = (instance) => {
    state.instance = instance;
  };
  chat.onAfterRender = () => {
    state.ready = true;
  };
  state.chat = chat;
  return chat;
}

export async function mountPrefix({ prefix, label, withChat, theme = 'g10' }) {
  window.prefixStates ??= {};
  const state = {
    prefix,
    theme,
    ready: !withChat,
    sent: [],
    actions: 0,
    headerActions: 0,
    historyActions: 0,
    historyEvents: [],
    menuPaint: [],
    childActions: 0,
    events: 0,
    unprefixedEvents: 0,
  };
  window.prefixStates[label] = state;
  const section = document.createElement('section');
  section.id = label;
  section.style.cssText =
    'inline-size:540px;block-size:900px;position:relative;display:inline-block;vertical-align:top;padding:12px;';
  const toolbar = createToolbar(prefix, label, state);
  section.append(
    toolbar,
    createHeader(prefix, label, state),
    createHistory(prefix, label, state),
    createChildButton(prefix, label, state),
    createTranscript(prefix, label, state)
  );
  document.body.append(section);
  if (withChat) {
    section.append(createChat(prefix, label, state));
  }
  await toolbar.updateComplete;
  window.describePrefix = describePrefix;
}
