/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, LitElement, css } from "lit";
import { customElement } from "lit/decorators.js";
import "@carbon/web-components/es/components/dropdown/index.js";

interface VersionOption {
  label: string;
  value: string;
  href: string;
  selected: boolean;
  divider?: boolean;
}

interface VersionInfo {
  type: "tag" | "version" | "local";
  value: string;
}

/**
 * `VersionDropdown` is a custom Lit element for selecting versions.
 */
@customElement("demo-chat-version-switcher")
export class VersionDropdown extends LitElement {
  private options: VersionOption[] = [];
  private selectedValue = "";

  static styles = css`
    :host {
      display: block;
    }

    cds-dropdown {
      width: 100%;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.initVersionDropdown();
  }

  private getCurrentVersionInfo(): VersionInfo {
    const path = window.location.pathname;

    // Check if we're on a tag (latest/next)
    const tagMatch = path.match(/\/tag\/(latest|next)\//);
    if (tagMatch) {
      return { type: "tag", value: tagMatch[1] };
    }

    // Check if we're on a versioned path
    const versionMatch = path.match(/\/version\/(v[\d.]+(?:-rc\.\d+)?)\//);
    if (versionMatch) {
      return { type: "version", value: versionMatch[1] };
    }

    // Check if we're on localhost (with or without port)
    const hostname = window.location.hostname;
    if (
      hostname.endsWith(".local") ||
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0"
    ) {
      return { type: "local", value: "local" };
    }

    // Default to latest if we can't determine
    return { type: "tag", value: "latest" };
  }

  private getVersionPath(versionInfo: VersionInfo): string {
    if (versionInfo.type === "tag") {
      return `/tag/${versionInfo.value}/demo/index.html`;
    } else {
      return `/version/${versionInfo.value}/demo/index.html`;
    }
  }

  private getVersionsPath(): string {
    const currentInfo = this.getCurrentVersionInfo();

    // If we're on localhost, fetch from local file
    if (currentInfo.type === "local") {
      return "./versions.js";
    }

    // For deployed sites, always fetch from the canonical location
    return "https://chat.carbondesignsystem.com/versions.js";
  }

  private formatOptionLabel(currentInfo: VersionInfo): string {
    if (currentInfo.type === "tag") {
      return (
        currentInfo.value.charAt(0).toUpperCase() + currentInfo.value.slice(1)
      );
    }

    if (currentInfo.type === "local") {
      return "Local";
    }

    return currentInfo.value;
  }

  private createCurrentVersionOption(
    currentInfo: VersionInfo,
  ): VersionOption | null {
    switch (currentInfo.type) {
      case "version": {
        const href = `${window.location.origin}${this.getVersionPath(currentInfo)}`;
        return {
          label: currentInfo.value,
          value: currentInfo.value,
          href,
          selected: true,
        };
      }

      case "tag": {
        const href = `${window.location.origin}${this.getVersionPath(currentInfo)}`;
        return {
          label: this.formatOptionLabel(currentInfo),
          value: `tag:${currentInfo.value}`,
          href,
          selected: true,
        };
      }

      case "local":
        return {
          label: this.formatOptionLabel(currentInfo),
          value: "local",
          href: window.location.href,
          selected: true,
        };

      default:
        return null;
    }
  }

  private async initVersionDropdown() {
    try {
      const versionsPath = this.getVersionsPath();
      const response = await fetch(versionsPath);

      if (!response.ok) {
        console.warn("Failed to fetch versions.js from", versionsPath);
        return;
      }

      const text = await response.text();

      // Extract the AI_CHAT_VERSIONS array from the file
      const match = text.match(
        /export\s+const\s+AI_CHAT_VERSIONS\s*=\s*(\[[\s\S]*?\]);?/,
      );
      if (!match) {
        console.warn("Failed to parse versions.js");
        return;
      }

      // Clean up array string for valid JSON
      const arrayString = match[1]
        .replace(/'/g, '"') // Replace single quotes with double quotes
        .replace(/,\s*\]/g, "]") // remove trailing comma
        .replace(/\s+/g, " ") // collapse whitespace/newlines
        .trim();
      const versions: string[] = JSON.parse(arrayString);

      // Build the dropdown options
      const currentInfo = this.getCurrentVersionInfo();
      let options: VersionOption[] = versions.map((version) => {
        const selected =
          currentInfo.type === "version" && currentInfo.value === version;
        return {
          label: version,
          value: version,
          href: `https://chat.carbondesignsystem.com${this.getVersionPath({ type: "version", value: version })}`,
          selected,
        };
      });

      let selectedValue =
        options.find((opt) => opt.selected && !opt.divider)?.value ?? null;

      if (!selectedValue) {
        const currentOption = this.createCurrentVersionOption(currentInfo);

        if (currentOption) {
          const existingIndex = options.findIndex(
            (opt) => opt.value === currentOption.value,
          );

          if (existingIndex >= 0) {
            options[existingIndex] = {
              ...options[existingIndex],
              selected: true,
            };
          } else {
            options = [currentOption, ...options];
          }

          selectedValue = currentOption.value;
        }
      }

      if (!selectedValue) {
        selectedValue = options[0]?.value ?? "local";
      }

      const normalizedOptions = options.map((option) => ({
        ...option,
        selected: option.value === selectedValue,
      }));

      this.options = normalizedOptions;
      this.selectedValue = selectedValue;
      this.requestUpdate();
    } catch (error) {
      console.error("Error initializing version dropdown:", error);
    }
  }

  private handleChange(event: CustomEvent) {
    const selectedValue = event.detail?.item?.value ?? event.detail?.value;
    const selectedOption = this.options.find(
      (opt) => !opt.divider && opt.value === selectedValue,
    );
    if (selectedOption && selectedOption.href !== "#") {
      window.location.href = selectedOption.href;
    }
  }

  render() {
    if (this.options.length === 0) {
      return html``;
    }

    return html`
      <cds-dropdown
        title-text="Select @carbon/ai-chat version"
        helper-text="Changing will reset all other settings"
        size="sm"
        .value=${this.selectedValue}
        @cds-dropdown-selected=${this.handleChange}
      >
        ${this.options.map((option) =>
          option.divider
            ? html`<cds-dropdown-item divider></cds-dropdown-item>`
            : html`<cds-dropdown-item value="${option.value}">
                ${option.label}
              </cds-dropdown-item>`,
        )}
      </cds-dropdown>
    `;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-chat-version-switcher": VersionDropdown;
  }
}
