/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { uuid } from "../utils/lang/uuid";

/**
 * This component renders an error message svg to indicate an error has occurred.
 */
function ErrorMessageLight() {
  const linearGradientID = uuid();
  return (
    <svg viewBox="0 0 80 80">
      <defs>
        <linearGradient
          id={`${linearGradientID}-1`}
          x1="29.96"
          y1="36.32"
          x2="53.15"
          y2="-3.84"
          gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#525252" stopOpacity="0.05" />
          <stop offset="1" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient
          id={`${linearGradientID}-2`}
          x1="38.91"
          y1="29.41"
          x2="38.91"
          y2="78.7"
          gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#c6c6c6" />
          <stop offset="0.78" stopColor="#e0e0e0" />
        </linearGradient>
        <linearGradient
          id={`${linearGradientID}-3`}
          x1="18.08"
          y1="67.95"
          x2="71.65"
          y2="37.02"
          gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#e0e0e0" />
          <stop offset="0.13" stopColor="#f4f4f4" />
          <stop offset="0.56" stopColor="#e0e0e0" />
          <stop offset="0.62" stopColor="#d8d8d8" />
          <stop offset="0.7" stopColor="#c6c6c6" />
          <stop offset="0.89" stopColor="#a8a8a8" />
          <stop offset="1" stopColor="#8d8d8d" />
        </linearGradient>
        <linearGradient
          id={`${linearGradientID}-4`}
          x1="27.93"
          y1="30.78"
          x2="49.86"
          y2="68.76"
          gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.54" stopColor="#d0d0d0" stopOpacity="0" />
          <stop offset="0.82" stopColor="#f1f1f1" stopOpacity="0.7" />
          <stop offset="0.94" stopColor="#fff" />
        </linearGradient>
        <linearGradient
          id={`${linearGradientID}-5`}
          x1="28.67"
          y1="55.68"
          x2="47.16"
          y2="45.01"
          gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.05" stopColor="#fdfdfd" />
          <stop offset="0.3" stopColor="#f6f6f6" />
          <stop offset="1" stopColor="#f4f4f4" />
        </linearGradient>
      </defs>
      <rect width="80" height="80" fill="none" />
      <polygon
        points="59.91 78.34 16.91 53.51 21.77 50.7 64.77 75.53 59.91 78.34"
        fill={`url(#${linearGradientID}-1)`}
      />
      <path
        d="M39,6.92c12.15,7,22,24,21.92,38S51,64.49,38.83,57.48s-22-24-21.92-38S26.83-.09,39,6.92Z"
        fill={`url(#${linearGradientID}-2)`}
      />
      <path
        d="M42.85,4.68C36.74,1.15,31.2.82,27.2,3.15L23.54,5.28C27.52,3.08,33,3.45,39,6.92c12.15,7,22,24,21.92,38,0,6.77-2.35,11.58-6.13,13.94h-.07c-.32.2,3.66-2.1,3.66-2.1,4-2.3,6.39-7.18,6.41-14.12C64.81,28.7,55,11.69,42.85,4.68Z"
        fill={`url(#${linearGradientID}-3)`}
      />
      <path
        d="M29.11,3.91v.36a19.59,19.59,0,0,1,9.68,3c12,6.94,21.78,23.84,21.74,37.65,0,9.4-4.56,15.23-11.83,15.23a19.59,19.59,0,0,1-9.68-3C27,50.21,17.24,33.32,17.28,19.5c0-9.39,4.56-15.23,11.83-15.23V3.91m0,0c-7.21,0-12.17,5.71-12.2,15.59,0,14,9.77,31,21.92,38a20.18,20.18,0,0,0,9.87,3c7.21,0,12.17-5.71,12.2-15.6C60.9,31,51.13,14,39,6.9a19.94,19.94,0,0,0-9.87-3Z"
        fill={`url(#${linearGradientID}-4)`}
      />
      <path
        d="M38.93,49.79a6.83,6.83,0,0,1-2.66-2.51,6.19,6.19,0,0,1-.81-3v-1a2.26,2.26,0,0,1,.81-2c.54-.35,1.43-.17,2.66.54a6.67,6.67,0,0,1,2.61,2.5,6,6,0,0,1,.81,3v1a2.23,2.23,0,0,1-.81,2C41,50.66,40.13,50.49,38.93,49.79ZM37.77,38.16,36,22.77V13l5.81,3.36v9.73L40.17,39.55Z"
        fill={`url(#${linearGradientID}-5)`}
      />
    </svg>
  );
}

export { ErrorMessageLight };
