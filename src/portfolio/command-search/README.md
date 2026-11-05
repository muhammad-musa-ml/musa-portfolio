# Portfolio command search

The immediate search ranks public text, names, abbreviations, typos and navigation intents. A separate worker runs a learned sentence-embedding model to add related passages. Results are links and excerpts from the curated source; this does not generate answers or infer new facts about Musa.

```tsx
import {
  rankSearch,
  searchMeaning,
  retryMeaningSearch,
} from "./command-search";
import type { MeaningUpdate } from "./command-search";

// Start with rankSearch(query). An effect can subscribe to the optional refinement:
useEffect(() => searchMeaning(query, setMeaning), [query]);
const results = rankSearch(
  query,
  meaning.query === query ? meaning.matches : [],
);
```

`SEARCH_ENTRIES` exports the public corpus. `rankSearch(query, matches?)` returns at most 15 `RankedEntry` values, with unique destinations and no more than two entries from a single project/article. `snippet` is an excerpt selected from the matching source passage. The five page IDs are `home`, `all-work`, `writing`, `playground`, and `about`; project and article IDs are `project-${id}` and `article-${slug}`. Detailed entries use the page's section anchors.

`searchMeaning(query, callback)` returns an unsubscribe function. Callbacks report `{ status, query, matches, message?, percent? }`; status is `idle`, `loading`, `searching`, `ready`, or `error`. Callback `query` preserves the exact caller input, including whitespace. The client debounces by 240 ms, only initializes for three or more characters, cancels queued searches on changes, suppresses stale results, and retains one worker for later palette opens. An in-flight ONNX call cannot be interrupted, but its stale result is discarded; only the newest pending query runs next. Query input to the model is capped at 300 characters. The small recent-query cache exists only in worker memory. `retryMeaningSearch()` clears an error and disposes the old worker; invoke `searchMeaning` again to retry.

## Public source and model

The corpus is generated exclusively from `content.ts` and `profile-details.ts`, using the existing strict literal-data AST loaders. It includes project summaries, roles, outcomes and sections; article sections/references; experience, education, toolkit groups/individual skills, credentials and publications. Hidden designs, legacy journeys and generic experiment labs are excluded.

Model: [Xenova/all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/751bff37182d3f1213fa05d7196b954e230abad9), pinned revision `751bff37182d3f1213fa05d7196b954e230abad9`, the ONNX conversion of [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2). Both model cards declare **Apache-2.0**. Runtime: `@huggingface/transformers` 4.3.2; quantized q8 weights, mean pooling, normalized 384-dimensional vectors, matching the model's [feature-extraction usage](https://huggingface.co/docs/transformers.js/api/pipelines#module_pipelines.FeatureExtractionPipeline).

Build-time inference uses ONNX Runtime CPU in Node. Browser inference uses ONNX Runtime WASM in a dedicated worker with one thread. Corpus passages are embedded once during generation; the browser embeds only queries. Long sections use overlapping passages, taking the strongest passage score for one stable destination.

No query or portfolio text is sent to a remote inference service. The first meaningful search does fetch public model/tokenizer assets from Hugging Face and the runtime's WASM asset; ordinary asset requests expose standard connection metadata to their hosts. Model assets may be cached by the browser. If those downloads or WASM are blocked/unavailable, instant text search continues and the UI can show the error. Model downloads are substantial, so search is never started by merely opening the palette.

## Regenerate and verify

```sh
node scripts/build-command-search.mjs
node scripts/build-command-search.mjs --check
node src/portfolio/command-search/evaluate.mjs
node --test src/portfolio/command-search/search.test.mjs
```

The build caches the downloaded model only in ignored `node_modules/.cache/command-search`. Generated tracked files contain public text, numeric vectors, model attribution/hashes and the reproducible evaluation report. `--check` does not download the model; it fails if source content, the pinned model or vector bytes drift. Run the generator and evaluation when either curated source changes. Tests check relevance and destinations, source coverage, corpus/vector consistency, result diversity, and lazy/debounced/race-safe client behavior. The separate evaluation actually executes the learned model on representative questions; its report is tied to corpus, ranking-source and test-case hashes. Re-run evaluation after a ranking change as well.

Initial measurements on this Windows machine: 204 entries / 206 passages; vector binary 316,416 bytes; corpus JSON about 190 KB. Quantized model file 22,972,370 bytes and tokenizer 711,661 bytes, plus WASM/runtime overhead. First Node model download and preparation took 4.24 seconds; cached preparation about 1.1–1.8 seconds. These are **Node CPU measurements, not browser/mobile startup guarantees**. Browser startup and its additional runtime transfer must be measured separately. The evaluation covers 27 queries (17 with learned inference) and checks top-3 destination relevance; it is a small regression set, not a comprehensive retrieval benchmark. Sixteen of the seventeen learned cases retrieve the expected destination in the raw semantic top three. The open-source-contribution paraphrase needs lexical evidence to reach the top three. The ambiguous phrase “tools with less token overhead” ranks GPU serving first and the Notion schema work second; the excerpt preserves the source's caveat that its measurement is response bytes, not tokens or model speed.
