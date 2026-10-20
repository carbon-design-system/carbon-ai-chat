/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent, type EventName } from '@lit/react';
import React from 'react';

import { CDSAICarousel } from '../components/aichat-carousel/index.js';
import type { CarouselResponse } from '../components/aichat-carousel/index.js';

const Carousel = createComponent({
  tagName: CDSAICarousel.is,
  elementClass: CDSAICarousel,
  react: React,
  events: {
    onChange: 'cds-aichat-carousel-onchange' as EventName<
      CustomEvent<CarouselResponse>
    >,
  },
});

export { Carousel };
export default Carousel;
