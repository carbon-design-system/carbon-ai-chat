/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
 */

interface Settings {
  framework: "react" | "web-component";
  layout: "float" | "sidebar" | "fullscreen" | "fullscreen-no-gutter";
  homescreen: "none" | "default" | "splash" | "custom";
  writeableElements: "true" | "false";
}

interface KeyPairs {
  key: string;
  value: string;
}

export { KeyPairs, Settings };
