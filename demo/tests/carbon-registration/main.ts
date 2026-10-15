/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import Add16 from '@carbon/icons/es/add/16.js';
import { elementEntries, wrapperEntries } from './entries';

const root = document.getElementById('root')!;
const params = new URLSearchParams(location.search);
const entry = params.get('entry')!;
const custom = entry.startsWith('generated/');
const carbonPrefix = custom ? 'cds-custom' : 'cds';
const chatPrefix = custom ? 'cds-custom-aichat' : 'cds-aichat';
let actions = 0;
const activate = () => {
  document.getElementById('actions')!.textContent = String(++actions);
};

function configureElement(name: string, element: HTMLElement) {
  const values: Record<string, unknown> = {};
  element.style.cssText = 'display:block;width:360px;min-height:40px';
  if (name === 'card-footer') {
    values.actions = [{ id: 'action', label: 'Action', onClick: activate }];
    element.addEventListener('fixture-icon-variant', () => {
      Object.assign(element, {
        actions: [
          { id: 'icon', icon: Add16, tooltipText: 'Action', onClick: activate },
        ],
        isIconButton: true,
      });
    });
  } else if (name === 'card-steps') {
    values.steps = [
      { title: 'Complete', kind: 'succeeded' },
      { title: 'Pending', kind: 'in-progress' },
    ];
  } else if (name === 'carousel') {
    element.innerHTML = '<div style="width:700px">Carousel content</div>';
  } else if (name === 'history-panel-item-input') {
    values.value = 'Conversation';
  } else if (name === 'chat-header') {
    values.headerTitle = 'Header';
    values.navigationType = 'overflow';
    values.navigationOverflowLabel = 'Options';
    values.navigationOverflowItems = menuItems();
  } else if (name === 'history-panel-item') {
    values.name = 'Conversation';
    values.showActions = true;
    values.actions = [
      { text: 'First', icon: null, onClick: activate },
      {
        text: 'Last',
        icon: null,
        delete: true,
        divider: true,
        onClick: activate,
      },
    ];
    element.addEventListener('history-item-menu-action', activate);
  } else if (name === 'toolbar') {
    element.style.width = '64px';
    values.overflow = true;
    values.actions = menuItems().map((item) => ({ ...item, icon: Add16 }));
  } else if (name === 'workspace-shell-footer') {
    values.actions = [{ label: 'Action' }];
    element.addEventListener(
      `${chatPrefix}-workspace-shell-footer-clicked`,
      activate
    );
  } else if (name === 'code-snippet') {
    element.textContent = Array.from(
      { length: 30 },
      (_, index) => `const value${index} = ${index};`
    ).join('\n');
  } else if (name === 'conversational-search-shell') {
    values.showCitationsToggle = true;
    element.textContent = 'Answer';
    element.addEventListener(`${chatPrefix}-citations-toggle`, activate);
  } else if (name === 'table') {
    values.loading = true;
  } else if (name === 'history-panel-menu') {
    values.title = 'Conversations';
    values.expanded = true;
  } else if (name === 'chat-button') {
    element.textContent = 'Action';
    element.addEventListener('click', activate);
  } else if (name === 'card') {
    element.innerHTML = '<span slot="body">Slotted content</span>';
  } else if (name === 'history-panel' || name === 'history-panel-items') {
    element.textContent = 'Slotted content';
  }
  Object.assign(element, values);
}

function menuItems() {
  return [
    { text: 'First', onClick: activate },
    { text: 'Disabled', disabled: true, onClick: activate },
    { text: 'Link', href: 'about:blank', target: '_blank' },
    { text: 'Last', danger: true, divider: true, onClick: activate },
  ];
}

async function mountWrapper(name: keyof typeof wrapperEntries) {
  const module = await wrapperEntries[name]();
  const component =
    'default' in module
      ? module.default
      : 'AISlug' in module
        ? module.AISlug
        : 'DatePicker' in module
          ? module.DatePicker
          : module.Dropdown;
  const props: Record<string, unknown> = { onClick: activate };
  let children: React.ReactNode = 'Action';
  if (name === 'AISlug') {
    children = React.createElement('div', { slot: 'body-text' }, 'AI details');
  } else if (name === 'IconButton') {
    children = React.createElement(
      'span',
      { slot: 'tooltip-content' },
      'Action'
    );
  } else if (name === 'DatePicker' && 'DatePickerInput' in module) {
    children = React.createElement(module.DatePickerInput, {
      labelText: 'Date',
    });
  } else if (name === 'Dropdown' && 'DropdownItem' in module) {
    props.titleText = 'Select an option';
    props.label = 'Choose';
    children = React.createElement(
      module.DropdownItem,
      { value: 'one' },
      'One'
    );
  } else if (name === 'Link' || name === 'ClickableTile') {
    props.href = '#action';
  } else if (name === 'Menu') {
    props.open = true;
    props.position = [40, 40];
    children = React.createElement('cds-menu-item', { label: 'Action' });
  } else if (name === 'MenuItem') {
    props.label = 'Action';
    children = null;
  } else if (name === 'Loading') {
    props.active = true;
    props.small = true;
    props.description = 'Loading';
    children = null;
  } else if (name === 'Layer') {
    delete props.onClick;
    children = React.createElement(
      'button',
      { onClick: activate, type: 'button' },
      'Action'
    );
  }
  createRoot(root).render(
    React.createElement(
      component as React.ComponentType<Record<string, unknown>>,
      props,
      children
    )
  );
}

async function run() {
  if (entry === 'missing') {
    // Class-only imports deliberately leave the tag undefined in alpha.3.
    await import('@carbon/web-components/es/components/button/button.js');
    root.appendChild(document.createElement('cds-button'));
  } else if (entry === 'ConversationalSearch') {
    const { mountConversationalSearch } =
      await import('./conversational-search');
    await mountConversationalSearch(root);
  } else if (entry in wrapperEntries) {
    await mountWrapper(entry as keyof typeof wrapperEntries);
  } else {
    await elementEntries[entry as keyof typeof elementEntries]();
    const name = entry.split('/')[1];
    const tagSuffix = name.replace(/^chat-button/, 'button');
    const element = document.createElement(`${chatPrefix}-${tagSuffix}`);
    configureElement(name, element);
    root.appendChild(element);
  }
  root.dataset.loaded = 'true';
  root.dataset.carbonPrefix = carbonPrefix;
}

run().catch((error) => {
  root.dataset.error = String(error);
  throw error;
});
