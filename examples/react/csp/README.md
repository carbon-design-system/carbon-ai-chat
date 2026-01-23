# React CSP Example

This example demonstrates how to use `@carbon/ai-chat` with the **strictest possible Content Security Policy (CSP)**.

## CSP Policy

This example implements the following strict CSP:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self';
  connect-src 'self';
  img-src 'self' data: blob:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
```
