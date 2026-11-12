# Basics

Fast math-facts practice for kids. Static, offline-capable PWA (no server, no build step).

## Level 1
Multiplication and matching exact division facts, 1-12 (e.g. `7 × 8`, `56 ÷ 7`). No immediate repeats.

## How it works
- Start screen: Name (default Cole, remembered), Level, Number of questions (10/25/50/100, default 50).
- Big on-screen keypad (0-9, backspace, Go). The phone keyboard never opens. Desktop keyboards also work (digits, Enter, Backspace).
- Wrong once: "Try again". Wrong twice: the correct answer shows for 2 seconds, then the next question appears.
- Running timer and progress (e.g. 12/50).
- Results: total time, right first try, right second try, missed, accuracy (first try), average seconds per question, missed facts.
- History: every finished session is saved on this device (localStorage), newest first, with an Export CSV button. Results are not sent anywhere; each device keeps its own history.
- Works offline after the first visit (service worker cache `basics-v1`). "Add to Home Screen" on iPhone for an app icon.

## Files
- `index.html` - layout and styles
- `basics.js` - app logic (ES5) and the question generators (`LEVELS`)
- `sw.js` - offline cache (bump `CACHE` to `basics-v2` etc. when files change)
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png`

## Adding a level later
Add an entry to `LEVELS` in `basics.js` with an `id`, a `name`, and a `generate()` function that returns `{ text, answer, key }` (`answer` must be a whole number). Then bump the cache name in `sw.js`.

## Hosting
All paths are relative, so it works from any folder, including a GitHub Pages project URL such as `https://<user>.github.io/basics/`.
