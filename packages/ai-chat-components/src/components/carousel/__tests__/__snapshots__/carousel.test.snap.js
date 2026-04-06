/* @web/test-runner snapshot v1 */
export const snapshots = {};

snapshots["carousel should render with cds-aichat-carousel minimum attributes"] = 
`<cds-aichat-carousel>
  <div class="carousel-wrapper carousel__view-stack">
    <div class="carousel__itemsWrapper">
      <div
        class="carousel__view carousel__view-active"
        data-index="0"
      >
        slide 1
      </div>
      <div
        aria-hidden="true"
        class="carousel__view"
        data-index="1"
        inert=""
      >
        slide 2
      </div>
      <div
        aria-hidden="true"
        class="carousel__view"
        data-index="2"
        inert=""
      >
        slide 3
      </div>
    </div>
    <div
      aria-atomic="true"
      aria-live="polite"
      class="carousel__live-region"
    >
      Item 1 of 3
    </div>
  </div>
</cds-aichat-carousel>
`;
/* end snapshot carousel should render with cds-aichat-carousel minimum attributes */

