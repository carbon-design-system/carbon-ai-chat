/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * DOM lookups for contract tests. A contract test reads rendered output only
 * through the public test IDs (`PageObjectId`), slots, parts, and ARIA roles
 * with accessible names — never a Carbon tag name, a class, or the shape of
 * the markup (plan D4.2).
 */

import { act } from '@testing-library/react';

import { PageObjectId } from '../../../src/aiChatEntry';

/** Every element under `root`, through open shadow roots. */
function* descendants(root: ParentNode): Generator<Element> {
  for (const element of Array.from(root.querySelectorAll('*'))) {
    yield element;
    if (element.shadowRoot) {
      yield* descendants(element.shadowRoot);
    }
  }
}

/**
 * `root` itself when it is an element, its shadow tree, and everything under
 * it, through open shadow roots.
 */
function* walk(root: ParentNode): Generator<Element> {
  if (root instanceof Element) {
    yield root;
    if (root.shadowRoot) {
      yield* descendants(root.shadowRoot);
    }
  }
  yield* descendants(root);
}

/** The first element with this public test ID, searching shadow roots. */
export function byTestId(
  testId: PageObjectId | string,
  root: ParentNode = document
): HTMLElement | null {
  for (const element of walk(root)) {
    if (element.getAttribute('data-testid') === testId) {
      return element as HTMLElement;
    }
  }
  return null;
}

/** Like `byTestId`, but throws when no element has the test ID. */
export function getByTestId(
  testId: PageObjectId | string,
  root: ParentNode = document
): HTMLElement {
  const element = byTestId(testId, root);
  if (!element) {
    throw new Error(`no element with test ID "${testId}"`);
  }
  return element;
}

/** Every element with this public test ID, searching shadow roots. */
export function allByTestId(
  testId: PageObjectId | string,
  root: ParentNode = document
): HTMLElement[] {
  return [...walk(root)].filter(
    (element) => element.getAttribute('data-testid') === testId
  ) as HTMLElement[];
}

/** The light-DOM children a host slotted under this slot name. */
export function slotted(host: Element, name: string): Element[] {
  return Array.from(host.querySelectorAll(`[slot="${name}"]`));
}

/**
 * A node's parent in the flat tree, the tree a user sees: the slot it is
 * assigned to, else its parent, else (at a shadow root) the shadow host.
 */
export function flatParent(node: Node): Node | null {
  const slot = (node as Element | Text).assignedSlot;
  if (slot) {
    return slot;
  }
  const parent = node.parentNode;
  return parent instanceof ShadowRoot ? parent.host : parent;
}

/** Whether `node` is `ancestor` or shows inside it in the flat tree. */
export function isShownWithin(node: Node, ancestor: Node): boolean {
  for (
    let current: Node | null = node;
    current;
    current = flatParent(current)
  ) {
    if (current === ancestor) {
      return true;
    }
  }
  return false;
}

/**
 * Whether a user can't perceive `element`: it or a flat-tree ancestor is
 * `hidden`, `aria-hidden="true"`, `inert`, or styled `display: none` inline,
 * or it sits in a shadow host's light DOM with no slot to show it.
 */
export function isHidden(element: Element): boolean {
  for (
    let current: Node | null = element;
    current;
    current = flatParent(current)
  ) {
    if (current instanceof HTMLElement || current instanceof SVGElement) {
      if (
        current.hasAttribute('hidden') ||
        current.getAttribute('aria-hidden') === 'true' ||
        current.hasAttribute('inert') ||
        current.style.display === 'none'
      ) {
        return true;
      }
    }
    const parent = current.parentNode;
    if (
      parent instanceof Element &&
      parent.shadowRoot &&
      !(current as Element | Text).assignedSlot
    ) {
      return true;
    }
  }
  return false;
}

/**
 * The text a node shows, following shadow roots and slots to what they show.
 * Style elements show nothing.
 */
export function shownText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (!(node instanceof Element) || node.tagName === 'STYLE') {
    return '';
  }
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedNodes({ flatten: true });
    return (assigned.length ? assigned : Array.from(node.childNodes))
      .map(shownText)
      .join('');
  }
  const children = node.shadowRoot
    ? node.shadowRoot.childNodes
    : node.childNodes;
  return Array.from(children).map(shownText).join('');
}

/** Roles whose accessible name can come from the element's content. */
const NAME_FROM_CONTENT = new Set([
  'button',
  'cell',
  'checkbox',
  'columnheader',
  'heading',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'rowheader',
  'switch',
  'tab',
  'tooltip',
  'treeitem',
]);

/** The implicit role of each `<input>` type a contract test may look for. */
const INPUT_ROLES: Record<string, string> = {
  button: 'button',
  checkbox: 'checkbox',
  email: 'textbox',
  image: 'button',
  radio: 'radio',
  reset: 'button',
  search: 'searchbox',
  submit: 'button',
  tel: 'textbox',
  text: 'textbox',
  url: 'textbox',
};

/**
 * An element's ARIA role: the first token of its `role` attribute, else the
 * implicit role of a `button`, `textarea`, `input`, or `a[href]`.
 */
export function roleOf(element: Element): string | null {
  const explicit = element.getAttribute('role')?.trim().split(/\s+/)[0];
  if (explicit) {
    return explicit;
  }
  if (element instanceof HTMLButtonElement) {
    return 'button';
  }
  if (element instanceof HTMLTextAreaElement) {
    return 'textbox';
  }
  if (element instanceof HTMLInputElement) {
    return INPUT_ROLES[element.type] ?? null;
  }
  if (element instanceof HTMLAnchorElement && element.hasAttribute('href')) {
    return 'link';
  }
  return null;
}

function collapse(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * An element's accessible name, following the order of the accessible-name
 * computation for the cases the chat uses: `aria-labelledby` (each ID
 * resolved in the element's own document or shadow root), `aria-label`, a
 * form control's `<label>`, its content (through shadow roots and slots) for
 * roles named from content, then `title`, then a text field's `placeholder`.
 */
export function accessibleName(element: Element): string {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const root = element.getRootNode() as Document | ShadowRoot;
    const name = collapse(
      labelledBy
        .split(/\s+/)
        .map((id) => root.getElementById(id))
        .filter(Boolean)
        .map((label) => shownText(label))
        .join(' ')
    );
    if (name) {
      return name;
    }
  }
  const label = collapse(element.getAttribute('aria-label'));
  if (label) {
    return label;
  }
  if (
    (element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement) &&
    element.labels?.length
  ) {
    const name = collapse(
      Array.from(element.labels, (each) => shownText(each)).join(' ')
    );
    if (name) {
      return name;
    }
  }
  if (NAME_FROM_CONTENT.has(roleOf(element))) {
    const content = collapse(shownText(element));
    if (content) {
      return content;
    }
  }
  return (
    collapse(element.getAttribute('title')) ||
    collapse(element.getAttribute('placeholder'))
  );
}

/**
 * Every visible control with this ARIA role and accessible name under `root`,
 * in document order, searching shadow roots. Hidden elements (see `isHidden`)
 * never match. Where a shadow host and a control in its shadow tree both
 * match, only the inner one is kept, since that is what a user's click lands
 * on.
 *
 * Finding a control by its role and accessible name is an allowed contract
 * lookup (plan D4.2, user ruling 2026-11-12, following the repo's
 * accessibility guidance). Prefer a name the test set itself, through
 * `config.strings` or message content, over the chat's default copy.
 */
export function allByRole(
  role: string,
  name: string,
  root: ParentNode = document
): HTMLElement[] {
  const matches = [...walk(root)].filter(
    (element) =>
      roleOf(element) === role &&
      !isHidden(element) &&
      accessibleName(element) === name
  ) as HTMLElement[];
  return matches.filter(
    (element) =>
      !matches.some(
        (other) =>
          other !== element &&
          element.shadowRoot !== null &&
          isShownWithin(other, element)
      )
  );
}

/**
 * The one visible control with this ARIA role and accessible name (see
 * `allByRole`). Throws when there is none, or more than one, so a test never
 * depends on which of several matches comes first.
 */
export function byRole(
  role: string,
  name: string,
  root: ParentNode = document
): HTMLElement {
  const matches = allByRole(role, name, root);
  if (matches.length !== 1) {
    throw new Error(
      `expected one visible ${role} named "${name}", found ${matches.length}`
    );
  }
  return matches[0];
}

/** Clicks an element the way a user would, inside `act`. */
export async function click(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.click();
  });
}

/** Whether a control is disabled, natively or through ARIA. */
export function isDisabled(element: HTMLElement): boolean {
  return (
    (element as HTMLButtonElement).disabled === true ||
    element.hasAttribute('disabled') ||
    element.getAttribute('aria-disabled') === 'true'
  );
}

/** The text the main panel shows, with whitespace collapsed. */
export function mainPanelText(): string {
  return shownText(getByTestId(PageObjectId.MAIN_PANEL)).replace(/\s+/g, ' ');
}

/**
 * A node's children in the flat tree, the tree a user sees: a shadow host
 * shows its shadow root, a slot shows the nodes assigned to it (or its
 * fallback), and anything else shows its children. Content that no rendered
 * slot picks up is not in it.
 */
export function flatChildren(node: Node): Node[] {
  if (node instanceof Element && node.shadowRoot) {
    return Array.from(node.shadowRoot.childNodes);
  }
  if (node instanceof HTMLSlotElement) {
    const assigned = node.assignedNodes();
    return assigned.length ? assigned : Array.from(node.childNodes);
  }
  return Array.from(node.childNodes);
}

/** The focused element, looking through open shadow roots. */
export function deepActiveElement(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

/**
 * Adds a focusable button to the host page, outside the chat, and focuses it.
 * Throws when focus doesn't land on it.
 */
export function focusHostButton(): HTMLButtonElement {
  const button = document.createElement('button');
  document.body.appendChild(button);
  button.focus();
  if (deepActiveElement() !== button) {
    throw new Error('the host button did not take focus');
  }
  return button;
}
