/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { svg, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';

type PanelIllustrationTheme = 'dark' | 'light';

function renderChatBubble(
  theme: PanelIllustrationTheme,
  label: string,
  gradientID: string
) {
  const isDark = theme === 'dark';
  const darkGradients = svg`
      <linearGradient
        id=${`${gradientID}-a`}
        x1="30.047"
        x2="35.499"
        y1="54.31"
        y2="54.31"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0"
        stop-color="#393939"></stop>
        <stop
        offset="1"
        stop-color="#262626"></stop>
      </linearGradient>
      <linearGradient
        id=${`${gradientID}-b`}
        x1="28.608"
        x2="70.691"
        y1=${-3.968}
        y2="68.921"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0"
        stop-color="#6f6f6f"></stop>
        <stop
        offset="0.19"
        stop-color="#6c6c6c"></stop>
        <stop
        offset="0.316"
        stop-color="#636363"></stop>
        <stop
        offset="0.423"
        stop-color="#555"></stop>
        <stop
        offset="0.518"
        stop-color="#3f3f3f"></stop>
        <stop
        offset="0.545"
        stop-color="#383838"></stop>
        <stop
        offset="1"
        stop-color="#262626"></stop>
      </linearGradient>
      <linearGradient
        id=${`${gradientID}-c`}
        x1="15.125"
        x2="60.902"
        y1="36.198"
        y2="36.198"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0"
        stop-color="#525252"></stop>
        <stop
        offset="1"
        stop-color="#393939"></stop>
      </linearGradient>
      <linearGradient
        id=${`${gradientID}-d`}
        x1="15.14"
        x2="63.056"
        y1="5.723"
        y2="33.517"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0.777"
        stop-color="#8d8d8d"></stop>
        <stop
        offset="0.806"
        stop-color="#8a8a8a"
        stop-opacity="0.967"></stop>
        <stop
        offset="0.839"
        stop-color="gray"
        stop-opacity="0.872"></stop>
        <stop
        offset="0.873"
        stop-color="#6f6f6f"
        stop-opacity="0.713"></stop>
        <stop
        offset="0.908"
        stop-color="#595959"
        stop-opacity="0.491"></stop>
        <stop
        offset="0.944"
        stop-color="#3b3b3b"
        stop-opacity="0.209"></stop>
        <stop
        offset="0.967"
        stop-color="#262626"
        stop-opacity="0"></stop>
      </linearGradient>
    `;
  const lightGradients = svg`
      <linearGradient
        id=${`${gradientID}-a`}
        x1="61.44"
        x2="61.44"
        y1="66.99"
        y2="60.01"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0"
        stop-color="#c6c6c6"></stop>
        <stop
        offset="0.78"
        stop-color="#e0e0e0"></stop>
      </linearGradient>
      <linearGradient
        id=${`${gradientID}-b`}
        x1="28.49"
        x2="53.04"
        y1="44.06"
        y2="86.58"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0"
        stop-color="#525252"
        stop-opacity="0.05"></stop>
        <stop
        offset="1"
        stop-opacity="0.1"></stop>
      </linearGradient>
      <linearGradient
        id=${`${gradientID}-c`}
        x1="30.05"
        x2="35.5"
        y1="54.31"
        y2="54.31"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0"
        stop-color="#a4a4a4"></stop>
        <stop
        offset="1"
        stop-color="#bebebe"></stop>
      </linearGradient>
      <linearGradient
        id=${`${gradientID}-d`}
        x1="28.61"
        x2="70.69"
        y1=${-3.97}
        y2="68.92"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0"
        stop-color="#f4f4f4"></stop>
        <stop
        offset="0.52"
        stop-color="#e0e0e0"></stop>
        <stop
        offset="0.56"
        stop-color="#d8d8d8"></stop>
        <stop
        offset="0.61"
        stop-color="#c6c6c6"></stop>
        <stop
        offset="0.89"
        stop-color="#a8a8a8"></stop>
        <stop
        offset="0.96"
        stop-color="#8d8d8d"></stop>
      </linearGradient>
      <linearGradient
        href=${`#${gradientID}-a`}
        id=${`${gradientID}-e`}
        x1="38.01"
        x2="38.01"
        y1="59.43"
        y2="3.27"></linearGradient>
      <linearGradient
        id=${`${gradientID}-f`}
        x1="21.52"
        x2="61.39"
        y1="36.2"
        y2="36.2"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0"
        stop-color="#e0e0e0"></stop>
        <stop
        offset="1"
        stop-color="#c6c6c6"></stop>
      </linearGradient>
      <linearGradient
        id=${`${gradientID}-h`}
        x1="17.68"
        x2="55.37"
        y1="15.75"
        y2="37.5"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0"
        stop-color="#fff"></stop>
        <stop
        offset="0.05"
        stop-color="#fdfdfd"></stop>
        <stop
        offset="0.3"
        stop-color="#f6f6f6"></stop>
        <stop
        offset="1"
        stop-color="#f4f4f4"></stop>
      </linearGradient>
      <linearGradient
        href=${`#${gradientID}-h`}
        id=${`${gradientID}-i`}
        x1="14.24"
        x2="51.92"
        y1="21.81"
        y2="43.56"></linearGradient>
      <linearGradient
        href=${`#${gradientID}-h`}
        id=${`${gradientID}-j`}
        x1="10.96"
        x2="48.66"
        y1="27.56"
        y2="49.33"></linearGradient>
      <linearGradient
        id=${`${gradientID}-k`}
        x1="15.14"
        x2="63.06"
        y1="5.72"
        y2="33.52"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0.78"
        stop-color="#fff"></stop>
        <stop
        offset="0.8"
        stop-color="#fefefe"
        stop-opacity="0.98"></stop>
        <stop
        offset="0.82"
        stop-color="#fcfcfc"
        stop-opacity="0.93"></stop>
        <stop
        offset="0.85"
        stop-color="#f8f8f8"
        stop-opacity="0.84"></stop>
        <stop
        offset="0.87"
        stop-color="#f2f2f2"
        stop-opacity="0.72"></stop>
        <stop
        offset="0.9"
        stop-color="#eaeaea"
        stop-opacity="0.56"></stop>
        <stop
        offset="0.93"
        stop-color="#e1e1e1"
        stop-opacity="0.37"></stop>
        <stop
        offset="0.95"
        stop-color="#d7d7d7"
        stop-opacity="0.14"></stop>
        <stop
        offset="0.97"
        stop-color="#d0d0d0"
        stop-opacity="0"></stop>
      </linearGradient>
    `;
  return svg`<svg
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        viewBox="0 0 80 80"
        aria-label=${label}>
      <defs>${isDark ? darkGradients : lightGradients}</defs>
      ${
        !isDark
          ? svg`<path
        d="M0 0h80v80H0z"
        fill="none"></path>`
          : nothing
      }
      ${
        !isDark
          ? svg`<path
          d="M61.3 68.11a.67.67 0 0 0 .09-.14.67.67 0 0 1-.09.14Zm.22-.46a1.58 1.58 0 0 0 0-.32v-7.24 7.24a1.58 1.58 0 0 1 0 .32Zm-.09.26a1.18 1.18 0 0 0 .07-.2 1.18 1.18 0 0 1-.07.2Z"
          fill=${`url(#${gradientID}-a)`}
        ></path>`
          : nothing
      }
      <path
        d="m15.129 52.11 45.498 26.279 4.248-2.507-45.473-26.255-4.273 2.483z"
        fill=${ifDefined(isDark ? undefined : `url(#${gradientID}-b)`)}
        opacity=${ifDefined(isDark ? 0.25 : undefined)}></path>
      <path
        fill=${`url(#${gradientID}-${isDark ? 'a' : 'c'})`}
        d="m32.663 52.846-2.258 4.227a1.138 1.138 0 0 1-.358.35l2.837-1.649a1.148 1.148 0 0 0 .358-.35L35.5 51.2Z"></path>
      <path
        fill=${`url(#${gradientID}-${isDark ? 'b' : 'd'})`}
        d="M63.454 26.582 20.631 1.858a1.006 1.006 0 0 0-1.014-.1l-3.973 2.3a1.006 1.006 0 0 1 1.014.1l42.823 24.725a3.148 3.148 0 0 1 1.419 2.462l-.1 36.084a1 1 0 0 1-.419.907l3.973-2.3a1 1 0 0 0 .419-.907l.1-36.084a3.145 3.145 0 0 0-1.419-2.463Z"></path>
      <path
        fill=${`url(#${gradientID}-${isDark ? 'c' : 'e'})`}
        d="M59.481 28.883a3.151 3.151 0 0 1 1.419 2.462l-.1 36.084c-.009.9-.647 1.26-1.424.812l-26.695-15.4-2.257 4.226a.9.9 0 0 1-1.333.273 3.086 3.086 0 0 1-1.224-1.527l-2.322-7.092-9-5.2a3.143 3.143 0 0 1-1.421-2.461l.1-36.084c0-.9.641-1.272 1.431-.816Z"></path>
      ${
        !isDark
          ? svg`<path
          d="M59.48 28.88a3.17 3.17 0 0 1 1.42 2.47l-.1 36.08c0 .9-.65 1.26-1.42.81l-26.7-15.4-2.26 4.22a.9.9 0 0 1-1.33.28 3.07 3.07 0 0 1-1.22-1.53l-2.33-7.09-9-5.2a3.15 3.15 0 0 1-1.43-2.46L15.23 5c0-.9.64-1.27 1.43-.81Z"
          fill=${`url(#${gradientID}-f)`}
        ></path>`
          : nothing
      }
      ${
        !isDark
          ? svg`<path
          d="M59.48 28.88a3.17 3.17 0 0 1 1.42 2.47l-.1 36.08c0 .9-.65 1.26-1.42.81l-26.7-15.4-2.26 4.22a.9.9 0 0 1-1.33.28 3.07 3.07 0 0 1-1.22-1.53l-2.33-7.09-9-5.2a3.15 3.15 0 0 1-1.43-2.46L15.23 5c0-.9.64-1.27 1.43-.81Z"
          fill=${`url(#${gradientID}-e)`}
        ></path>`
          : nothing
      }
      <path
        fill=${isDark ? '#6f6f6f' : `url(#${gradientID}-h)`}
        d="m57.995 37.068-.011 3.902-39.952-23.066.011-3.902 39.952 23.066z"></path>
      <path
        fill=${isDark ? '#6f6f6f' : `url(#${gradientID}-i)`}
        d="M57.995 45.114l-.011 3.903-39.952-23.066.011-3.903 39.952 23.066z"></path>
      <path
        fill=${isDark ? '#6f6f6f' : `url(#${gradientID}-j)`}
        d="m44.62 45.041-.011 3.902-26.577-15.344.011-3.902L44.62 45.041z"></path>
      <path
        fill=${`url(#${gradientID}-${isDark ? 'd' : 'k'})`}
        d="M60.756 30.548a2.507 2.507 0 0 1 .146.8l-.011 3.952a3.98 3.98 0 0 1 .413-.125l.011-3.826a3.541 3.541 0 0 0-1.628-2.821L16.864 3.8a1.976 1.976 0 0 0-.445-.192l-.775.45c.006 0 .015 0 .021-.008a.722.722 0 0 1 .188-.071h.015a.822.822 0 0 1 .151-.015h.101a1.087 1.087 0 0 1 .233.051c.014 0 .027.01.041.015a1.654 1.654 0 0 1 .264.121l21.411 12.37 21.412 12.362a3.155 3.155 0 0 1 1.275 1.665Z"></path>
    </svg>`;
}

function renderErrorIllustration(
  theme: PanelIllustrationTheme,
  gradientID: string
) {
  const isDark = theme === 'dark';
  const darkGradients = svg`
      <linearGradient
        id=${`${gradientID}-1`}
        x1="38.91"
        y1="4.92"
        x2="38.91"
        y2="73.85"
        gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0"
        stop-color="#262626"></stop>
        <stop
        offset="1"
        stop-color="#393939"></stop>
      </linearGradient>
      <linearGradient
        id=${`${gradientID}-2`}
        x1="12.44"
        y1="71.21"
        x2="76.34"
        y2="34.31"
        gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0"
        stop-color="#525252"></stop>
        <stop
        offset="0.52"
        stop-color="#393939"></stop>
        <stop
        offset="0.61"
        stop-color="#393939"></stop>
        <stop
        offset="0.99"
        stop-color="#161616"></stop>
      </linearGradient>
      <linearGradient
        id=${`${gradientID}-3`}
        x1="39.38"
        y1="50.63"
        x2="52.04"
        y2="72.55"
        gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0.11"
        stop-color="#6f6f6f"
        stop-opacity="0"></stop>
        <stop
        offset="0.94"
        stop-color="#6f6f6f"></stop>
      </linearGradient>
    `;
  const lightGradients = svg`
      <linearGradient
        id=${`${gradientID}-1`}
        x1="29.96"
        y1="36.32"
        x2="53.15"
        y2="-3.84"
        gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0"
        stop-color="#525252"
        stop-opacity="0.05"></stop>
        <stop
        offset="1"
        stop-opacity="0.1"></stop>
      </linearGradient>
      <linearGradient
        id=${`${gradientID}-2`}
        x1="38.91"
        y1="29.41"
        x2="38.91"
        y2="78.7"
        gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0"
        stop-color="#c6c6c6"></stop>
        <stop
        offset="0.78"
        stop-color="#e0e0e0"></stop>
      </linearGradient>
      <linearGradient
        id=${`${gradientID}-3`}
        x1="18.08"
        y1="67.95"
        x2="71.65"
        y2="37.02"
        gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0"
        stop-color="#e0e0e0"></stop>
        <stop
        offset="0.13"
        stop-color="#f4f4f4"></stop>
        <stop
        offset="0.56"
        stop-color="#e0e0e0"></stop>
        <stop
        offset="0.62"
        stop-color="#d8d8d8"></stop>
        <stop
        offset="0.7"
        stop-color="#c6c6c6"></stop>
        <stop
        offset="0.89"
        stop-color="#a8a8a8"></stop>
        <stop
        offset="1"
        stop-color="#8d8d8d"></stop>
      </linearGradient>
      <linearGradient
        id=${`${gradientID}-4`}
        x1="27.93"
        y1="30.78"
        x2="49.86"
        y2="68.76"
        gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0.54"
        stop-color="#d0d0d0"
        stop-opacity="0"></stop>
        <stop
        offset="0.82"
        stop-color="#f1f1f1"
        stop-opacity="0.7"></stop>
        <stop
        offset="0.94"
        stop-color="#fff"></stop>
      </linearGradient>
      <linearGradient
        id=${`${gradientID}-5`}
        x1="28.67"
        y1="55.68"
        x2="47.16"
        y2="45.01"
        gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
        gradientUnits="userSpaceOnUse">
        <stop
        offset="0"
        stop-color="#fff"></stop>
        <stop
        offset="0.05"
        stop-color="#fdfdfd"></stop>
        <stop
        offset="0.3"
        stop-color="#f6f6f6"></stop>
        <stop
        offset="1"
        stop-color="#f4f4f4"></stop>
      </linearGradient>
    `;
  return svg`<svg
        viewBox="0 0 80 80">
      <defs>${isDark ? darkGradients : lightGradients}</defs>
      <rect
        width="80"
        height="80"
        fill="none"></rect>
      <polygon
        points="59.91 78.34 16.91 53.51 21.77 50.7 64.77 75.53 59.91 78.34"
        fill=${ifDefined(isDark ? undefined : `url(#${gradientID}-1)`)}
        opacity=${ifDefined(isDark ? '0.25' : undefined)}></polygon>
      <path
        d="M39,6.92c12.15,7,22,24,21.92,38S51,64.49,38.83,57.48s-22-24-21.92-38S26.83-.09,39,6.92Z"
        fill=${`url(#${gradientID}-${isDark ? '1' : '2'})`}></path>
      <path
        d="M42.85,4.68C36.74,1.15,31.2.82,27.2,3.15L23.54,5.28C27.52,3.08,33,3.45,39,6.92c12.15,7,22,24,21.92,38,0,6.77-2.35,11.58-6.13,13.94h-.07c-.32.2,3.66-2.1,3.66-2.1,4-2.3,6.39-7.18,6.41-14.12C64.81,28.7,55,11.69,42.85,4.68Z"
        fill=${`url(#${gradientID}-${isDark ? '2' : '3'})`}></path>
      <path
        d="M29.11,3.91v.36a19.59,19.59,0,0,1,9.68,3c12,6.94,21.78,23.84,21.74,37.65,0,9.4-4.56,15.23-11.83,15.23a19.59,19.59,0,0,1-9.68-3C27,50.21,17.24,33.32,17.28,19.5c0-9.39,4.56-15.23,11.83-15.23V3.91m0,0c-7.21,0-12.17,5.71-12.2,15.59,0,14,9.77,31,21.92,38a20.18,20.18,0,0,0,9.87,3c7.21,0,12.17-5.71,12.2-15.6C60.9,31,51.13,14,39,6.9a19.94,19.94,0,0,0-9.87-3Z"
        fill=${`url(#${gradientID}-${isDark ? '3' : '4'})`}></path>
      <path
        class=${ifDefined(isDark ? 'cls-6' : undefined)}
        d="M38.93,49.79a6.83,6.83,0,0,1-2.66-2.51,6.19,6.19,0,0,1-.81-3v-1a2.26,2.26,0,0,1,.81-2c.54-.35,1.43-.17,2.66.54a6.67,6.67,0,0,1,2.61,2.5,6,6,0,0,1,.81,3v1a2.23,2.23,0,0,1-.81,2C41,50.66,40.13,50.49,38.93,49.79ZM37.77,38.16,36,22.77V13l5.81,3.36v9.73L40.17,39.55Z"
        fill=${isDark ? '#525252' : `url(#${gradientID}-5)`}></path>
    </svg>`;
}

export { renderChatBubble, renderErrorIllustration };
