/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent, type EventName } from '@lit/react';
import React from 'react';

import { PromptLineElement } from '../components/aichat-prompt-line/index.js';
import type {
  InputChangeEventDetail,
  LightDomPortalEventDetail,
  PromptFocusEventDetail,
  PromptKeydownEventDetail,
  TriggerChangeEventDetail,
  TypingEventDetail,
} from '../components/aichat-prompt-line/index.js';

/**
 * React wrapper for `<cds-aichat-prompt-line>`. Mirrors the WC's prompt-line
 * surface verbatim — no host-side prop transformation required. The element
 * renders a Tiptap-free textarea by default and upgrades to the rich Tiptap
 * editor in place when the `rich` prop is set, or `ensureEditor()` is called —
 * `extensions` alone are staged, not a trigger. Chat-domain config layering
 * happens one level up at the shell. Imperative
 * methods are reachable via ref.
 *
 * @experimental
 */
const PromptLine = createComponent({
  tagName: PromptLineElement.is,
  elementClass: PromptLineElement,
  react: React,
  events: {
    onChange: 'cds-aichat-prompt-change' as EventName<
      CustomEvent<InputChangeEventDetail>
    >,
    onFocus: 'cds-aichat-prompt-focus' as EventName<
      CustomEvent<PromptFocusEventDetail>
    >,
    onBlur: 'cds-aichat-prompt-blur' as EventName<CustomEvent<null>>,
    onTyping: 'cds-aichat-prompt-typing' as EventName<
      CustomEvent<TypingEventDetail>
    >,
    onKeyDown: 'cds-aichat-prompt-keydown' as EventName<
      CustomEvent<PromptKeydownEventDetail>
    >,
    onSendIntent: 'cds-aichat-prompt-send-intent' as EventName<
      CustomEvent<null>
    >,
    onTriggerChange: 'cds-aichat-trigger-change' as EventName<
      CustomEvent<TriggerChangeEventDetail | null>
    >,
    onLightDomPortal: 'cds-aichat-light-dom-portal' as EventName<
      CustomEvent<LightDomPortalEventDetail>
    >,
  },
});

export default PromptLine;
