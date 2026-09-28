# Regex Tester

**Live demo:** https://regex-tester-two-umber.vercel.app (Vercel) · [GitHub Pages mirror](https://babug01.github.io/regex-tester/)

Test a regular expression against a string, see every match highlighted inline, and inspect each
match's numbered and named capture groups in a side panel. Invalid regex syntax is caught and shown
inline instead of a blank or broken page. Runs entirely in the browser; nothing you paste ever
leaves your machine.

## Features

- **Pattern + flag checkboxes** (`g` `i` `m` `s` `u`) with live compilation — a `RegExp` constructor
  error (bad syntax, invalid flag combination) is caught and displayed inline rather than crashing the
  page.
- **Inline match highlighting** built by splitting the test string on match boundaries and rendering
  the pieces as React children — never `dangerouslySetInnerHTML` — so pattern and test-string content
  is always safely escaped, never interpreted as markup.
- **Per-match detail panel** — index, matched text, and every numbered and named capture group.
- **Example pattern library** — email, URL, IPv4, semantic version, and hex color — each labeled with
  whether it's a simplified shortcut or a fully bounding/validating pattern, so it's never presented as
  more correct than it actually is. The bundled IPv4 pattern specifically bounds each octet to 0-255
  (verified: it matches `192.168.1.1` but not `999.999.999.999` or `256.1.1.1`), and the semver example
  is the official semver.org reference regex with named capture groups.

## Tech Stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/) — no other runtime dependencies; matching
  uses the browser's native `RegExp`.

## Running locally

```bash
git clone https://github.com/Babug01/regex-tester.git
cd regex-tester
npm install
npm run dev
```

## License

MIT — see [LICENSE](LICENSE).
