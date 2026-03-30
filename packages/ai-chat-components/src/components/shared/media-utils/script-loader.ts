/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Utility for dynamically loading external scripts.
 * Caches loaded scripts to prevent duplicate loading.
 */
export class ScriptLoader {
  private static loadedScripts = new Map<string, Promise<void>>();

  /**
   * Load a script from the given URL.
   * Returns a promise that resolves when the script is loaded.
   * If the script is already loaded or loading, returns the existing promise.
   *
   * @param url - The URL of the script to load
   * @returns Promise that resolves when the script is loaded
   */
  static load(url: string): Promise<void> {
    // Return existing promise if script is already loaded or loading
    if (this.loadedScripts.has(url)) {
      return this.loadedScripts.get(url)!;
    }

    const promise = new Promise<void>((resolve, reject) => {
      // Check if script already exists in DOM
      const existingScript = document.querySelector(
        `script[src="${url}"]`,
      ) as HTMLScriptElement;

      if (existingScript) {
        // Script already in DOM, resolve immediately
        resolve();
        return;
      }

      // Create and append new script element
      const script = document.createElement("script");
      script.src = url;
      script.async = true;

      script.onload = () => {
        resolve();
      };

      script.onerror = () => {
        // Remove from cache on error so it can be retried
        this.loadedScripts.delete(url);
        reject(new Error(`Failed to load script: ${url}`));
      };

      document.head.appendChild(script);
    });

    this.loadedScripts.set(url, promise);
    return promise;
  }

  /**
   * Check if a script has been loaded.
   *
   * @param url - The URL of the script to check
   * @returns True if the script has been loaded
   */
  static isLoaded(url: string): boolean {
    return this.loadedScripts.has(url);
  }

  /**
   * Clear the cache of loaded scripts.
   * Useful for testing or when scripts need to be reloaded.
   */
  static clearCache(): void {
    this.loadedScripts.clear();
  }
}

// Made with Bob
