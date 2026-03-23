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
 * Enum representing different audio source types
 */
export enum AudioSource {
  SOUNDCLOUD = "soundcloud",
  NATIVE = "native",
  UNKNOWN = "unknown",
}

/**
 * URL patterns for detecting audio sources
 * Derived from react-player v2.15.1
 */
const MATCH_URL_SOUNDCLOUD = /(?:soundcloud\.com|snd\.sc)\/[^.]+$/;

const AUDIO_EXTENSIONS =
  /\.(m4a|m4b|mp4a|mpga|mp2|mp2a|mp3|m2a|m3a|wav|weba|aac|oga|spx)($|\?)/i;

/**
 * Detect the audio source type from a URL
 *
 * @param url - The audio URL to analyze
 * @returns The detected audio source type
 */
export function detectAudioSource(url: string): AudioSource {
  if (!url || typeof url !== "string") {
    return AudioSource.UNKNOWN;
  }

  // Check for SoundCloud (but not if it's a direct audio file)
  if (MATCH_URL_SOUNDCLOUD.test(url) && !AUDIO_EXTENSIONS.test(url)) {
    return AudioSource.SOUNDCLOUD;
  }

  // Check for native audio files
  if (AUDIO_EXTENSIONS.test(url)) {
    return AudioSource.NATIVE;
  }

  return AudioSource.UNKNOWN;
}

/**
 * Check if a URL is a SoundCloud audio
 *
 * @param url - The URL to check
 * @returns True if the URL is a SoundCloud audio
 */
export function isSoundCloudUrl(url: string): boolean {
  return detectAudioSource(url) === AudioSource.SOUNDCLOUD;
}

/**
 * Check if a URL is a native audio file
 *
 * @param url - The URL to check
 * @returns True if the URL is a native audio file
 */
export function isNativeAudioUrl(url: string): boolean {
  return detectAudioSource(url) === AudioSource.NATIVE;
}

// Made with Bob
