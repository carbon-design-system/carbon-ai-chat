# accessibility.md — Carbon AI Chat accessibility

Load this when shipping any UI change in any package. All UI must meet WCAG 2.1 AA.

## Keyboard navigation

- All interactive elements reachable via Tab / Enter / Escape / arrow keys.
- Focus order is logical and matches visual layout.
- No keyboard traps — users can navigate away from any element.

## Screen readers — semantic HTML & ARIA

- Use semantic HTML where possible (`<button>`, `<nav>`, `<main>`, etc.).
- Add ARIA labels/roles only when semantic HTML is insufficient.
- All images have appropriate alt text; form inputs have associated labels.
- Lit elements with shadow DOM may hide implicit semantics from some assistive tech — declare `role` and labels on the host element explicitly.

## Screen readers — live regions & announcements

Don't write raw `aria-live` attributes for app-level announcements. Use the centralized announcer:

| Package                            | How to announce                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@carbon/ai-chat` (React)          | [`useAriaAnnouncer()`](../packages/ai-chat/src/chat/hooks/useAriaAnnouncer.tsx) for ad-hoc announcements. [`AnnounceOnMountComponent`](../packages/ai-chat/src/chat/components/util/AnnounceOnMountComponent.tsx) for content that should be announced on mount. The provider that backs both lives in [`AriaAnnouncerComponent`](../packages/ai-chat/src/chat/components/aria/AriaAnnouncerComponent.tsx). |
| `@carbon/ai-chat-components` (Lit) | [`AriaAnnouncerManager`](../packages/ai-chat-components/src/globals/utils/aria-announcer-manager.ts) from the package's public API. Render visually-hidden regions in `render()`, `connect(regions)` in `firstUpdated`, `disconnect()` in `disconnectedCallback`, call `announce(text)` to speak.                                                                                                           |

Both back ends share the same manager class — fixes propagate to both consumers.

### Politeness levels

- `polite` — status changes, content updates, anything the user benefits from hearing but shouldn't have interrupted. Default choice.
- `assertive` — errors that block user progress (e.g. a rejected file upload, or the [`audio-player`](../packages/ai-chat-components/src/components/audio-player/src/audio-player.ts) / [`video-player`](../packages/ai-chat-components/src/components/video-player/src/video-player.ts) error states). Interrupts whatever the screen reader was reading, so use sparingly.

The shared [`AriaAnnouncerManager`](../packages/ai-chat-components/src/globals/utils/aria-announcer-manager.ts) carries both: `connect(politeRegions, assertiveRegions?)` and `announce(text, "polite" | "assertive")` (default polite; assertive falls back to polite when no assertive regions are connected). In `@carbon/ai-chat`, dispatch `actions.announceMessage({ messageID, messageValues, assertive: true })` (or pass `assertive: true` to `useAriaAnnouncer()`); the React announcer routes it into a dedicated `aria-live="assertive"` region. Two assertive patterns coexist and are both fine — the manager-driven hidden region above (fixed-markup `aria-live`, no `role`), and the standalone persistent `role="alert"` panes in `audio-player` / `video-player`. Don't combine `role="alert"` with `aria-live="assertive"` on the same node (see ARIA pitfalls below).

### Where announcements live (component vs `@carbon/ai-chat`)

When a piece of UI changes state, decide who owns the announcement by which surface changed:

- **A component owns the announcement when it owns the changing UI.** A self-contained element that renders a transient list or status (e.g. [`file-uploads`](../packages/ai-chat-components/src/components/file-uploads/src/file-uploads.ts)) should announce its own added / uploading / success / failure / removed transitions via `AriaAnnouncerManager`, by diffing its reactive props in `updated()`. This keeps one announcement source for every consumer of the component and co-locates it with the visual change. Render the live regions unconditionally (independent of whether the list is empty) so the last item's removal still announces, and announce user-initiated removals from the event handler rather than the diff (the diff also fires when the list clears for unrelated reasons).
- **`@carbon/ai-chat` owns the announcement when the state lives in the app, not the component** — post-send / message-list status, cross-cutting flows, or anything the component never sees. Dispatch `actions.announceMessage(...)` from the service or use `useAriaAnnouncer()` in React. The file-upload flow is the worked example: the input-area chips announce from the `file-uploads` component, the human-agent post-send success/failure announce from `HumanAgentServiceImpl`, and validation rejections (which block the user, before any chip exists) announce assertively from the React selection gate.

### ARIA pitfalls to avoid

- **Don't combine `role="status"` with `aria-live="polite"`** — `role="status"` already implies a polite live region. Pick one. Same for `role="alert"` + `aria-live="assertive"`.
- **`aria-atomic="true"` is a trade-off.** Firefox + JAWS will double-read parts of a region without it; Chrome will stop announcing buttons inside the region with it. Default off. Opt in only when the region holds plain text and you've verified both browsers.
- **NVDA drops announcements when focus moves at the same time the live region updates.** The shared `AriaAnnouncerManager` already debounces via a 250 ms `setTimeout` to work around this — don't re-roll it, and don't shorten the delay without testing on NVDA.

### When to author a new live region directly

Only when the centralized announcer doesn't fit the use case (e.g. a dedicated status pane that must remain visible and updated, like `audio-player` / `video-player` status text). In that case, follow the politeness + atomicity rules above.

## Visual & layout

- Support RTL via CSS logical properties (`padding-inline-start`, `inset-inline-end`, etc.). See [code-patterns.md → SCSS authoring](code-patterns.md#scss-authoring).

## Verifying changes

If your change adds or modifies announcements or dynamic state, exercise it with a screen reader before marking the task done:

- macOS: VoiceOver (Cmd+F5).
- Windows: NVDA (free) — most representative for this codebase since the 250 ms workaround is NVDA-driven.

Listen for: announcements firing on the expected events; no double-reads; focus moves don't drop announcements.

## References

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Carbon Design System Accessibility](https://carbondesignsystem.com/guidelines/accessibility/overview)

## Related guidance

- [Root AGENTS.md](../AGENTS.md) — repo-wide conventions
- [packages/ai-chat/AGENTS.md](../packages/ai-chat/AGENTS.md) — `@carbon/ai-chat` package
- [packages/ai-chat-components/AGENTS.md](../packages/ai-chat-components/AGENTS.md) — `@carbon/ai-chat-components` package
