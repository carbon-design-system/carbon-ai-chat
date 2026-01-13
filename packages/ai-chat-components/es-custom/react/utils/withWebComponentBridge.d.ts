/**
 * React 19 + @lit/react stop reliably flushing props to custom elements in DOM shims (happy-dom/jsdom)
 * because they lack property reflection and upgrade timing. Browsers are fine, but tests only pass string
 * attributes so Lit never sees updated properties. This bridge mirrors every non-reserved prop onto the
 * custom element instance so Lit receives the real values and behaves the same in shims and browsers until
 * upstream fixes land.
 *
 * Set `AICHAT_DISABLE_WEB_COMPONENT_BRIDGE=true` to make this a no-op (handy for verifying whether the
 * workaround is still required).
 */
import React from "react";
/**
 * Wrap a Lit `createComponent` result so that every prop is mirrored onto the underlying custom element as a property.
 */
export declare function withWebComponentBridge<P extends Record<string, unknown>, E extends Element = HTMLElement>(Component: React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<E>>): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<E>>;
