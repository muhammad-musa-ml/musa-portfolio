import entries from "./generated/entries.json";
import type { SearchEntry, SemanticMatch, RankedEntry } from "./types";

export const SEARCH_ENTRIES: SearchEntry[] = entries as SearchEntry[];
const STOP = new Set(
  "a an and are as at be been by can could did do does for from have how i in is it me my of on or our please show tell that the their them there these they this to was we were what when where which who why will with would you your keep keeping work works working get gets got go goes find finding help helping make making something someone things want know need use using used".split(
    " ",
  ),
);
export const normalizeSearch = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#.]+/gu, " ")
    .replace(/\.(?=\s|$)/g, "")
    .trim();
const tokenize = (text: string) =>
  normalizeSearch(text).split(/\s+/).filter(Boolean);
const stem = (text: string) =>
  text.length > 5 ? text.replace(/(?:ing|ed|s)$/, "") : text;
const ALIASES: Record<string, string[]> = {
  ai: ["artificial", "intelligence", "machine", "learning"],
  ml: ["machine", "learning"],
  nlp: ["language", "linguistic", "text"],
  llm: ["language", "model", "llms"],
  llms: ["llm", "language", "model"],
  rag: ["retrieval", "augmented", "generation"],
  rls: ["row", "level", "security", "consent"],
  db: ["database", "postgresql", "sqlite"],
  postgres: ["postgresql"],
  k8s: ["kubernetes"],
  js: ["javascript"],
  ts: ["typescript"],
  cv: ["resume", "vision"],
  gpu: ["cuda", "vllm", "serving"],
  ta: ["teaching", "assistant"],
  uw: ["wisconsin", "madison"],
  lums: ["lahore", "management", "sciences"],
  oss: ["open", "source"],
  pr: ["pull", "request"],
  papers: ["publications", "published", "research"],
  healthcare: ["health", "patient", "clinical"],
  medical: ["patient", "clinical", "health"],
  permissions: ["authorization", "consent", "access"],
  resume: ["résumé", "gauntlet"],
};

const INDEX = SEARCH_ENTRIES.map((entry) => {
  const title = normalizeSearch(entry.label);
  const keywords = tokenize(entry.keywords);
  const body = tokenize(entry.text ?? entry.snippet ?? entry.detail);
  const label = tokenize(entry.label);
  return {
    entry,
    title,
    label,
    keywords,
    body,
    terms: new Set([...label, ...keywords, ...body].map(stem)),
  };
});
const FREQUENCY = new Map<string, number>();
const FUZZY_VOCABULARY = [
  ...new Set(INDEX.flatMap((doc) => [...doc.label, ...doc.keywords])),
];
for (const doc of INDEX)
  for (const term of doc.terms)
    FREQUENCY.set(term, (FREQUENCY.get(term) ?? 0) + 1);
const idf = (term: string) =>
  Math.min(
    3.2,
    1 + Math.log((INDEX.length + 1) / ((FREQUENCY.get(stem(term)) ?? 0) + 1)),
  );

// Bounded Damerau–Levenshtein handles a missed letter or transposition. Short
// technical names are kept exact so C, C++, R and Go do not become arbitrary words.
function typoMatch(left: string, right: string) {
  if (left.length < 4 || right.length < 4) return false;
  const limit = left.length >= 8 ? 2 : 1;
  if (Math.abs(left.length - right.length) > limit) return false;
  let previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  let beforePrevious = previous;
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    let minimum = i;
    for (let j = 1; j <= right.length; j++) {
      let distance = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      if (
        i > 1 &&
        j > 1 &&
        left[i - 1] === right[j - 2] &&
        left[i - 2] === right[j - 1]
      )
        distance = Math.min(distance, beforePrevious[j - 2] + 1);
      current[j] = distance;
      minimum = Math.min(minimum, distance);
    }
    if (minimum > limit) return false;
    beforePrevious = previous;
    previous = current;
  }
  return previous[right.length] <= limit;
}

function intentTargets(query: string) {
  if (
    /^(?:hello|hi|hey|how are you|how r u|who are you|who is musa|who is muhammad musa|tell me about (?:you|yourself)|about you)\b/.test(
      query,
    )
  )
    return ["about", "section-story"];
  if (/\b(?:hire|hiring|recruit|recruiter|employment|candidate)\b/.test(query))
    return ["section-experience", "about", "section-contact"];
  if (
    /\b(?:skills|toolkit|tech stack|technology stack|what languages|what tools|what technologies)\b/.test(
      query,
    )
  )
    return ["section-toolkit"];
  if (
    /\b(?:where.*stud\w*|education|university|college|gpa|degree|masters)\b/.test(
      query,
    )
  )
    return ["section-education"];
  if (
    /^(?:projects|all work|portfolio|what (?:have you|did you|do you) (?:build|built)|things you (?:build|built))$/.test(
      query,
    )
  )
    return ["all-work", "playground"];
  if (/^(?:blog|blogs|writing|articles|what do you write)$/.test(query))
    return ["writing"];
  return [];
}

function matchingSnippet(entry: SearchEntry, terms: string[]) {
  // The displayed excerpt starts from actual body copy. Indexing context includes
  // headings and categories, which make poor standalone search-result snippets.
  const source = entry.snippet ?? entry.detail;
  const sentences = [
    ...new Set(
      [
        ...(source.match(/[^.!?]+[.!?]?/g) ?? [source]),
        ...((entry.text ?? "").match(/[^.!?]+[.!?]?/g) ?? []),
      ]
        .map((sentence) => sentence.trim())
        .filter(Boolean),
    ),
  ];
  const body = sentences.filter(
    (sentence) =>
      sentence.length >= 40 &&
      !normalizeSearch(entry.label).includes(normalizeSearch(sentence)),
  );
  const candidate =
    (body.length ? body : [source])
      .map((sentence) => ({
        sentence,
        score: terms.reduce(
          (total, term) =>
            total + (normalizeSearch(sentence).includes(term) ? idf(term) : 0),
          0,
        ),
      }))
      .sort((a, b) => b.score - a.score)[0]?.sentence ?? source;
  return candidate.length > 210
    ? `${candidate.slice(0, 207).replace(/\s+\S*$/, "")}…`
    : candidate;
}

export function rankSearch(
  query: string,
  semanticMatches: SemanticMatch[] = [],
): RankedEntry[] {
  const normalized = normalizeSearch(query).slice(0, 300);
  if (!normalized) {
    const defaults = new Set([
      "home",
      "all-work",
      "writing",
      "playground",
      "about",
      "section-toolkit",
      "section-experience",
      "section-education",
      "section-certificates",
      "section-publications",
      "section-contact",
    ]);
    return SEARCH_ENTRIES.filter((entry) => defaults.has(entry.id)).map(
      (entry) => ({ ...entry, score: 0 }),
    );
  }
  const terms = [
    ...new Set(tokenize(normalized).filter((term) => !STOP.has(term))),
  ].slice(0, 20);
  const expanded = [...new Set(terms.flatMap((term) => ALIASES[term] ?? []))];
  const fuzzy = new Map(
    terms.map((term) => [
      term,
      new Set(FUZZY_VOCABULARY.filter((word) => typoMatch(term, word))),
    ]),
  );
  const intents = intentTargets(normalized);
  const semantic = new Map(
    semanticMatches
      .filter((match) => Number.isFinite(match.score))
      .map((match) => [match.id, match.score]),
  );
  const bestSemantic = Math.max(0, ...semantic.values());
  const naturalQuery = tokenize(normalized).length >= 5 && semantic.size > 0;
  const capabilityQuestion =
    /\b(?:skills|toolkit|stack|tools|technologies|languages|frameworks|can you|do you|experience with)\b/.test(
      normalized,
    );
  const candidates: RankedEntry[] = [];
  for (const doc of INDEX) {
    let lexical = 0;
    let matched = 0;
    const exactLabel = doc.title === normalized;
    const namedSkill =
      exactLabel ||
      doc.label.some(
        (word) =>
          expanded.includes(word) ||
          terms.some(
            (term) =>
              word === term ||
              (term.length >= 3 && word.startsWith(term)) ||
              fuzzy.get(term)?.has(word),
          ),
      );
    // Individual skills share their group's context. That context is not evidence
    // that an arbitrary tool solves the request; require its name or known alias.
    if (doc.entry.id.startsWith("skill-") && !namedSkill) continue;
    for (const term of terms) {
      let weight = 0;
      if (doc.label.includes(term)) weight = 5;
      else if (
        doc.label.some((word) => word.length > 2 && stem(word) === stem(term))
      )
        weight = 4;
      else if (doc.keywords.includes(term)) weight = 2;
      else if (doc.terms.has(stem(term))) weight = 1;
      else if (
        term.length >= 3 &&
        doc.label.some((word) => word.startsWith(term))
      )
        weight = 2.8;
      else if (doc.label.some((word) => fuzzy.get(term)?.has(word)))
        weight = 2.6;
      else if (doc.keywords.some((word) => fuzzy.get(term)?.has(word)))
        weight = 1.1;
      lexical += weight * idf(term);
      if (weight) matched++;
    }
    for (const term of expanded)
      if (doc.terms.has(stem(term))) lexical += 0.5 * idf(term);
    lexical /= Math.sqrt(Math.max(1, terms.length));
    if (terms.length > 1) lexical *= 0.45 + 0.55 * (matched / terms.length);
    if (exactLabel) lexical += 42;
    else if (normalized.length > 3 && doc.title.includes(normalized))
      lexical += 11;
    if (
      (doc.entry.kind === "project" || doc.entry.kind === "article") &&
      lexical > 0
    )
      lexical += 1.8;
    const intentIndex = intents.indexOf(doc.entry.id);
    if (intentIndex >= 0) lexical += 95 - intentIndex * 12;
    const meaning = semantic.get(doc.entry.id) ?? 0;
    let semanticRelevant = meaning >= Math.max(0.31, bestSemantic * 0.67);
    if (
      doc.entry.id.startsWith("toolkit-") &&
      !namedSkill &&
      !capabilityQuestion &&
      meaning < 0.45
    )
      semanticRelevant = false;
    if (lexical <= 0 && !semanticRelevant) continue;
    // Natural-language requests can share generic words with unrelated headings.
    // When learned evidence exists, attenuate that weak lexical-only overlap.
    if (naturalQuery && !exactLabel && intentIndex < 0 && !semanticRelevant)
      lexical *= 0.4;
    const score = lexical + (semanticRelevant ? (meaning - 0.22) * 38 : 0);
    candidates.push({
      ...doc.entry,
      score,
      snippet: matchingSnippet(doc.entry, terms),
    });
  }
  candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const familyCounts = new Map<string, number>();
  const destinations = new Set<string>();
  const result: RankedEntry[] = [];
  for (const entry of candidates) {
    if (
      naturalQuery &&
      !intents.length &&
      entry.score < Math.max(2.5, (candidates[0]?.score ?? 0) * 0.33)
    )
      continue;
    const family = entry.parent ?? entry.id;
    if ((familyCounts.get(family) ?? 0) >= 2 || destinations.has(entry.href))
      continue;
    result.push(entry);
    destinations.add(entry.href);
    familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
    if (result.length === 15) break;
  }
  return result;
}
