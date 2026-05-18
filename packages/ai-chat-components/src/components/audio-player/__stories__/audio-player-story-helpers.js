/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

const wait = (timeoutMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, timeoutMs);
  });

// Audio can finish drawing at slightly different times, so we pause before
// taking snapshots to keep results more consistent.
const SNAPSHOT_AUDIO_WAIT_MS = 3000;
const SNAPSHOT_FINAL_SETTLE_MS = 500;

export const waitForAudioReadyForSnapshot = async (canvasElement) => {
  const audioPlayer = canvasElement.querySelector("cds-aichat-audio-player");

  if (!audioPlayer) {
    return;
  }

  await audioPlayer.updateComplete;
  // We use a fixed wait here because "ready" can happen before the bar looks
  // fully loaded.
  await wait(SNAPSHOT_AUDIO_WAIT_MS);

  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await wait(SNAPSHOT_FINAL_SETTLE_MS);
};
