/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Button, {
  BUTTON_KIND,
  BUTTON_SIZE,
} from "../../../../react/carbon/Button";
import ChevronLeft16 from "@carbon/icons/es/chevron--left/16.js";
import ChevronRight16 from "@carbon/icons/es/chevron--right/16.js";
import { carbonIconToReact } from "../../../utils/carbonIcon";
import React, {
  MutableRefObject,
  ReactElement,
  useState,
  Suspense,
} from "react";
import { useIntl } from "react-intl";
import { useSelector } from "react-redux";
import type { SwiperRef } from "swiper/react";
import type { Swiper as SwiperClass } from "swiper/types";

import { useLanguagePack } from "../../../hooks/useLanguagePack";
import {
  AppState,
  ChatWidthBreakpoint,
} from "../../../../../types/state/AppState";
const ChevronLeft = carbonIconToReact(ChevronLeft16);
const ChevronRight = carbonIconToReact(ChevronRight16);
interface SwiperCarouselProps {
  swiperRef?: MutableRefObject<SwiperRef>;
  initialSlide?: number;
  previousButton?: HTMLElement;
  nextButton?: HTMLElement;
  chatWidthBreakpoint: ChatWidthBreakpoint;
  onSlideChangeInternal: (swiper: SwiperClass) => void;
  children?: ReactElement[];
}

// Create a component that uses lazy-loaded Swiper
const SwiperCarousel = React.lazy(async () => {
  const [{ Swiper: SwiperComponent, SwiperSlide }, { A11y, Navigation }] =
    await Promise.all([import("swiper/react"), import("swiper/modules")]);

  const SWIPER_MODULES = [A11y, Navigation];

  return {
    default: ({
      swiperRef,
      initialSlide,
      previousButton,
      nextButton,
      chatWidthBreakpoint,
      onSlideChangeInternal,
      children,
    }: SwiperCarouselProps) => (
      <SwiperComponent
        ref={swiperRef}
        initialSlide={initialSlide}
        modules={SWIPER_MODULES}
        navigation={{
          prevEl: previousButton,
          nextEl: nextButton,
        }}
        slidesPerView="auto"
        spaceBetween={
          MESSAGE_RECEIVED_LEFT_MARGIN_BY_BREAKPOINT[chatWidthBreakpoint]
        }
        onSlideChange={onSlideChangeInternal}
        slidesOffsetBefore={
          MESSAGE_RECEIVED_LEFT_MARGIN_BY_BREAKPOINT[chatWidthBreakpoint]
        }
        slidesOffsetAfter={16}
        rewind
      >
        {React.Children.map(children, (child) => (
          <SwiperSlide
            key={child.key}
            className={`WACCarouselContainer__Slide--${chatWidthBreakpoint}`}
          >
            {child}
          </SwiperSlide>
        ))}
      </SwiperComponent>
    ),
  };
});

// This object holds the left margin value for received messages.
const MESSAGE_RECEIVED_LEFT_MARGIN_BY_BREAKPOINT = {
  [ChatWidthBreakpoint.NARROW]: 16,
  [ChatWidthBreakpoint.STANDARD]: 56,
  [ChatWidthBreakpoint.WIDE]: 56,
};

interface CarouselProps {
  /**
   * The actual items in the carousel all provided as an array of child components.
   */
  children?: ReactElement[];

  /**
   * An optional initial slide to slide to.
   */
  initialSlide?: number;

  /**
   * The callback that is called when the active slide changes.
   */
  onSlideChange?: (index: number) => void;

  /**
   * A reference to the swiper object.
   */
  swiperRef?: MutableRefObject<SwiperRef>;
}

function Carousel({
  children,
  swiperRef,
  initialSlide,
  onSlideChange,
}: CarouselProps) {
  const intl = useIntl();
  const { carousel_prevNavButton, carousel_nextNavButton } = useLanguagePack();
  const chatWidthBreakpoint = useSelector(
    (state: AppState) => state.chatWidthBreakpoint,
  );
  const [nextButton, setNextButton] = useState<HTMLElement>();
  const [previousButton, setPreviousButton] = useState<HTMLElement>();
  const [currentSlideNumber, setCurrentSlideNumber] = useState(1);

  function onSlideChangeInternal({ activeIndex }: SwiperClass) {
    setCurrentSlideNumber(activeIndex + 1);
    onSlideChange?.(activeIndex);
  }

  const totalSlideCount = React.Children.count(children);
  const currentLabel = intl.formatMessage(
    { id: "components_swiper_currentLabel" },
    { currentSlideNumber, totalSlideCount },
  );

  if (totalSlideCount <= 1) {
    return (
      <div className="WACCarouselContainer WACCarouselContainer--oneSlide">
        {children}
      </div>
    );
  }

  return (
    <div className="WACCarouselContainer">
      {nextButton && (
        <Suspense fallback={<div />}>
          <SwiperCarousel
            swiperRef={swiperRef}
            initialSlide={initialSlide}
            previousButton={previousButton}
            nextButton={nextButton}
            chatWidthBreakpoint={chatWidthBreakpoint}
            onSlideChangeInternal={onSlideChangeInternal}
          >
            {children}
          </SwiperCarousel>
        </Suspense>
      )}
      <div className={`WACCarouselContainer__Controls--${chatWidthBreakpoint}`}>
        <div className="WACCarouselContainer__Navigation">
          <Button
            ref={setPreviousButton}
            className="WACCarouselContainer__NavigationButton WACDirectionHasReversibleSVG"
            kind={BUTTON_KIND.GHOST}
            aria-label={carousel_prevNavButton}
            size={BUTTON_SIZE.SMALL}
          >
            <ChevronLeft slot="icon" />
          </Button>
          <div className="WACCarouselContainer__CurrentLabel">
            {currentLabel}
          </div>
          <Button
            ref={setNextButton}
            className="WACCarouselContainer__NavigationButton WACDirectionHasReversibleSVG"
            kind={BUTTON_KIND.GHOST}
            aria-label={carousel_nextNavButton}
            size={BUTTON_SIZE.SMALL}
          >
            <ChevronRight slot="icon" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Carousel;
