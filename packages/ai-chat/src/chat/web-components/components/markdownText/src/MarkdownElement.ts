/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement } from "lit";
import { property, state } from "lit/decorators.js";
import throttle from "lodash-es/throttle.js";

import { TokenTree } from "../markdown/utils/tokenTree";
import { getMarkdownWorker } from "../markdown/workers/workerManager";

class MarkdownTextElement extends LitElement {
  @property({ type: String })
  set markdown(newMarkdown: string) {
    if (newMarkdown !== this.fullText) {
      this.fullText = newMarkdown;
      this.scheduleTokenParse();
    }
  }

  @property({ type: Boolean }) sanitizeHTML = false;

  @property({
    type: Boolean,
    attribute: "should-remove-padding",
    reflect: true,
  })
  shouldRemovePadding: boolean;

  private fullText = "";

  @state()
  tokenTree: TokenTree = {
    key: "root",
    token: {
      type: "root",
      tag: "",
      nesting: 0,
      level: 0,
      content: "",
      attrs: null,
      children: null,
      markup: "",
      block: true,
      hidden: false,
      map: null,
      info: "",
      meta: null,
    },
    children: [],
  };

  private scheduleTokenParse = throttle(async () => {
    this.tokenTree = (await getMarkdownWorker(
      this.fullText,
      this.tokenTree
    )) as TokenTree;
  }, 50);
}

export default MarkdownTextElement;
