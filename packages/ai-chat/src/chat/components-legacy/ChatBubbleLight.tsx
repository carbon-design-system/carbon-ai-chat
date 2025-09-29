/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

/**
 * This component renders a chat bubble for light themes.
 */
function ChatBubbleLight() {
  const chatBubbleID = "cbl-";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 80 80"
    >
      <defs>
        <linearGradient
          id={`${chatBubbleID}-a`}
          x1={61.44}
          x2={61.44}
          y1={66.99}
          y2={60.01}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0} stopColor="#c6c6c6" />
          <stop offset={0.78} stopColor="#e0e0e0" />
        </linearGradient>
        <linearGradient
          id={`${chatBubbleID}-b`}
          x1={28.49}
          x2={53.04}
          y1={44.06}
          y2={86.58}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0} stopColor="#525252" stopOpacity={0.05} />
          <stop offset={1} stopOpacity={0.1} />
        </linearGradient>
        <linearGradient
          id={`${chatBubbleID}-c`}
          x1={30.05}
          x2={35.5}
          y1={54.31}
          y2={54.31}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0} stopColor="#a4a4a4" />
          <stop offset={1} stopColor="#bebebe" />
        </linearGradient>
        <linearGradient
          id={`${chatBubbleID}-d`}
          x1={28.61}
          x2={70.69}
          y1={-3.97}
          y2={68.92}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0} stopColor="#f4f4f4" />
          <stop offset={0.52} stopColor="#e0e0e0" />
          <stop offset={0.56} stopColor="#d8d8d8" />
          <stop offset={0.61} stopColor="#c6c6c6" />
          <stop offset={0.89} stopColor="#a8a8a8" />
          <stop offset={0.96} stopColor="#8d8d8d" />
        </linearGradient>
        <linearGradient
          xlinkHref={`#${chatBubbleID}-a`}
          id={`${chatBubbleID}-e`}
          x1={38.01}
          x2={38.01}
          y1={59.43}
          y2={3.27}
        />
        <linearGradient
          id={`${chatBubbleID}-f`}
          x1={21.52}
          x2={61.39}
          y1={36.2}
          y2={36.2}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0} stopColor="#e0e0e0" />
          <stop offset={1} stopColor="#c6c6c6" />
        </linearGradient>
        <linearGradient
          id={`${chatBubbleID}-h`}
          x1={17.68}
          x2={55.37}
          y1={15.75}
          y2={37.5}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0} stopColor="#fff" />
          <stop offset={0.05} stopColor="#fdfdfd" />
          <stop offset={0.3} stopColor="#f6f6f6" />
          <stop offset={1} stopColor="#f4f4f4" />
        </linearGradient>
        <linearGradient
          xlinkHref={`#${chatBubbleID}-h`}
          id={`${chatBubbleID}-i`}
          x1={14.24}
          x2={51.92}
          y1={21.81}
          y2={43.56}
        />
        <linearGradient
          xlinkHref={`#${chatBubbleID}-h`}
          id={`${chatBubbleID}-j`}
          x1={10.96}
          x2={48.66}
          y1={27.56}
          y2={49.33}
        />
        <linearGradient
          id={`${chatBubbleID}-k`}
          x1={15.14}
          x2={63.06}
          y1={5.72}
          y2={33.52}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset={0.78} stopColor="#fff" />
          <stop offset={0.8} stopColor="#fefefe" stopOpacity={0.98} />
          <stop offset={0.82} stopColor="#fcfcfc" stopOpacity={0.93} />
          <stop offset={0.85} stopColor="#f8f8f8" stopOpacity={0.84} />
          <stop offset={0.87} stopColor="#f2f2f2" stopOpacity={0.72} />
          <stop offset={0.9} stopColor="#eaeaea" stopOpacity={0.56} />
          <stop offset={0.93} stopColor="#e1e1e1" stopOpacity={0.37} />
          <stop offset={0.95} stopColor="#d7d7d7" stopOpacity={0.14} />
          <stop offset={0.97} stopColor="#d0d0d0" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d="M0 0h80v80H0z" fill="none" />
      <path
        d="M61.3 68.11a.67.67 0 0 0 .09-.14.67.67 0 0 1-.09.14Zm.22-.46a1.58 1.58 0 0 0 0-.32v-7.24 7.24a1.58 1.58 0 0 1 0 .32Zm-.09.26a1.18 1.18 0 0 0 .07-.2 1.18 1.18 0 0 1-.07.2Z"
        fill={`url(#${chatBubbleID}-a)`}
      />
      <path
        d="m15.13 52.11 45.5 26.28 4.25-2.51L19.4 49.63l-4.27 2.48z"
        fill={`url(#${chatBubbleID}-b)`}
      />
      <path
        d="m32.66 52.85-2.25 4.22a1.08 1.08 0 0 1-.36.35l2.83-1.65a1.08 1.08 0 0 0 .36-.35l2.26-4.22Z"
        fill={`url(#${chatBubbleID}-c)`}
      />
      <path
        d="M63.45 26.58 20.63 1.86a1 1 0 0 0-1-.1l-4 2.3a1 1 0 0 1 1 .1l42.85 24.72a3.17 3.17 0 0 1 1.42 2.47l-.1 36.08a1 1 0 0 1-.42.91l4-2.3a1 1 0 0 0 .42-.91L64.88 29a3.14 3.14 0 0 0-1.43-2.42Z"
        fill={`url(#${chatBubbleID}-d)`}
      />
      <path
        d="M59.48 28.88a3.17 3.17 0 0 1 1.42 2.47l-.1 36.08c0 .9-.65 1.26-1.42.81l-26.7-15.4-2.26 4.22a.9.9 0 0 1-1.33.28 3.07 3.07 0 0 1-1.22-1.53l-2.33-7.09-9-5.2a3.15 3.15 0 0 1-1.43-2.46L15.23 5c0-.9.64-1.27 1.43-.81Z"
        fill={`url(#${chatBubbleID}-e)`}
      />
      <path
        d="M59.48 28.88a3.17 3.17 0 0 1 1.42 2.47l-.1 36.08c0 .9-.65 1.26-1.42.81l-26.7-15.4-2.26 4.22a.9.9 0 0 1-1.33.28 3.07 3.07 0 0 1-1.22-1.53l-2.33-7.09-9-5.2a3.15 3.15 0 0 1-1.43-2.46L15.23 5c0-.9.64-1.27 1.43-.81Z"
        fill={`url(#${chatBubbleID}-f)`}
      />
      <path
        d="M59.48 28.88a3.17 3.17 0 0 1 1.42 2.47l-.1 36.08c0 .9-.65 1.26-1.42.81l-26.7-15.4-2.26 4.22a.9.9 0 0 1-1.33.28 3.07 3.07 0 0 1-1.22-1.53l-2.33-7.09-9-5.2a3.15 3.15 0 0 1-1.43-2.46L15.23 5c0-.9.64-1.27 1.43-.81Z"
        fill={`url(#${chatBubbleID}-e)`}
      />
      <path
        d="m57.99 37.07-.01 3.9L18.03 17.9l.01-3.9 39.95 23.07z"
        fill={`url(#${chatBubbleID}-h)`}
      />
      <path
        d="m57.99 45.11-.01 3.91-39.95-23.07.01-3.9 39.95 23.06z"
        fill={`url(#${chatBubbleID}-i)`}
      />
      <path
        d="m44.62 45.04-.01 3.9L18.03 33.6l.01-3.9 26.58 15.34z"
        fill={`url(#${chatBubbleID}-j)`}
      />
      <path
        d="M60.76 30.55a2.54 2.54 0 0 1 .14.8v3.95l.41-.13v-3.82a3.54 3.54 0 0 0-1.63-2.82L16.86 3.8a2.09 2.09 0 0 0-.44-.19l-.78.45a1 1 0 0 1 .21-.06h.48l.27.12 21.47 12.4 21.41 12.36a3.19 3.19 0 0 1 1.28 1.67Z"
        fill={`url(#${chatBubbleID}-k)`}
      />
    </svg>
  );
}

export { ChatBubbleLight };
