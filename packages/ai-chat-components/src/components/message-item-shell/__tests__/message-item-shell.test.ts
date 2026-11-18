/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { fixture, html, expect } from '@open-wc/testing';
import prefix from '../../../globals/settings.js';
import '../index.js';
import '../../message-byline/index.js';
import type CDSAIChatMessageItemShell from '../src/message-item-shell.js';

const blockClass = `${prefix}-message-item-shell`;
const rowTypes = ['request', 'response'] as const;

/** Renders a shell of the given row type. */
function renderShell(rowType: (typeof rowTypes)[number]) {
  return fixture<CDSAIChatMessageItemShell>(html`
    <cds-aichat-message-item-shell row-type=${rowType}>
    </cds-aichat-message-item-shell>
  `);
}

describe('cds-aichat-message-item-shell', () => {
  rowTypes.forEach((rowType) => {
    describe(`row-type="${rowType}"`, () => {
      it('renders all four slots', async () => {
        const el = await renderShell(rowType);
        const root = el.shadowRoot!;

        expect(root.querySelector('slot[name="byline"]')).to.exist;
        expect(root.querySelector('slot:not([name])')).to.exist;
        expect(root.querySelector('slot[name="attachment"]')).to.exist;
        expect(root.querySelector('slot[name="footer"]')).to.exist;
      });

      it('wraps each slot in a div instead of using it as a direct child', async () => {
        const el = await renderShell(rowType);

        ['byline', 'content', 'attachment', 'footer'].forEach((name) => {
          const wrapper = el.shadowRoot!.querySelector(
            `.${blockClass}__${name}`
          )!;
          expect(wrapper).to.exist;
          expect(wrapper.tagName).to.equal('DIV');
          expect(wrapper.querySelector('slot')).to.exist;
        });
        expect(
          Array.from(el.shadowRoot!.children).some(
            (child) => child.tagName === 'SLOT'
          )
        ).to.be.false;
      });

      it('assigns slotted children to their slots', async () => {
        const el = await fixture<CDSAIChatMessageItemShell>(html`
          <cds-aichat-message-item-shell row-type=${rowType}>
            <span slot="byline" id="byline"></span>
            <span id="content"></span>
            <span slot="attachment" id="attachment"></span>
            <span slot="footer" id="footer"></span>
          </cds-aichat-message-item-shell>
        `);
        await el.updateComplete;

        const assigned = (selector: string) =>
          el
            .shadowRoot!.querySelector<HTMLSlotElement>(selector)!
            .assignedElements();

        expect(el.querySelector('#byline')).to.not.be.null;
        expect(assigned('slot[name="byline"]')[0].id).to.equal('byline');
        expect(assigned('slot:not([name])')[0].id).to.equal('content');
        expect(assigned('slot[name="attachment"]')[0].id).to.equal(
          'attachment'
        );
        expect(assigned('slot[name="footer"]')[0].id).to.equal('footer');
      });

      it('reflects hide-avatar without hiding the byline wrapper', async () => {
        const el = await fixture<CDSAIChatMessageItemShell>(html`
          <cds-aichat-message-item-shell row-type=${rowType}>
            <cds-aichat-message-byline slot="byline" label="Assistant">
            </cds-aichat-message-byline>
          </cds-aichat-message-item-shell>
        `);
        const wrapper = el.shadowRoot!.querySelector<HTMLElement>(
          `.${blockClass}__byline`
        )!;

        el.hideAvatar = true;
        await el.updateComplete;

        // The byline wrapper stays visible — only the avatar image inside is hidden.
        expect(getComputedStyle(wrapper).display).to.not.equal('none');
        expect(el.hasAttribute('hide-avatar')).to.be.true;
      });

      it('hides and shows the byline avatar', async () => {
        const el = await fixture<CDSAIChatMessageItemShell>(html`
          <cds-aichat-message-item-shell row-type=${rowType}>
            <cds-aichat-message-byline slot="byline" label="Assistant">
              <span slot="avatar" id="avatar"></span>
            </cds-aichat-message-byline>
          </cds-aichat-message-item-shell>
        `);
        const avatar = el.querySelector<HTMLElement>('#avatar')!;

        el.hideAvatar = true;
        await el.updateComplete;
        expect(avatar.hidden).to.be.true;

        el.hideAvatar = false;
        await el.updateComplete;
        expect(avatar.hidden).to.be.false;
      });

      it('hides the byline avatar when hide-avatar is set initially', async () => {
        const el = await fixture<CDSAIChatMessageItemShell>(html`
          <cds-aichat-message-item-shell row-type=${rowType} hide-avatar>
            <cds-aichat-message-byline slot="byline" label="Assistant">
              <span slot="avatar" id="avatar"></span>
            </cds-aichat-message-byline>
          </cds-aichat-message-item-shell>
        `);

        expect(el.querySelector<HTMLElement>('#avatar')!.hidden).to.be.true;
      });

      it('hides an avatar added to the byline after hide-avatar is set', async () => {
        const el = await fixture<CDSAIChatMessageItemShell>(html`
          <cds-aichat-message-item-shell row-type=${rowType} hide-avatar>
            <cds-aichat-message-byline slot="byline" label="Assistant">
            </cds-aichat-message-byline>
          </cds-aichat-message-item-shell>
        `);
        const avatar = document.createElement('span');
        avatar.slot = 'avatar';

        el.querySelector('cds-aichat-message-byline')!.append(avatar);
        await new Promise((resolve) => setTimeout(resolve));

        expect(avatar.hidden).to.be.true;
      });

      it('hides an avatar swapped into the avatar slot after hide-avatar is set', async () => {
        const el = await fixture<CDSAIChatMessageItemShell>(html`
          <cds-aichat-message-item-shell row-type=${rowType} hide-avatar>
            <cds-aichat-message-byline slot="byline" label="Assistant">
              <span id="avatar"></span>
            </cds-aichat-message-byline>
          </cds-aichat-message-item-shell>
        `);
        const avatar = el.querySelector<HTMLElement>('#avatar')!;

        avatar.slot = 'avatar';
        await new Promise((resolve) => setTimeout(resolve));

        expect(avatar.hidden).to.be.true;
      });
    });
  });

  it('reflects row-type', async () => {
    const el = await renderShell('response');
    expect(el.getAttribute('row-type')).to.equal('response');

    el.rowType = 'request';
    await el.updateComplete;
    expect(el.getAttribute('row-type')).to.equal('request');
  });

  describe('layout', () => {
    it('limits the row width unless full-width is set', async () => {
      const el = await renderShell('response');
      expect(getComputedStyle(el).maxInlineSize).to.not.equal('none');

      el.fullWidth = true;
      await el.updateComplete;
      expect(getComputedStyle(el).maxInlineSize).to.equal('none');

      el.fullWidth = false;
      await el.updateComplete;
      expect(getComputedStyle(el).maxInlineSize).to.not.equal('none');
    });

    it('aligns a response to the start and a request to the end', async () => {
      const response = await renderShell('response');
      const request = await renderShell('request');

      expect(getComputedStyle(response).alignItems).to.equal('flex-start');
      expect(getComputedStyle(request).alignItems).to.equal('flex-end');
    });

    it('reduces the response body inset when hide-avatar is set', async () => {
      const el = await renderShell('response');
      const body = el.shadowRoot!.querySelector<HTMLElement>(
        `.${blockClass}__body`
      )!;
      const withAvatar = getComputedStyle(body).paddingInlineStart;

      el.hideAvatar = true;
      await el.updateComplete;

      expect(getComputedStyle(body).paddingInlineStart).to.not.equal(
        withAvatar
      );
    });
  });

  describe('empty slots', () => {
    /** Lets `slotchange` fire and the resulting render settle. */
    const settle = async (el: CDSAIChatMessageItemShell) => {
      await new Promise((resolve) => setTimeout(resolve));
      await el.updateComplete;
    };

    const height = (el: Element) => el.getBoundingClientRect().height;

    /** Renders a shell whose footer and attachment slots forward a host slot. */
    async function renderForwarded(rowType: (typeof rowTypes)[number]) {
      const container = await fixture<HTMLElement>(
        html`<div style="inline-size: 400px"></div>`
      );
      const host = document.createElement('div');
      host.attachShadow({ mode: 'open' }).innerHTML = `
        <cds-aichat-message-item-shell row-type="${rowType}">
          <div style="block-size: 20px"></div>
          <slot slot="attachment" name="attachment"></slot>
          <slot slot="footer" name="footer"></slot>
        </cds-aichat-message-item-shell>
      `;
      container.append(host);
      const shell = host.shadowRoot!.querySelector(
        'cds-aichat-message-item-shell'
      ) as CDSAIChatMessageItemShell;
      await settle(shell);
      return { host, shell };
    }

    rowTypes.forEach((rowType) => {
      describe(`row-type="${rowType}"`, () => {
        it('adds no height for unfilled attachment and footer slots', async () => {
          const contentOnly = await fixture<CDSAIChatMessageItemShell>(html`
            <cds-aichat-message-item-shell row-type=${rowType}>
              <div style="block-size: 20px"></div>
            </cds-aichat-message-item-shell>
          `);
          await settle(contentOnly);

          expect(height(contentOnly)).to.equal(20);
        });

        it('adds no height for forwarded slots with nothing assigned', async () => {
          const { shell } = await renderForwarded(rowType);

          expect(height(shell)).to.equal(20);
        });

        it('adds height once the forwarded slots are filled', async () => {
          const { host, shell } = await renderForwarded(rowType);
          host.insertAdjacentHTML(
            'beforeend',
            `<div slot="attachment" style="block-size: 10px"></div>
             <div slot="footer" style="block-size: 10px"></div>`
          );
          await settle(shell);

          expect(height(shell)).to.be.greaterThan(40);
        });

        it('adds height for an element in each slot', async () => {
          const el = await fixture<CDSAIChatMessageItemShell>(html`
            <cds-aichat-message-item-shell row-type=${rowType}>
              <div style="block-size: 20px"></div>
              <div slot="attachment" style="block-size: 10px"></div>
              <div slot="footer" style="block-size: 10px"></div>
            </cds-aichat-message-item-shell>
          `);
          await settle(el);

          expect(height(el)).to.be.greaterThan(40);
        });
      });
    });

    describe('byline wrapper', () => {
      const wrapperOf = (el: CDSAIChatMessageItemShell) =>
        el.shadowRoot!.querySelector<HTMLElement>(`.${blockClass}__byline`)!;

      (
        [
          ['request', false],
          ['response', false],
          ['response', true],
        ] as const
      ).forEach(([rowType, hideAvatar]) => {
        const name = `${rowType}${hideAvatar ? ' hide-avatar' : ''}`;

        it(`is display: none with no byline in a ${name} row`, async () => {
          const el = await fixture<CDSAIChatMessageItemShell>(html`
            <cds-aichat-message-item-shell
              row-type=${rowType}
              ?hide-avatar=${hideAvatar}>
            </cds-aichat-message-item-shell>
          `);
          await settle(el);

          expect(getComputedStyle(wrapperOf(el)).display).to.equal('none');
        });

        it(`is visible with a byline in a ${name} row`, async () => {
          const el = await fixture<CDSAIChatMessageItemShell>(html`
            <cds-aichat-message-item-shell
              row-type=${rowType}
              ?hide-avatar=${hideAvatar}>
              <cds-aichat-message-byline slot="byline" label="Assistant">
              </cds-aichat-message-byline>
            </cds-aichat-message-item-shell>
          `);
          await settle(el);

          expect(getComputedStyle(wrapperOf(el)).display).to.not.equal('none');
        });
      });

      it('still hides an avatar when the byline is slotted after first render', async () => {
        const el = await fixture<CDSAIChatMessageItemShell>(html`
          <cds-aichat-message-item-shell row-type="response" hide-avatar>
          </cds-aichat-message-item-shell>
        `);
        await settle(el);
        el.insertAdjacentHTML(
          'beforeend',
          `<cds-aichat-message-byline slot="byline" label="Assistant">
             <span slot="avatar" id="late-avatar"></span>
           </cds-aichat-message-byline>`
        );
        await settle(el);

        expect(el.querySelector<HTMLElement>('#late-avatar')!.hidden).to.be
          .true;
      });
    });
  });

  describe('custom properties', () => {
    const bodyOf = (el: CDSAIChatMessageItemShell) =>
      el.shadowRoot!.querySelector<HTMLElement>(`.${blockClass}__body`)!;
    const inset = (el: CDSAIChatMessageItemShell) =>
      getComputedStyle(bodyOf(el)).paddingInlineStart;

    rowTypes.forEach((rowType) => {
      it(`sets the start inset of a ${rowType} body`, async () => {
        const unset = await renderShell(rowType);
        expect(inset(unset)).to.equal('48px');

        const set = await fixture<CDSAIChatMessageItemShell>(html`
          <cds-aichat-message-item-shell
            row-type=${rowType}
            style="--cds-aichat-message-item-shell-inset-start: 16px">
          </cds-aichat-message-item-shell>
        `);
        expect(inset(set)).to.equal('16px');
      });
    });

    it('keeps the start inset of a full-width response', async () => {
      const el = await fixture<CDSAIChatMessageItemShell>(html`
        <cds-aichat-message-item-shell row-type="response">
        </cds-aichat-message-item-shell>
      `);
      expect(inset(el)).to.equal('48px');

      el.fullWidth = true;
      await el.updateComplete;
      expect(inset(el)).to.equal('48px');
    });

    it('applies the inset property to a full-width response', async () => {
      const el = await fixture<CDSAIChatMessageItemShell>(html`
        <cds-aichat-message-item-shell
          row-type="response"
          full-width
          style="--cds-aichat-message-item-shell-inset-start: 16px">
        </cds-aichat-message-item-shell>
      `);

      expect(inset(el)).to.equal('16px');
    });

    it('keeps the start inset of a full-width request', async () => {
      const el = await fixture<CDSAIChatMessageItemShell>(html`
        <cds-aichat-message-item-shell row-type="request" full-width>
        </cds-aichat-message-item-shell>
      `);

      expect(inset(el)).to.equal('48px');
    });

    describe('byline gap', () => {
      /** Space between the bottom of the byline and the top of the content. */
      async function measureGap(rowType: string, style = '') {
        const el = await fixture<CDSAIChatMessageItemShell>(html`
          <cds-aichat-message-item-shell row-type=${rowType} style=${style}>
            <cds-aichat-message-byline slot="byline" label="Assistant">
            </cds-aichat-message-byline>
            <div id="content" style="block-size: 20px"></div>
          </cds-aichat-message-item-shell>
        `);
        await new Promise((resolve) => setTimeout(resolve));
        await el.updateComplete;
        const byline = el.querySelector('cds-aichat-message-byline')!;
        const content = el.querySelector('#content')!;
        return {
          el,
          gap:
            content.getBoundingClientRect().top -
            byline.getBoundingClientRect().bottom,
        };
      }

      it('is $spacing-02 between a response byline and its content', async () => {
        expect((await measureGap('response')).gap).to.equal(4);
      });

      it('follows the gap property', async () => {
        const { gap } = await measureGap(
          'response',
          '--cds-aichat-message-item-shell-gap-block-start: 12px'
        );
        expect(gap).to.equal(12);
      });

      it('adds no block-start padding to a request body', async () => {
        const { el } = await measureGap(
          'request',
          '--cds-aichat-message-item-shell-gap-block-start: 12px'
        );
        const body = el.shadowRoot!.querySelector<HTMLElement>(
          `.${blockClass}__body`
        )!;

        expect(getComputedStyle(body).paddingBlockStart).to.equal('0px');
      });

      it('adds no block-start padding to a response without a byline', async () => {
        const el = await fixture<CDSAIChatMessageItemShell>(html`
          <cds-aichat-message-item-shell row-type="response">
            <div style="block-size: 20px"></div>
          </cds-aichat-message-item-shell>
        `);
        await new Promise((resolve) => setTimeout(resolve));
        await el.updateComplete;
        const body = el.shadowRoot!.querySelector<HTMLElement>(
          `.${blockClass}__body`
        )!;

        expect(getComputedStyle(body).paddingBlockStart).to.equal('0px');
      });
    });
  });

  describe('request footer edge', () => {
    async function renderRequest(footerWidth: string) {
      const container = await fixture<HTMLElement>(html`
        <div style="inline-size: 400px">
          <cds-aichat-message-item-shell row-type="request">
            <div
              id="content"
              style="inline-size: 100px; block-size: 20px"></div>
            <div
              id="footer"
              slot="footer"
              style="inline-size: ${footerWidth}; block-size: 10px"></div>
          </cds-aichat-message-item-shell>
        </div>
      `);
      const shell = container.querySelector(
        'cds-aichat-message-item-shell'
      ) as CDSAIChatMessageItemShell;
      await new Promise((resolve) => setTimeout(resolve));
      await shell.updateComplete;
      return { container, shell };
    }

    it("matches the footer's leading edge to the content's", async () => {
      const { shell } = await renderRequest('40px');
      const content = shell.querySelector('#content')!.getBoundingClientRect();
      const footer = shell.querySelector('#footer')!.getBoundingClientRect();

      expect(footer.left).to.equal(content.left);
    });

    it('keeps the content inside the column for a wider footer', async () => {
      const { container, shell } = await renderRequest('600px');
      const column = container.getBoundingClientRect();
      const content = shell.querySelector('#content')!.getBoundingClientRect();
      const body = shell
        .shadowRoot!.querySelector(`.${blockClass}__body`)!
        .getBoundingClientRect();

      expect(content.right).to.be.at.most(column.right);
      expect(body.right).to.be.at.most(column.right);
      expect(body.left).to.be.at.least(column.left);
    });

    it('wraps a long request at the column width', async () => {
      const container = await fixture<HTMLElement>(html`
        <div style="inline-size: 400px">
          <cds-aichat-message-item-shell row-type="request">
            <div id="content">${'word '.repeat(200)}</div>
          </cds-aichat-message-item-shell>
        </div>
      `);
      const shell = container.querySelector('cds-aichat-message-item-shell')!;
      await new Promise((resolve) => setTimeout(resolve));
      const column = container.getBoundingClientRect();
      const content = shell.querySelector('#content')!.getBoundingClientRect();

      expect(content.right).to.be.at.most(column.right);
      expect(content.height).to.be.greaterThan(40);
    });
  });

  (
    [
      ['fullWidth', 'full-width'],
      ['hideAvatar', 'hide-avatar'],
    ] as const
  ).forEach(([property, attribute]) => {
    it(`reflects ${property} as ${attribute}`, async () => {
      const el = await renderShell('response');
      expect(el.hasAttribute(attribute)).to.be.false;

      el[property] = true;
      await el.updateComplete;
      expect(el.hasAttribute(attribute)).to.be.true;

      el[property] = false;
      await el.updateComplete;
      expect(el.hasAttribute(attribute)).to.be.false;
    });
  });
});
