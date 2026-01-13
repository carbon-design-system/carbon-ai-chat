/**
 * Generates a v4 UUID. Uses `crypto.randomUUID` when available, otherwise falls back to a simple implementation.
 */
declare function uuid(): string;
export { uuid };
