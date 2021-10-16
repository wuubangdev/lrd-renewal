/** Guard against common local MT failure modes; this is not a substitute for editorial review. */
export function translationIssue(source, english) {
  if (source.length > 60 && english.length > Math.max(240, source.length * 3))
    return "unexpected expansion";
  if (source.length > 150 && english.length < source.length * 0.22)
    return "unexpectedly short translation";
  if (
    /\bOBJECTIVES?\s+To\b|\bMETHODS\s+The\b|\bCONCLUSIONS?\s+The\b/.test(english) &&
    !/OBJECTIVE|METHOD|CONCLUSION/.test(source)
  )
    return "invented scientific abstract";
  const count = (s) => {
    const words = s.toLowerCase().split(/\s+/),
      m = new Map();
    for (let i = 0; i + 5 <= words.length; i++) {
      const k = words.slice(i, i + 5).join(" ");
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const before = count(source),
    after = count(english);
  for (const [key, n] of after)
    if (n >= 4 && n > (before.get(key) ?? 0) + 2) return "repeated generated phrase";
  return null;
}
