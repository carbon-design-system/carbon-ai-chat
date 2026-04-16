/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/* eslint-disable */
import React from "react";
import { Carousel } from "../../../react/carousel";
import { Card } from "../../../react/card";
import "./story-styles.scss";

const cards = Array(8)
  .fill(null)
  .map((_, idx) => `Card ${idx + 1}`);

const argTypes = {
  nextBtnText: {
    control: "text",
    description: "Text for the next button",
  },
  previousBtnText: {
    control: "text",
    description: "Text for the previous button",
  },
  onChange: {
    action: "cds-aichat-carousel-onchange",
    table: {
      disable: true,
    },
  },
};

export default {
  title: "Preview/Carousel",
  argTypes,
  render: (args) => (
    <Carousel {...args}>
      <div className="container">
        {cards.map((card, _idx) => (
          <Card key={_idx}>
            <div slot="body">
              <div className="carousel-card">{card}</div>
            </div>
          </Card>
        ))}
      </div>
    </Carousel>
  ),
};

export const Default = {
  args: {
    nextBtnText: "Next",
    previousBtnText: "Previous",
  },
};
