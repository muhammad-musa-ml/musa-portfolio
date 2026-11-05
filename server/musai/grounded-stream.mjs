import { knowledge } from "./retrieve.mjs";

// Exact public destinations only. A familiar host is not evidence that an
// invented repository, article or hash exists on that host.
export function approvedLinks(retrieval) {
  return new Set([
    "/", "/work", "/about", "/writing", "/playground",
    ...Object.values(knowledge.links),
    ...knowledge.projects.map((project) => `/work/${project.id}`),
    ...retrieval.sources.map((source) => source.url),
    ...retrieval.selected.flatMap((document) => [
      document.url, ...document.links.map((link) => link.url),
    ]),
  ]);
}

/** Buffer a word or Markdown link, never a complete model response. This keeps
 * a guessed destination from becoming clickable even for a single stream frame.
 */
export function createGroundedStream(allowed) {
  let pending = "";
  const emittedLinks = new Set();
  const allowedUrl = (url) => allowed.has(url) ||
    (url.startsWith("https://iammusa.vercel.app/") &&
      allowed.has(url.slice("https://iammusa.vercel.app".length)));
  const cleanText = (text, linkify = true) => text.replace(
    /(?:https?:\/\/|mailto:|www\.|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\/|(?<![\p{L}\p{N}])\/(?=[a-zA-Z]))[^\s<>"'`\[\]]+/giu,
    (token) => {
      let url = token.replace(/[.,;:!?]+$/, "");
      while (url.endsWith(")") && (url.match(/\)/g)?.length ?? 0) > (url.match(/\(/g)?.length ?? 0))
        url = url.slice(0, -1);
      if (allowedUrl(url)) {
        if (linkify && !text.includes("`")) {
          emittedLinks.add(url);
          // The client autolinks HTTPS, but a relative path needs Markdown.
          if (url.startsWith("/")) return `[${url}](${url})${token.slice(url.length)}`;
        }
        return token;
      }
      return token.slice(url.length);
    },
  );
  function drain(final = false) {
    let output = "";
    while (pending) {
      const whitespace = pending.match(/^\s+/)?.[0];
      if (whitespace) {
        output += whitespace;
        pending = pending.slice(whitespace.length);
        continue;
      }
      if (pending[0] === "[") {
        const close = pending.indexOf("]");
        if (close < 0) {
          if (!final) break;
          output += cleanText(pending.replace(/[\[\]]/g, ""));
          pending = "";
          break;
        }
        if (close === pending.length - 1 && !final) break;
        const label = cleanText(pending.slice(1, close).replace(/[\[\]]/g, ""), false);
        if (pending[close + 1] === "(") {
          let depth = 1, end = close + 2;
          for (; end < pending.length; end++) {
            if (pending[end] === "(") depth++;
            if (pending[end] === ")" && --depth === 0) break;
          }
          if (end === pending.length) {
            if (!final) break;
            // An interrupted link is text, never a partly validated URL.
            output += label;
            pending = "";
            break;
          }
          const destination = pending.slice(close + 2, end);
          if (allowedUrl(destination)) {
            emittedLinks.add(destination);
            output += `[${label}](${destination})`;
          } else output += label;
          pending = pending.slice(end + 1);
          continue;
        }
        output += `[${label}]`;
        pending = pending.slice(close + 1);
        continue;
      }
      const boundary = pending.search(/[\s\[]/);
      if (boundary < 0 && !final) break;
      const end = boundary < 0 ? pending.length : boundary;
      output += cleanText(pending.slice(0, end));
      pending = pending.slice(end);
    }
    if (pending.length > 4096) throw new Error("unbounded_link_fragment");
    return output;
  }
  return {
    links: emittedLinks,
    push(text) { pending += text; return drain(); },
    finish() { return drain(true); },
  };
}
