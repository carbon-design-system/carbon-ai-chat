/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Portions of this code are derived from react-player
 * Copyright (c) 2017 Pete Cook
 * Licensed under the MIT License
 * https://github.com/cookpete/react-player/blob/v2.15.1/LICENSE
 *
 * URL patterns and detection logic adapted from:
 * https://github.com/cookpete/react-player/blob/v2.15.1/src/patterns.js
 */

/**
 * Enum representing different video source types
 */
export enum VideoSource {
  YOUTUBE = "youtube",
  VIMEO = "vimeo",
  KALTURA = "kaltura",
  NATIVE = "native",
  UNKNOWN = "unknown",
}

/**
 * URL patterns for detecting video sources
 * Derived from react-player v2.15.1
 */
const MATCH_URL_YOUTUBE =
  /(?:youtu\.be\/|youtube(?:-nocookie|education)?\.com\/(?:embed\/|v\/|watch\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))((\w|-){11})|youtube\.com\/playlist\?list=|youtube\.com\/user\//;

const MATCH_URL_VIMEO = /vimeo\.com\/(?!progressive_redirect).+/;

const MATCH_URL_KALTURA =
  /^https?:\/\/[a-zA-Z]+\.kaltura.(com|org)\/p\/([0-9]+)\/sp\/([0-9]+)00\/embedIframeJs\/uiconf_id\/([0-9]+)\/partner_id\/([0-9]+)(.*)entry_id.([a-zA-Z0-9-_].*)$/;

const VIDEO_EXTENSIONS = /\.(mp4|og[gv]|webm|mov|m4v)(#t=[,\d+]+)?($|\?)/i;
const HLS_EXTENSIONS = /\.(m3u8)($|\?)/i;
const DASH_EXTENSIONS = /\.(mpd)($|\?)/i;

/**
 * Detect the video source type from a URL
 *
 * @param url - The video URL to analyze
 * @returns The detected video source type
 */
export function detectVideoSource(url: string): VideoSource {
  if (!url || typeof url !== "string") {
    return VideoSource.UNKNOWN;
  }

  // Check for YouTube
  if (MATCH_URL_YOUTUBE.test(url)) {
    return VideoSource.YOUTUBE;
  }

  // Check for Vimeo (but not if it's a direct video file)
  if (
    MATCH_URL_VIMEO.test(url) &&
    !VIDEO_EXTENSIONS.test(url) &&
    !HLS_EXTENSIONS.test(url)
  ) {
    return VideoSource.VIMEO;
  }

  // Check for Kaltura
  if (MATCH_URL_KALTURA.test(url)) {
    return VideoSource.KALTURA;
  }

  // Check for native video files
  if (
    VIDEO_EXTENSIONS.test(url) ||
    HLS_EXTENSIONS.test(url) ||
    DASH_EXTENSIONS.test(url)
  ) {
    return VideoSource.NATIVE;
  }

  return VideoSource.UNKNOWN;
}

/**
 * Check if a URL is a YouTube video
 *
 * @param url - The URL to check
 * @returns True if the URL is a YouTube video
 */
export function isYouTubeUrl(url: string): boolean {
  return detectVideoSource(url) === VideoSource.YOUTUBE;
}

/**
 * Check if a URL is a Vimeo video
 *
 * @param url - The URL to check
 * @returns True if the URL is a Vimeo video
 */
export function isVimeoUrl(url: string): boolean {
  return detectVideoSource(url) === VideoSource.VIMEO;
}

/**
 * Check if a URL is a Kaltura video
 *
 * @param url - The URL to check
 * @returns True if the URL is a Kaltura video
 */
export function isKalturaUrl(url: string): boolean {
  return detectVideoSource(url) === VideoSource.KALTURA;
}

/**
 * Check if a URL is a native video file
 *
 * @param url - The URL to check
 * @returns True if the URL is a native video file
 */
export function isNativeVideoUrl(url: string): boolean {
  return detectVideoSource(url) === VideoSource.NATIVE;
}

// Made with Bob
