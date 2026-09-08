import { useState } from "react";
import Header from "./components/Header";

const REPO_URL = "https://github.com/Babug01/regex-tester";

// --- Core logic (pure, no JSX — verified with a throwaway Node script
// against the exact cases called out in this tool's spec: the bundled IPv4
// pattern matches 192.168.1.1 and correctly rejects 999.999.999.999 because
// each octet alternative is bounded to 0-255, not just "1-3 digits") --------

function compileRegex(pattern, flags) {
  if (!pattern) return { regex: null, error: null };
  try {
    return { regex: new RegExp(pattern, flags), error: null };
  } catch (e) {
    return { regex: null, error: e.message };
  }
}

function toMatchInfo(m) {
  return {
    text: m[0],
    index: m.index,
    groups: m.slice(1),
    namedGroups: m.groups ? { ...m.groups } : null,
  };
}

// Global matches use matchAll (which safely advances past zero-length
// matches on its own — no manual lastIndex bookkeeping, so no risk of an
// infinite loop on a pattern like /a*/g). Without the g flag, only the
// single first match is reported, matching real RegExp.exec semantics.
function findMatches(regex, text) {
  if (!regex) return [];
  if (regex.global) {
    return Array.from(text.matchAll(regex), toMatchInfo);
  }
  const m = regex.exec(text);
  return m ? [toMatchInfo(m)] : [];
}

// --- Example pattern library ----------------------------------------------
// Each example states plainly whether it fully validates its format or is a
// simplified/non-bounding shortcut, so the tool never overstates what a
// pattern actually guarantees.
const EXAMPLES = [
  {
    id: "email",
    label: "Email",
    pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
    flags: "g",
    sample: "Contact: alice@example.com or bob.smith+ops@sub.example.co.uk",
    note: "Simplified — matches common email shapes but doesn't implement the full RFC 5322 grammar (e.g. quoted local parts).",
  },
  {
    id: "url",
    label: "URL",
    pattern: "https?:\\/\\/[^\\s]+",
    flags: "g",
    sample: "See https://example.com/docs and http://localhost:3000/api?x=1 for details.",
    note: "Simplified — matches http(s) URLs broadly by stopping at whitespace; doesn't validate domain or path structure.",
  },
  {
    id: "ipv4",
    label: "IPv4 address",
    pattern: "\\b(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\b",
    flags: "g",
    sample: "Valid: 192.168.1.1 and 10.0.0.255. Invalid (out of range): 999.999.999.999 and 256.1.1.1.",
    note: "Bounding, not simplified — each octet alternative is constrained to the 0-255 range, so it will not match 999.999.999.999 or 256.1.1.1 as whole addresses.",
  },
  {
    id: "semver",
    label: "Semantic version",
    pattern: "^(?<major>0|[1-9]\\d*)\\.(?<minor>0|[1-9]\\d*)\\.(?<patch>0|[1-9]\\d*)(?:-(?<prerelease>(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+(?<buildmetadata>[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$",
    flags: "gm",
    sample: "1.2.3\n1.2.3-alpha.1\n1.2.3+build.7\nnot-a-version",
    note: "The official semver.org reference regex — validates full semver (major.minor.patch plus optional prerelease/build metadata) with named capture groups for each part.",
  },
  {
    id: "hexcolor",
    label: "Hex color",
    pattern: "^#(?:[0-9a-fA-F]{3}){1,2}$",
    flags: "gmi",
    sample: "#fff\n#4f46e5\n#1234\nnotacolor",
    note: "Simplified — matches standard 3- or 6-digit hex colors only, not the 4/8-digit variants that include an alpha channel.",
  },
];

const FLAG_DEFS = [
  { id: "g", label: "g", title: "global — find all matches" },
  { id: "i", label: "i", title: "ignore case" },
  { id: "m", label: "m", title: "multiline — ^ and $ match line boundaries" },
  { id: "s", label: "s", title: "dotAll — . matches newlines too" },
  { id: "u", label: "u", title: "unicode — treat pattern as a sequence of code points" },
];

const styles = {
  root: { minHeight: "100dvh", display: "flex", flexDirection: "column" },
  content: { fontFamily: "system-ui, sans-serif", padding: "24px 32px", maxWidth: 1100, margin: "0 auto", color: "var(--text, #1a1a1a)", width: "100%", boxSizing: "border-box", background: "var(--bg-subtle, #f0efed)", flex: 1 },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  subtitle: { fontSize: 13, opacity: 0.6, margin: "4px 0 20px" },
  row: { display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" },
  input: {
    padding: "9px 12px", borderRadius: 6, border: "1px solid var(--border, #e5e7eb)",
    background: "var(--input-bg, #f9fafb)", color: "var(--text, #1a1a1a)", fontSize: 13,
    fontFamily: "'SFMono-Regular', Consolas, monospace", flex: 1, minWidth: 260,
  },
  flagLabel: (checked) => ({
    display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 6,
    border: "1px solid var(--border, #e5e7eb)", background: checked ? "var(--accent, #4f46e5)" : "transparent",
    color: checked ? "#fff" : "var(--text, #1a1a1a)", fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'SFMono-Regular', Consolas, monospace",
  }),
  textarea: {
    width: "100%", minHeight: 140, padding: 12, borderRadius: 8, border: "1px solid var(--border, #e5e7eb)",
    background: "var(--input-bg, #f9fafb)", color: "var(--text, #1a1a1a)", fontSize: 13, boxSizing: "border-box",
    fontFamily: "'SFMono-Regular', Consolas, monospace", resize: "vertical", lineHeight: 1.6,
  },
  highlightBox: {
    width: "100%", minHeight: 140, padding: 12, borderRadius: 8, border: "1px solid var(--border, #e5e7eb)",
    background: "var(--input-bg, #f9fafb)", color: "var(--text, #1a1a1a)", fontSize: 13, boxSizing: "border-box",
    fontFamily: "'SFMono-Regular', Consolas, monospace", whiteSpace: "pre-wrap", wordBreak: "break-word",
    lineHeight: 1.6, overflow: "auto",
  },
  mark: {
    background: "rgba(79,70,229,0.28)", borderRadius: 3, padding: "0 1px",
    outline: "1px solid rgba(79,70,229,0.5)",
  },
  errorBox: {
    padding: 14, borderRadius: 8, border: "1px solid #e05c5c", background: "rgba(224,92,92,0.08)",
    color: "#e05c5c", fontSize: 13, fontFamily: "'SFMono-Regular', Consolas, monospace",
  },
  hint: { fontSize: 12, opacity: 0.6, margin: "4px 0 12px" },
  sectionTitle: { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.6, marginBottom: 10, marginTop: 20 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 20 },
  panel: { display: "flex", flexDirection: "column", gap: 8 },
  label: { fontSize: 12, opacity: 0.6, fontWeight: 600 },
  matchList: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflow: "auto" },
  matchCard: { background: "var(--input-bg, #f9fafb)", border: "1px solid var(--border, #e5e7eb)", borderRadius: 8, padding: "10px 12px", fontSize: 12.5 },
  matchHeader: { display: "flex", justifyContent: "space-between", fontWeight: 600, marginBottom: 4 },
  matchText: { fontFamily: "'SFMono-Regular', Consolas, monospace", background: "rgba(79,70,229,0.12)", padding: "1px 5px", borderRadius: 4 },
  groupRow: { fontFamily: "'SFMono-Regular', Consolas, monospace", opacity: 0.85, marginTop: 2 },
  examplesRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  exampleBtn: {
    padding: "6px 12px", borderRadius: 20, border: "1px solid var(--border, #e5e7eb)", background: "transparent",
    color: "var(--text, #1a1a1a)", cursor: "pointer", fontSize: 12, fontWeight: 600,
  },
  noteBox: {
    padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border, #e5e7eb)", background: "var(--input-bg, #f9fafb)",
    fontSize: 12, opacity: 0.85, marginBottom: 12,
  },
};

// Rendered as React children (never dangerouslySetInnerHTML) — text and
// match content are auto-escaped by React the same way any other JSX text
// child is, so there's no way for pattern/user input to inject markup.
function HighlightedText({ text, matches }) {
  if (!text) return null;
  if (matches.length === 0) return <>{text}</>;
  const parts = [];
  let last = 0;
  matches.forEach((m, i) => {
    if (m.index > last) parts.push(<span key={`t${i}`}>{text.slice(last, m.index)}</span>);
    const end = m.index + m.text.length;
    parts.push(
      <mark key={`m${i}`} style={styles.mark} title={`Match ${i + 1} @ index ${m.index}`}>
        {m.text.length > 0 ? m.text : "​"}
      </mark>
    );
    last = Math.max(last, end);
  });
  if (last < text.length) parts.push(<span key="tail">{text.slice(last)}</span>);
  return <>{parts}</>;
}

export default function RegexTesterTool() {
  const [pattern, setPattern] = useState("\\b(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\\b");
  const [flags, setFlags] = useState({ g: true, i: false, m: false, s: false, u: false });
  const [testString, setTestString] = useState("Valid: 192.168.1.1 and 10.0.0.255. Invalid (out of range): 999.999.999.999 and 256.1.1.1.");
  const [activeNote, setActiveNote] = useState(EXAMPLES[2].note);

  const flagStr = FLAG_DEFS.filter((f) => flags[f.id]).map((f) => f.id).join("");
  const { regex, error } = compileRegex(pattern, flagStr);
  const matches = error ? [] : findMatches(regex, testString);

  function toggleFlag(id) {
    setFlags((f) => ({ ...f, [id]: !f[id] }));
  }

  function loadExample(ex) {
    setPattern(ex.pattern);
    setFlags({ g: ex.flags.includes("g"), i: ex.flags.includes("i"), m: ex.flags.includes("m"), s: ex.flags.includes("s"), u: ex.flags.includes("u") });
    setTestString(ex.sample);
    setActiveNote(ex.note);
  }

  return (
    <div style={styles.root}>
      <Header title="Regex Tester" repoUrl={REPO_URL} />
      <div style={styles.content}>
        <h1 style={styles.title}>Regex Tester</h1>
        <p style={styles.subtitle}>
          Test a pattern against a string, see every match highlighted inline, and inspect numbered and named capture
          groups per match. Invalid regex syntax is caught and shown inline instead of crashing. Nothing leaves the browser.
        </p>

        <div style={styles.examplesRow}>
          {EXAMPLES.map((ex) => (
            <button key={ex.id} style={styles.exampleBtn} onClick={() => loadExample(ex)}>{ex.label}</button>
          ))}
        </div>
        {activeNote && <div style={styles.noteBox}>{activeNote}</div>}

        <div style={styles.row}>
          <span style={{ ...styles.label, fontFamily: "'SFMono-Regular', Consolas, monospace" }}>/</span>
          <input style={styles.input} value={pattern} onChange={(e) => { setPattern(e.target.value); setActiveNote(null); }} placeholder="Enter a regular expression" spellCheck={false} />
          <span style={{ ...styles.label, fontFamily: "'SFMono-Regular', Consolas, monospace" }}>/{flagStr}</span>
        </div>
        <div style={styles.row}>
          {FLAG_DEFS.map((f) => (
            <label key={f.id} style={styles.flagLabel(flags[f.id])} title={f.title}>
              <input type="checkbox" checked={flags[f.id]} onChange={() => toggleFlag(f.id)} style={{ display: "none" }} />
              {f.label}
            </label>
          ))}
        </div>

        {error && <div style={styles.errorBox}>Invalid regular expression: {error}</div>}

        <div style={styles.grid}>
          <div style={styles.panel}>
            <span style={styles.label}>TEST STRING</span>
            <textarea style={styles.textarea} value={testString} onChange={(e) => setTestString(e.target.value)} spellCheck={false} placeholder="Paste text to test the pattern against" />
            <span style={styles.label}>HIGHLIGHTED</span>
            <div style={styles.highlightBox}>
              <HighlightedText text={testString} matches={matches} />
            </div>
          </div>

          <div style={styles.panel}>
            <span style={styles.label}>MATCHES ({matches.length})</span>
            {matches.length === 0 ? (
              <p style={styles.hint}>{error ? "Fix the pattern to see matches." : "No matches yet."}</p>
            ) : (
              <div style={styles.matchList}>
                {matches.map((m, i) => (
                  <div key={i} style={styles.matchCard}>
                    <div style={styles.matchHeader}>
                      <span>Match {i + 1} @ index {m.index}</span>
                    </div>
                    <div><span style={styles.matchText}>{m.text || "(empty match)"}</span></div>
                    {m.groups.length > 0 && (
                      <div style={styles.groupRow}>
                        {m.groups.map((g, gi) => `${gi + 1}: ${g === undefined ? "(undefined)" : g}`).join("  ·  ")}
                      </div>
                    )}
                    {m.namedGroups && Object.keys(m.namedGroups).length > 0 && (
                      <div style={styles.groupRow}>
                        {Object.entries(m.namedGroups).map(([k, v]) => `${k}: ${v === undefined ? "(undefined)" : v}`).join("  ·  ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!flags.g && matches.length <= 1 && !error && (
          <p style={styles.hint}>Only the first match is shown — check the "g" flag to find every match in the string.</p>
        )}
      </div>
    </div>
  );
}
