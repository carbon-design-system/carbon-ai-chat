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
function ErrorMessageDark() {
  const linearGradientID = uuid();
  return (
    <svg viewBox="0 0 80 80">
      <defs>
        <linearGradient
          id={`${linearGradientID}-1`}
          x1="38.91"
          y1="4.92"
          x2="38.91"
          y2="73.85"
          gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#262626" />
          <stop offset="1" stopColor="#393939" />
        </linearGradient>
        <linearGradient
          id={`${linearGradientID}-2`}
          x1="12.44"
          y1="71.21"
          x2="76.34"
          y2="34.31"
          gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#525252" />
          <stop offset="0.52" stopColor="#393939" />
          <stop offset="0.61" stopColor="#393939" />
          <stop offset="0.99" stopColor="#161616" />
        </linearGradient>
        <linearGradient
          id={`${linearGradientID}-3`}
          x1="39.38"
          y1="50.63"
          x2="52.04"
          y2="72.55"
          gradientTransform="matrix(1, 0, 0, -1, 0, 82)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.11" stopColor="#6f6f6f" stopOpacity="0" />
          <stop offset="0.94" stopColor="#6f6f6f" />
        </linearGradient>
      </defs>
      <rect width="80" height="80" fill="none" />
      <polygon
        points="59.91 78.34 16.91 53.51 21.77 50.7 64.77 75.53 59.91 78.34"
        opacity="0.25"
      />
      <path
        d="M39,6.92c12.15,7,22,24,21.92,38S51,64.49,38.83,57.48s-22-24-21.92-38S26.83-.09,39,6.92Z"
        fill={`url(#${linearGradientID}-1)`}
      />
      <path
        d="M42.85,4.68C36.74,1.15,31.2.82,27.2,3.15L23.54,5.28C27.52,3.08,33,3.45,39,6.92c12.15,7,22,24,21.92,38,0,6.77-2.35,11.58-6.13,13.94h-.07c-.32.2,3.66-2.1,3.66-2.1,4-2.3,6.39-7.18,6.41-14.12C64.81,28.7,55,11.69,42.85,4.68Z"
        fill={`url(#${linearGradientID}-2)`}
      />
      <path
        d="M29.11,3.91v.36a19.59,19.59,0,0,1,9.68,3c12,6.94,21.78,23.84,21.74,37.65,0,9.4-4.56,15.23-11.83,15.23a19.59,19.59,0,0,1-9.68-3C27,50.21,17.24,33.32,17.28,19.5c0-9.39,4.56-15.23,11.83-15.23V3.91m0,0c-7.21,0-12.17,5.71-12.2,15.59,0,14,9.77,31,21.92,38a20.18,20.18,0,0,0,9.87,3c7.21,0,12.17-5.71,12.2-15.6C60.9,31,51.13,14,39,6.9a19.94,19.94,0,0,0-9.87-3Z"
        fill={`url(#${linearGradientID}-3)`}
      />
      <path
        className="cls-6"
        d="M38.93,49.79a6.83,6.83,0,0,1-2.66-2.51,6.19,6.19,0,0,1-.81-3v-1a2.26,2.26,0,0,1,.81-2c.54-.35,1.43-.17,2.66.54a6.67,6.67,0,0,1,2.61,2.5,6,6,0,0,1,.81,3v1a2.23,2.23,0,0,1-.81,2C41,50.66,40.13,50.49,38.93,49.79ZM37.77,38.16,36,22.77V13l5.81,3.36v9.73L40.17,39.55Z"
        fill="#525252"
      />
    </svg>
  );
}

export { ErrorMessageDark };
