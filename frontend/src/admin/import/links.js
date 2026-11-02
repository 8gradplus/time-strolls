// Topothek document links in pasted text: anything separated by white space,
// one per line or not. A link is https://<archive>.topothek.at/…?doc=<id>;
// the same document twice counts once. Other links are reported as bad,
// other words are ignored.
export const parseLinks = (text) => {
  const links = [];
  const bad = [];
  const seen = new Set();
  for (const word of text.split(/\s+/)) {
    if (!/^https?:\/\//i.test(word)) continue;
    let url;
    try {
      url = new URL(word);
    } catch {
      bad.push(word);
      continue;
    }
    const doc = url.searchParams.get("doc");
    if (!url.hostname.endsWith(".topothek.at") || !doc) {
      bad.push(word);
      continue;
    }
    const key = `${url.hostname}|${doc}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push(word);
  }
  return { links, bad };
};
