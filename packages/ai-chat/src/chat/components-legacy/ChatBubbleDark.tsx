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
 * This component renders an a chat bubble for dark themes.
 */
interface ChatBubbleDarkProps {
  label: string;
}

function ChatBubbleDark({ label }: ChatBubbleDarkProps) {
  const chatBubbleID = "cbl-";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 80"
      aria-label={label}
    >
      <defs>
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
      </defs>
      <path
        d="m15.129 52.11 45.498 26.279 4.248-2.507-45.473-26.255-4.273 2.483z"
        opacity={0.25}
      />
      <path
        fill={`url(#${chatBubbleID}-a)`}
        d="m32.663 52.846-2.258 4.227a1.138 1.138 0 0 1-.358.35l2.837-1.649a1.148 1.148 0 0 0 .358-.35L35.5 51.2Z"
      />
      <path
        fill={`url(#${chatBubbleID}-b)`}
        d="M63.454 26.582 20.631 1.858a1.006 1.006 0 0 0-1.014-.1l-3.973 2.3a1.006 1.006 0 0 1 1.014.1l42.823 24.725a3.148 3.148 0 0 1 1.419 2.462l-.1 36.084a1 1 0 0 1-.419.907l3.973-2.3a1 1 0 0 0 .419-.907l.1-36.084a3.145 3.145 0 0 0-1.419-2.463Z"
      />
      <path
        fill={`url(#${chatBubbleID}-c)`}
        d="M59.481 28.883a3.151 3.151 0 0 1 1.419 2.462l-.1 36.084c-.009.9-.647 1.26-1.424.812l-26.695-15.4-2.257 4.226a.9.9 0 0 1-1.333.273 3.086 3.086 0 0 1-1.224-1.527l-2.322-7.092-9-5.2a3.143 3.143 0 0 1-1.421-2.461l.1-36.084c0-.9.641-1.272 1.431-.816Z"
      />
      <path
        fill="#6f6f6f"
        d="m57.995 37.068-.011 3.902-39.952-23.066.011-3.902 39.952 23.066zM57.995 45.114l-.011 3.903-39.952-23.066.011-3.903 39.952 23.066zM44.62 45.041l-.011 3.902-26.577-15.344.011-3.902L44.62 45.041z"
      />
      <path
        fill={`url(#${chatBubbleID}-d)`}
        d="M60.756 30.548a2.507 2.507 0 0 1 .146.8l-.011 3.952a3.98 3.98 0 0 1 .413-.125l.011-3.826a3.541 3.541 0 0 0-1.628-2.821L16.864 3.8a1.976 1.976 0 0 0-.445-.192l-.775.45c.006 0 .015 0 .021-.008a.722.722 0 0 1 .188-.071h.015a.822.822 0 0 1 .151-.015h.101a1.087 1.087 0 0 1 .233.051c.014 0 .027.01.041.015a1.654 1.654 0 0 1 .264.121l21.411 12.37 21.412 12.362a3.155 3.155 0 0 1 1.275 1.665Z"
      />
    </svg>
  );
}

export { ChatBubbleDark };
