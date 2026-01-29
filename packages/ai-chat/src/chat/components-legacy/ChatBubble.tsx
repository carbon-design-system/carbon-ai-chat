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

interface ChatBubbleProps {
  /**
   * Theme variant for the chat bubble
   */
  theme: "dark" | "light";

  label: string;
}

/**
 * This component renders a chat bubble svg.
 * Supports both dark and light theme variants.
 */
function ChatBubble({ theme, label }: ChatBubbleProps) {
  const chatBubbleID = uuid();
  const isDark = theme === "dark";

  // Dark theme gradient definitions
  const darkGradients = (
    <>
      <linearGradient
        id={`${chatBubbleID}-a`}
        x1={30.047}
        x2={35.499}
        y1={54.31}
        y2={54.31}
        gradientUnits="userSpaceOnUse"
      >
        <stop offset={0} stopColor="#393939" />
        <stop offset={1} stopColor="#262626" />
      </linearGradient>
      <linearGradient
        id={`${chatBubbleID}-b`}
        x1={28.608}
        x2={70.691}
        y1={-3.968}
        y2={68.921}
        gradientUnits="userSpaceOnUse"
      >
        <stop offset={0} stopColor="#6f6f6f" />
        <stop offset={0.19} stopColor="#6c6c6c" />
        <stop offset={0.316} stopColor="#636363" />
        <stop offset={0.423} stopColor="#555" />
        <stop offset={0.518} stopColor="#3f3f3f" />
        <stop offset={0.545} stopColor="#383838" />
        <stop offset={1} stopColor="#262626" />
      </linearGradient>
      <linearGradient
        id={`${chatBubbleID}-c`}
        x1={15.125}
        x2={60.902}
        y1={36.198}
        y2={36.198}
        gradientUnits="userSpaceOnUse"
      >
        <stop offset={0} stopColor="#525252" />
        <stop offset={1} stopColor="#393939" />
      </linearGradient>
      <linearGradient
        id={`${chatBubbleID}-d`}
        x1={15.14}
        x2={63.056}
        y1={5.723}
        y2={33.517}
        gradientUnits="userSpaceOnUse"
      >
        <stop offset={0.777} stopColor="#8d8d8d" />
        <stop offset={0.806} stopColor="#8a8a8a" stopOpacity={0.967} />
        <stop offset={0.839} stopColor="gray" stopOpacity={0.872} />
        <stop offset={0.873} stopColor="#6f6f6f" stopOpacity={0.713} />
        <stop offset={0.908} stopColor="#595959" stopOpacity={0.491} />
        <stop offset={0.944} stopColor="#3b3b3b" stopOpacity={0.209} />
        <stop offset={0.967} stopColor="#262626" stopOpacity={0} />
      </linearGradient>
    </>
  );

  // Light theme gradient definitions
  const lightGradients = (
    <>
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
    </>
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 80 80"
      aria-label={label}
    >
      <defs>{isDark ? darkGradients : lightGradients}</defs>
      {!isDark && <path d="M0 0h80v80H0z" fill="none" />}
      {!isDark && (
        <path
          d="M61.3 68.11a.67.67 0 0 0 .09-.14.67.67 0 0 1-.09.14Zm.22-.46a1.58 1.58 0 0 0 0-.32v-7.24 7.24a1.58 1.58 0 0 1 0 .32Zm-.09.26a1.18 1.18 0 0 0 .07-.2 1.18 1.18 0 0 1-.07.2Z"
          fill={`url(#${chatBubbleID}-a)`}
        />
      )}
      <path
        d="m15.129 52.11 45.498 26.279 4.248-2.507-45.473-26.255-4.273 2.483z"
        fill={isDark ? undefined : `url(#${chatBubbleID}-b)`}
        opacity={isDark ? 0.25 : undefined}
      />
      <path
        fill={`url(#${chatBubbleID}-${isDark ? "a" : "c"})`}
        d="m32.663 52.846-2.258 4.227a1.138 1.138 0 0 1-.358.35l2.837-1.649a1.148 1.148 0 0 0 .358-.35L35.5 51.2Z"
      />
      <path
        fill={`url(#${chatBubbleID}-${isDark ? "b" : "d"})`}
        d="M63.454 26.582 20.631 1.858a1.006 1.006 0 0 0-1.014-.1l-3.973 2.3a1.006 1.006 0 0 1 1.014.1l42.823 24.725a3.148 3.148 0 0 1 1.419 2.462l-.1 36.084a1 1 0 0 1-.419.907l3.973-2.3a1 1 0 0 0 .419-.907l.1-36.084a3.145 3.145 0 0 0-1.419-2.463Z"
      />
      <path
        fill={`url(#${chatBubbleID}-${isDark ? "c" : "e"})`}
        d="M59.481 28.883a3.151 3.151 0 0 1 1.419 2.462l-.1 36.084c-.009.9-.647 1.26-1.424.812l-26.695-15.4-2.257 4.226a.9.9 0 0 1-1.333.273 3.086 3.086 0 0 1-1.224-1.527l-2.322-7.092-9-5.2a3.143 3.143 0 0 1-1.421-2.461l.1-36.084c0-.9.641-1.272 1.431-.816Z"
      />
      {!isDark && (
        <path
          d="M59.48 28.88a3.17 3.17 0 0 1 1.42 2.47l-.1 36.08c0 .9-.65 1.26-1.42.81l-26.7-15.4-2.26 4.22a.9.9 0 0 1-1.33.28 3.07 3.07 0 0 1-1.22-1.53l-2.33-7.09-9-5.2a3.15 3.15 0 0 1-1.43-2.46L15.23 5c0-.9.64-1.27 1.43-.81Z"
          fill={`url(#${chatBubbleID}-f)`}
        />
      )}
      {!isDark && (
        <path
          d="M59.48 28.88a3.17 3.17 0 0 1 1.42 2.47l-.1 36.08c0 .9-.65 1.26-1.42.81l-26.7-15.4-2.26 4.22a.9.9 0 0 1-1.33.28 3.07 3.07 0 0 1-1.22-1.53l-2.33-7.09-9-5.2a3.15 3.15 0 0 1-1.43-2.46L15.23 5c0-.9.64-1.27 1.43-.81Z"
          fill={`url(#${chatBubbleID}-e)`}
        />
      )}
      <path
        fill={isDark ? "#6f6f6f" : `url(#${chatBubbleID}-h)`}
        d="m57.995 37.068-.011 3.902-39.952-23.066.011-3.902 39.952 23.066z"
      />
      <path
        fill={isDark ? "#6f6f6f" : `url(#${chatBubbleID}-i)`}
        d="M57.995 45.114l-.011 3.903-39.952-23.066.011-3.903 39.952 23.066z"
      />
      <path
        fill={isDark ? "#6f6f6f" : `url(#${chatBubbleID}-j)`}
        d="m44.62 45.041-.011 3.902-26.577-15.344.011-3.902L44.62 45.041z"
      />
      <path
        fill={`url(#${chatBubbleID}-${isDark ? "d" : "k"})`}
        d="M60.756 30.548a2.507 2.507 0 0 1 .146.8l-.011 3.952a3.98 3.98 0 0 1 .413-.125l.011-3.826a3.541 3.541 0 0 0-1.628-2.821L16.864 3.8a1.976 1.976 0 0 0-.445-.192l-.775.45c.006 0 .015 0 .021-.008a.722.722 0 0 1 .188-.071h.015a.822.822 0 0 1 .151-.015h.101a1.087 1.087 0 0 1 .233.051c.014 0 .027.01.041.015a1.654 1.654 0 0 1 .264.121l21.411 12.37 21.412 12.362a3.155 3.155 0 0 1 1.275 1.665Z"
      />
    </svg>
  );
}

export { ChatBubble };

// Made with Bob
