/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { carbonElement } from '@carbon/ai-chat-components/es/globals/decorators/index.js';
import '@carbon/web-components/es/components/icon-button/icon-button.js';
import '@carbon/web-components/es/components/menu/menu.js';
import '@carbon/web-components/es/components/menu/menu-item.js';
import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import type { CarbonIcon } from '@carbon/web-components/es/globals/internal/icon-loader-utils.js';
import Add16 from '@carbon/icons/es/add--large/16.js';
import OverflowMenuVertical16 from '@carbon/icons/es/overflow-menu--vertical/16.js';
import { NativeChatView } from '../../shared/NativeChatView';
import type { ToolbarAction } from '../../../../types/config/HeaderConfig';
import {
  connectInputActionsMenu,
  connectInputActionsOverflow,
} from '../../../utils/inputActionsLayout';

type InputActionIconTransform = (
  icon: ToolbarAction['icon'],
  size?: number
) => CarbonIcon;

@carbonElement('cds-aichat-input-actions')
class InputActions extends NativeChatView {
  @property({ type: Boolean, attribute: false }) expanded = false;
  @property({ type: Boolean, attribute: false }) disabled = false;
  @property({ attribute: false }) actions: ToolbarAction[] = [];
  @property({ attribute: false }) menuLabel = '';
  @property({ attribute: false }) transformIcon?: InputActionIconTransform;
  @state() private open = false;
  @state() private hiddenCount = 0;
  @state() private measuring = true;
  private row?: HTMLElement;
  private countKey = '';
  private menu?: HTMLElement;
  private trigger?: HTMLElement;
  private releaseOverflow?: () => void;
  private releaseMenu?: () => void;
  private reportFailure: (error: unknown) => void = () => {};

  connectedCallback() {
    this.style.display = 'contents';
    super.connectedCallback();
  }

  protected onViewConnected() {
    this.reportFailure = this.captureErrorReporter();
    this.own(() => {
      this.releaseOverflow?.();
      this.releaseMenu?.();
      this.releaseOverflow = undefined;
      this.releaseMenu = undefined;
      this.row = undefined;
      this.menu = undefined;
      this.trigger = undefined;
      this.countKey = '';
      this.reportFailure = () => {};
    });
  }

  protected updated() {
    if (!this.viewState || !this.isConnected) {
      return;
    }
    const row = this.querySelector<HTMLElement>(
      '.cds-aichat-input-inline-actions'
    );
    const countKey = `${this.actions.filter((action) => !action.fixed).length}:${this.actions.filter((action) => action.fixed).length}`;
    if (row !== this.row || countKey !== this.countKey) {
      this.releaseOverflow?.();
      this.releaseOverflow = undefined;
      this.row = row;
      this.countKey = countKey;
      if (row) {
        this.releaseOverflow = connectInputActionsOverflow(
          row,
          this.actions.filter((action) => !action.fixed).length,
          (count) => {
            this.hiddenCount = count;
            if (!count) {
              this.open = false;
            }
          },
          (measuring) => {
            this.measuring = measuring;
          },
          this.reportFailure
        );
      }
    }
    const menu = this.querySelector<HTMLElement>('cds-menu');
    const trigger = this.querySelector<HTMLElement>(
      '[data-input-actions-trigger]'
    );
    if (menu !== this.menu || trigger !== this.trigger) {
      this.releaseMenu?.();
      this.releaseMenu = undefined;
      this.menu = menu;
      this.trigger = trigger;
      if (menu && trigger) {
        this.releaseMenu = connectInputActionsMenu(
          trigger,
          menu,
          this.reportFailure
        );
      }
    }
  }

  private activate(action: ToolbarAction, close: boolean) {
    if (!this.isConnected || !this.viewState) {
      return;
    }
    if (close) {
      this.open = false;
    }
    try {
      if (action.href) {
        window.open(action.href, action.target || '_self');
      } else {
        action.onClick?.();
      }
    } catch (error) {
      this.reportFailure(error);
    }
  }

  private renderIcon(action: ToolbarAction, slot: string) {
    const icon = this.transformIcon?.(action.icon, 16);
    return icon ? iconLoader(icon, { slot }) : nothing;
  }

  private renderAction(action: ToolbarAction, fixed: boolean) {
    return html`<cds-icon-button
      kind="ghost"
      size="sm"
      ?disabled=${this.disabled || action.disabled}
      data-testid=${ifDefined(action.testId)}
      ?data-fixed=${fixed}
      @click=${() => this.activate(action, false)}>
      ${this.renderIcon(action, 'icon')}
      <span slot="tooltip-content">${action.text}</span>
    </cds-icon-button>`;
  }

  protected renderView() {
    const nonFixed = this.actions.filter((action) => !action.fixed);
    const fixed = this.actions.filter((action) => action.fixed);
    const hidden =
      this.hiddenCount > 0
        ? nonFixed.slice(nonFixed.length - this.hiddenCount)
        : [];
    const menuActions = this.expanded ? hidden : this.actions;
    const trigger = html`<cds-icon-button
      data-input-actions-trigger
      ?data-offset=${this.expanded}
      ?data-hidden=${this.expanded && !this.hiddenCount}
      kind="ghost"
      size="sm"
      ?disabled=${this.disabled}
      data-testid=${this.expanded ? 'cds-aichat-input-actions-overflow-trigger' : 'cds-aichat-input-actions-trigger'}
      @click=${() => {
        this.open = !this.open;
      }}>
      ${iconLoader(this.expanded ? OverflowMenuVertical16 : Add16, { slot: 'icon' })}
      <span slot="tooltip-content">${this.menuLabel}</span>
    </cds-icon-button>`;
    return html`${
      this.expanded
        ? html`<div
            class="cds-aichat-input-inline-actions"
            ?data-measuring=${this.measuring}>
            ${repeat(
              nonFixed,
              (action, index) => action.id ?? index,
              (action) => this.renderAction(action, false)
            )}
            ${trigger}
            ${repeat(
              fixed,
              (action, index) => action.id ?? index,
              (action) => this.renderAction(action, true)
            )}
          </div>`
        : trigger
    }
    ${
      this.open && (!this.expanded || menuActions.length)
        ? html`<cds-menu
            .open=${true}
            .label=${this.menuLabel}
            @cds-menu-closed=${() => {
              this.open = false;
            }}>
            ${repeat(
              menuActions,
              (action, index) => action.id ?? index,
              (action) =>
                html`<cds-menu-item
                  .label=${action.text}
                  ?disabled=${action.disabled}
                  data-testid=${ifDefined(action.testId)}
                  @click=${() => this.activate(action, true)}>
                  ${this.renderIcon(action, 'render-icon')}
                </cds-menu-item>`
            )}
          </cds-menu>`
        : nothing
    }`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-input-actions': InputActions;
  }
}

export default InputActions;
