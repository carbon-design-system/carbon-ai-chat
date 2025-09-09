/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/* eslint-disable react/forbid-dom-props */

/**
 * Light and dark versions of the watsonx logo sourced from https://ibm.ent.box.com/s/ptn44fwqwbfu2i83poh4tk21a1lun3yn/folder/222574830530
 */

import React from "react";

import { uuid } from "../../utils/lang/uuid";
import { CarbonTheme } from "../../../types/config/PublicConfig";

interface AvatarProps {
  theme: CarbonTheme;
}

function Avatar({ theme }: AvatarProps) {
  const uniqueId = uuid();
  const a = `a-${uniqueId}`;
  const b = `b-${uniqueId}`;
  const c = `c-${uniqueId}`;
  const d = `d-${uniqueId}`;
  const e = `e-${uniqueId}`;

  if (theme === CarbonTheme.WHITE || theme === CarbonTheme.G10) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        className="cds--watsonx-avatar"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={a}
            x1="1186.526"
            y1="2863.168"
            x2="1199.825"
            y2="2845.109"
            gradientTransform="matrix(.8312 .55596 -.27409 .40979 -198.894 -1827.398)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".3" />
            <stop offset="1" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id={b}
            x1="1189.388"
            y1="2911.794"
            x2="1200.478"
            y2="2896.735"
            gradientTransform="rotate(146.223 380.87 -882.286) scale(1 -.493)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".3" />
            <stop offset=".9" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id={c}
            x1="-4995.033"
            y1="-20162.835"
            x2="-4981.733"
            y2="-20180.895"
            gradientTransform="rotate(-146.223 -971.422 -5714.55) scale(1 .493)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".32" />
            <stop offset=".354" stopOpacity=".798" />
            <stop offset=".7" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id={d}
            x1="0"
            y1="32"
            x2="32"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".1" stopColor="#a56eff" />
            <stop offset=".9" stopColor="#0f62fe" />
          </linearGradient>
          <mask
            id={e}
            x="0"
            y="0"
            width="32"
            height="32"
            maskUnits="userSpaceOnUse"
          >
            <path
              d="M16 1A14.915 14.915 0 0 0 5.502 5.286l1.4 1.429A12.922 12.922 0 0 1 16 3.001c.977 0 1.929.109 2.845.315-3.402.921-5.916 4.026-5.916 7.715 0 .782.118 1.537.328 2.252a7.978 7.978 0 0 0-2.188-.312c-3.704 0-6.819 2.534-7.726 5.957a12.954 12.954 0 0 1-.345-2.927c0-2.117.492-4.134 1.462-5.996l-1.773-.924A15.037 15.037 0 0 0 .999 16c0 8.271 6.729 15 15 15 3.949 0 7.678-1.522 10.498-4.286l-1.4-1.428A12.926 12.926 0 0 1 15.999 29c-3.648 0-6.945-1.516-9.309-3.945a5.959 5.959 0 0 1-1.621-4.086c0-3.309 2.691-6 6-6a6.006 6.006 0 0 1 5.897 7.107l1.967.367a7.971 7.971 0 0 0-.192-3.726 7.976 7.976 0 0 0 2.187.312c3.71 0 6.829-2.542 7.73-5.974.22.947.34 1.931.34 2.944 0 2.117-.492 4.134-1.462 5.995l1.773.924a15.034 15.034 0 0 0 1.688-6.919C31 7.729 24.272 1 16 1zm4.93 16.03c-3.309 0-6-2.692-6-6s2.691-6 6-6 6 2.691 6 6-2.691 6-6 6z"
              strokeWidth="0"
              fill="#ffffff"
            />
            <path
              strokeWidth="0"
              fill={`url(#${a})`}
              d="M8 9 0 0h16l2.305 3.305L8 9z"
            />
            <path
              strokeWidth="0"
              fill={`url(#${b})`}
              d="m12 31 4.386-9L6 21 2 31h10z"
            />
            <path
              strokeWidth="0"
              fill={`url(#${c})`}
              d="m24 23 8 9H16l-2.305-3.305L24 23z"
            />
            <path strokeWidth="0" d="M16 31h-4.283L15 22h2l-1 9z" />
          </mask>
        </defs>
        <g mask={`url(#${e})`}>
          <path fill={`url(#${d})`} strokeWidth="0" d="M0 0h32v32H0z" />
        </g>
        <circle cx="6" cy="6" r="2" fill="#001d6c" strokeWidth="0" />
        <circle cx="26" cy="26" r="2" fill="#001d6c" strokeWidth="0" />
        <path
          d="M16 31c-2.757 0-5-2.243-5-5s2.243-5 5-5 5 2.243 5 5-2.243 5-5 5zm0-8c-1.654 0-3 1.346-3 3s1.346 3 3 3 3-1.346 3-3-1.346-3-3-3z"
          fill="#001d6c"
          strokeWidth="0"
        />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className="cds--watsonx-avatar"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={a}
          x1="1196.653"
          y1="2930.892"
          x2="1209.953"
          y2="2912.832"
          gradientTransform="matrix(.8312 .55596 -.27409 .40979 -188.767 -1860.755)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".3" />
          <stop offset="1" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={b}
          x1="1299.261"
          y1="2844.072"
          x2="1310.351"
          y2="2829.012"
          gradientTransform="rotate(146.223 440.869 -882.286) scale(1 -.493)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".3" />
          <stop offset=".9" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={c}
          x1="-4885.16"
          y1="-20230.559"
          x2="-4871.86"
          y2="-20248.618"
          gradientTransform="rotate(-146.223 -911.421 -5714.55) scale(1 .493)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".32" />
          <stop offset=".354" stopOpacity=".798" />
          <stop offset=".7" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={d}
          x1="0"
          y1="32"
          x2="32"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset=".1" stopColor="#be95ff" />
          <stop offset=".9" stopColor="#4589ff" />
        </linearGradient>
        <mask
          id={e}
          x="0"
          y="0"
          width="32"
          height="32"
          maskUnits="userSpaceOnUse"
        >
          <path
            d="M16 1A14.915 14.915 0 0 0 5.502 5.286l1.4 1.429A12.922 12.922 0 0 1 16 3.001c.977 0 1.929.109 2.845.315-3.402.921-5.916 4.026-5.916 7.715 0 .782.118 1.537.328 2.252a7.978 7.978 0 0 0-2.188-.312c-3.704 0-6.819 2.534-7.726 5.957a12.954 12.954 0 0 1-.345-2.927c0-2.117.492-4.134 1.462-5.996l-1.773-.924A15.037 15.037 0 0 0 .999 16c0 8.271 6.729 15 15 15 3.949 0 7.678-1.522 10.498-4.286l-1.4-1.428A12.926 12.926 0 0 1 15.999 29c-3.648 0-6.945-1.516-9.309-3.945a5.959 5.959 0 0 1-1.621-4.086c0-3.309 2.691-6 6-6a6.006 6.006 0 0 1 5.897 7.107l1.967.367a7.971 7.971 0 0 0-.192-3.726 7.976 7.976 0 0 0 2.187.312c3.71 0 6.829-2.542 7.73-5.974.22.947.34 1.931.34 2.944 0 2.117-.492 4.134-1.462 5.995l1.773.924a15.034 15.034 0 0 0 1.688-6.919c0-8.271-6.729-15-15-15zm4.93 16.03c-3.309 0-6-2.692-6-6s2.691-6 6-6 6 2.691 6 6-2.691 6-6 6z"
            fill="#fff"
            strokeWidth="0"
          />
          <path
            fill={`url(#${a})`}
            strokeWidth="0"
            d="M8 9 0 0h16l2.305 3.305L8 9z"
          />
          <path
            fill={`url(#${b})`}
            strokeWidth="0"
            d="m12 31 4.386-9L6 21 2 31h10z"
          />
          <path
            fill={`url(#${c})`}
            strokeWidth="0"
            d="m24 23 8 9H16l-2.305-3.305L24 23z"
          />
          <path strokeWidth="0" d="M16 31h-4.283L15 22h2l-1 9z" />
        </mask>
      </defs>
      <g mask={`url(#${e})`}>
        <path fill={`url(#${d})`} strokeWidth="0" d="M0 0h32v32H0z" />
      </g>
      <circle cx="6" cy="6" r="2" fill="#f4f4f4" strokeWidth="0" />
      <circle cx="26" cy="26" r="2" fill="#f4f4f4" strokeWidth="0" />
      <path
        d="M16 31c-2.757 0-5-2.243-5-5s2.243-5 5-5 5 2.243 5 5-2.243 5-5 5zm0-8c-1.654 0-3 1.346-3 3s1.346 3 3 3 3-1.346 3-3-1.346-3-3-3z"
        fill="#f4f4f4"
        strokeWidth="0"
      />
    </svg>
  );
}

const AvatarExport = React.memo(Avatar);

export { AvatarExport as Avatar };
