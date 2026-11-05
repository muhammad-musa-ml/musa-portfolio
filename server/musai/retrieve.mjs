import knowledge from "./knowledge.generated.mjs";

export { knowledge };
export const normalize = (text) =>
  text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .trim();
const STOP = new Set(
  "a an and are as at be by can could did do does for from has have how i in is it me my of on or please show tell that the their them these this to was we were what when where which who why will with would you your work working make making know musa muhammad give links link details detail build built".split(
    " ",
  ),
);
const terms = (text) =>
  normalize(text)
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
const stem = (word) =>
  word.length > 5 ? word.replace(/(?:ing|ed|s)$/, "") : word;
const ALIASES = {
  js: ["javascript"],
  ts: ["typescript"],
  ml: ["machine", "learning"],
  ai: ["artificial", "intelligence"],
  nlp: ["language", "processing"],
  llm: ["language", "model"],
  db: ["database", "postgresql"],
  postgres: ["postgresql"],
  k8s: ["kubernetes"],
  rls: ["row", "level", "security"],
  ta: ["teaching", "assistant"],
  uw: ["wisconsin", "madison"],
  oss: ["open", "source"],
};
const TOPICS = [
  {
    pattern: /\b(data pipelines?|data ingestion|etl|airflow)\b/,
    ids: ["experience-saudconsult", "project-lookup", "toolkit-3"],
  },
  {
    pattern:
      /\b(database|databases|sql|postgres|postgresql|backend|back end|storage|records|data engineering)\b/,
    ids: [
      "project-wumi",
      "project-lookup",
      "toolkit-3",
      "experience-saudconsult",
    ],
  },
  {
    pattern:
      /\b(health|healthcare|patient|medical|consent|permission|permissions|clinic|clinical|fhir)\b/,
    ids: ["project-wumi", "experience-wumi"],
  },
  {
    pattern:
      /\b(ai safety|prompt injection|rag|poison|poisoning|malicious|security|defenses|defence|defense)\b/,
    ids: ["project-research", "project-tap", "project-reprod"],
  },
  {
    pattern:
      /\b(agent|agents|agentic|orchestration|workflow|workflows|resume|recruit|cv)\b/,
    ids: ["project-gauntlet", "toolkit-2", "project-voice-agent"],
  },
  {
    pattern:
      /\b(reliability|failover|outage|replica|replicas|distributed|server goes down|scalability|grpc|kubernetes|k8s)\b/,
    ids: ["project-lookup", "project-lookup-1", "toolkit-3"],
  },
  {
    pattern:
      /\b(gpu|latency|throughput|serving|inference|vllm|performance|tokens per second)\b/,
    ids: ["project-serving", "project-lookup"],
  },
  {
    pattern: /\b(bookmarks|bookmark|saved|research library|resources|kiln)\b/,
    ids: ["project-kiln"],
  },
  {
    pattern:
      /\b(open source|upstream|pull request|pull requests|mcp|schema|token overhead|contributions|pr)\b/,
    ids: ["project-open-source", "project-open-source-0"],
  },
  {
    pattern:
      /\b(punjabi|shahmukhi|underrepresented|low resource|low-resource|nlp|natural language|multilingual)\b/,
    ids: ["project-shahmukhi", "experience-saudconsult"],
  },
  {
    pattern:
      /\b(vision|images|imagery|satellite|segmentation|detection|opencv|houses|buildings)\b/,
    ids: ["project-satellite", "project-mask-detection", "toolkit-1"],
  },
  {
    pattern: /\b(speech|voice|spoken|offline assistant|audio|transcription)\b/,
    ids: ["project-voice-agent"],
  },
  {
    pattern:
      /\b(teaching|teach|mentoring|students|ta|leadership|staff|course)\b/,
    ids: ["experience-cs320", "experience-cs220", "experience-cs331"],
  },
  {
    pattern:
      /\b(robotics|robot|drone|uav|aircraft|hardware|electronics|embedded|cad)\b/,
    ids: ["project-uav"],
  },
  {
    pattern:
      /\b(finance|fintech|blockchain|smart contract|clarity|stacks|payments)\b/,
    ids: ["experience-kasb", "toolkit-0"],
  },
  {
    pattern:
      /\b(frontend|front end|web|mobile|flutter|react|app development|application)\b/,
    ids: ["project-wumi", "toolkit-4", "experience-kasb"],
  },
];
const indexed = knowledge.documents.map((doc) => ({
  doc,
  title: normalize(doc.title),
  titleTerms: terms(doc.title).map(stem),
  keywords: terms(
    `${doc.keywords} ${doc.links.map((link) => link.label).join(" ")}`,
  ).map(stem),
  body: terms(doc.text).map(stem),
}));

function relevantProjectLinks(doc, tokens) {
  const external = doc.links.filter((link) => link.url.startsWith("https://"));
  if (!doc.type.startsWith("project") || external.length < 2) return doc.links;
  const keywords = terms(doc.keywords).map(stem);
  const meaningful = tokens.filter((term) => !GENERIC_EVIDENCE.has(term));
  // A broad request for the project keeps its source collection. An aspect
  // question prefers links supported by the matching passage or source label.
  if (meaningful.length && meaningful.every((term) => keywords.includes(term)))
    return doc.links;
  const body = terms(doc.text).map(stem);
  const generic = new Set([
    "read",
    "code",
    "source",
    "sources",
    "original",
    "view",
    "visit",
    "github",
    "pr",
  ]);
  const scores = external.map((link) => ({
    link,
    score: terms(link.label)
      .map(stem)
      .filter((term) => term.length > 2 && !generic.has(term))
      .reduce(
        (total, term) =>
          total + (tokens.includes(term) ? 5 : body.includes(term) ? 1 : 0),
        0,
      ),
  }));
  const maximum = Math.max(...scores.map((entry) => entry.score));
  if (!maximum) return doc.links;
  const keep = new Set(
    scores
      .filter((entry) => entry.score >= maximum * 0.65)
      .map((entry) => entry.link.url),
  );
  return doc.links.filter(
    (link) => !link.url.startsWith("https://") || keep.has(link.url),
  );
}

const GENERIC_EVIDENCE = new Set(
  "research work project projects software engineer engineering build built development experience domain field area skills skill expertise knowledge capable capability help good all more other explain tell discuss perform do"
    .split(" ")
    .map(stem),
);

function qualificationScope(query) {
  const q = normalize(query);
  const engineeringTask =
    /\b(software|data pipelines?|backend|frontend|dashboard|interface|app|application|programming|data engineering|data systems|model serving)\b/.test(
      q,
    );
  const qualificationClaim =
    /\b(licensed|licen[sc]e|board certified|qualification|qualified|credential|certified|certification|medical degree|law degree)\b/.test(
      q,
    );
  if (
    /\b(surger(?:y|ies)|surgeon|physician|medical doctor|medical licen[sc]e|clinical licen[sc]e|clinical practice|practice medicine|prescrib\w*|diagnose patients)\b/.test(
      q,
    ) &&
    (qualificationClaim || !engineeringTask)
  ) {
    return {
      kind: "unsupported-qualification",
      message:
        "The public record does not document a medical license or qualifications to practice medicine or perform surgery. Healthcare-software engineering is not evidence of clinical qualification.",
    };
  }
  if (
    /\b(lawyer|attorney|law licen[sc]e|legal practice|practice law|bar exam|legal advice)\b/.test(
      q,
    ) &&
    (qualificationClaim || !engineeringTask)
  ) {
    return {
      kind: "unsupported-qualification",
      message:
        "The public record does not document a qualification to practice law. Software work is not evidence of legal-practice credentials.",
    };
  }
  if (
    /\b(quantum physics|quantum mechanics|particle physics|astrophysics|cosmology)\b/.test(
      q,
    ) &&
    !engineeringTask
  ) {
    return {
      kind: "unsupported-qualification",
      message:
        "Quantum or fundamental-physics research is not part of the documented background. Software and language-model research do not establish expertise in that separate research field.",
    };
  }
  return null;
}

export function detectIntent(query) {
  const q = normalize(query);
  if (
    /\b(salary|compensation|visa|immigration|references|phone number|home address)\b/.test(
      q,
    )
  )
    return "contact";
  if (
    /\b(?:all|every|everything|entire|full|complete|list|other)\b/.test(q) &&
    /\b(?:projects?|portfolio|work|worked|built|builds)\b/.test(q)
  )
    return "catalog";
  if (
    /^(?:projects|portfolio|what have you built|what did you build|what have you worked on|show me your work|more projects)$/.test(
      q,
    )
  )
    return "catalog";
  if (/\b(?:certificates?|certifications?|credentials?)\b/.test(q))
    return "credentials";
  if (/\b(?:publications|published papers|research papers)\b/.test(q))
    return "publications";
  if (/\b(?:blogs?|writing|articles?|reading|wrote)\b/.test(q))
    return "writing";
  if (/\b(?:education|degree|gpa|where.*stud|masters|university)\b/.test(q))
    return "education";
  if (
    /\b(?:hire|hiring|job|jobs|career|employment|experience|qualified|candidate)\b/.test(
      q,
    )
  )
    return "experience";
  if (
    /^(?:hello|hi|hey|how are you|who are you|what is your name|introduce yourself|tell me about yourself|about you|about musa|who is musa)[\s\w]*$/.test(
      q,
    )
  )
    return "identity";
  return "question";
}

export function retrieve(messages) {
  const question = messages.at(-1).content;
  // A short follow-up can inherit the subject, but explicit new questions do not
  // get drowned out by an unrelated earlier conversation.
  const followUp =
    /\b(it|that|those|this|more|why|how|the project|the result)\b/.test(
      normalize(question),
    ) && terms(question).length <= 5;
  const previous =
    messages
      .slice(0, -1)
      .filter((m) => m.role === "user")
      .at(-1)?.content ?? "";
  const query = `${question}${followUp ? ` ${previous.slice(0, 700)}` : ""}`;
  const q = normalize(query);
  const tokens = [
    ...new Set(
      terms(query)
        .flatMap((term) => [term, ...(ALIASES[term] ?? [])])
        .map(stem),
    ),
  ].slice(0, 40);
  const intent = detectIntent(question);
  const allCollection =
    /\b(?:all|every|everything|entire|full|complete)\b/.test(
      normalize(question),
    );
  const specificTerms = tokens.filter((term) => !GENERIC_EVIDENCE.has(term));
  const noRelevantEvidence =
    intent === "question" &&
    specificTerms.length > 0 &&
    !TOPICS.some((topic) => topic.pattern.test(q)) &&
    !indexed.some((doc) =>
      specificTerms.some(
        (term) =>
          doc.titleTerms.includes(term) ||
          doc.keywords.includes(term) ||
          doc.body.includes(term),
      ),
    );
  const scope =
    qualificationScope(question) ??
    (noRelevantEvidence
      ? {
          kind: "not-documented",
          message:
            "This question has no relevant evidence in the public portfolio. Say that the topic or expertise is not covered; do not invent an unrelated engineering bridge or answer general trivia.",
        }
      : null);
  if (scope)
    return {
      question,
      query,
      intent,
      scope,
      selected: [],
      sources: [
        { label: "Public background and qualifications", url: "/about" },
      ],
    };
  const boosts = new Map();
  for (const topic of TOPICS)
    if (topic.pattern.test(q))
      topic.ids.forEach((id, i) =>
        boosts.set(id, Math.max(boosts.get(id) ?? 0, 19 - i * 2)),
      );
  const explicitProjects = new Set();
  for (const project of knowledge.projects) {
    if (
      (!["research", "serving", "open-source"].includes(project.id) &&
        ` ${q} `.includes(` ${normalize(project.id)} `)) ||
      q.includes(normalize(project.name))
    ) {
      explicitProjects.add(project.id);
      boosts.set(
        `project-${project.id}`,
        Math.max(boosts.get(`project-${project.id}`) ?? 0, 32),
      );
    }
  }
  const focusedProjects = explicitProjects.size
    ? explicitProjects
    : new Set(
        knowledge.projects
          .filter((project) => boosts.has(`project-${project.id}`))
          .map((project) => project.id),
      );
  const relatedArticles = new Set(
    knowledge.articles
      .filter((article) => focusedProjects.has(article.projectId))
      .map((article) => `article-${article.slug}`),
  );
  const focused = boosts.size > 0;
  function withinFocus(doc) {
    if (
      !focused ||
      [
        "catalog",
        "credentials",
        "publications",
        "education",
        "identity",
      ].includes(intent)
    )
      return true;
    if (
      focusedProjects.has(doc.parent.replace(/^project-/, "")) ||
      relatedArticles.has(doc.parent)
    )
      return true;
    if (
      !explicitProjects.size &&
      (boosts.has(doc.id) || boosts.has(doc.parent))
    )
      return true;
    return (
      doc.type === "experience" &&
      doc.links.some((link) =>
        [...focusedProjects].some((id) => link.url === `/work/${id}`),
      )
    );
  }
  const scored = indexed
    .filter(({ doc }) => withinFocus(doc))
    .filter(
      ({ doc }) =>
        !allCollection ||
        !["credentials", "writing"].includes(intent) ||
        doc.type === (intent === "writing" ? "article" : "credential"),
    )
    .map(({ doc, title, titleTerms, keywords, body }) => {
      let score = boosts.get(doc.id) ?? (boosts.get(doc.parent) ?? 0) * 0.55;
      for (const term of tokens)
        score +=
          (titleTerms.includes(term)
            ? 5
            : keywords.includes(term)
              ? 2.5
              : body.includes(term)
                ? 1
                : 0) + (body.includes(term) && keywords.includes(term) ? 1 : 0);
      if (q.includes(title) || (title.length >= 4 && title.includes(q)))
        score += 22;
      if (intent === "credentials" && doc.type === "credential") score += 30;
      if (intent === "publications" && doc.type === "publication") score += 30;
      if (intent === "writing" && doc.type === "article") score += 20;
      if (intent === "catalog" && doc.type === "project") score += 100;
      if (intent === "education" && doc.type === "education") score += 30;
      if (intent === "experience" && doc.type === "experience")
        score +=
          12 +
          Math.max(
            0,
            knowledge.experience.length -
              knowledge.experience.findIndex(
                (entry) => doc.id === `experience-${entry.id}`,
              ),
          );
      if (intent === "identity" && doc.id === "about") score += 40;
      return { ...doc, score };
    })
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const selected = [],
    counts = new Map();
  const limit = intent === "credentials" ? 9 : 7;
  const minimumScore = [
    "catalog",
    "credentials",
    "publications",
    "education",
    "identity",
    "experience",
    "writing",
  ].includes(intent)
    ? 0
    : Math.max(2, (scored[0]?.score ?? 0) * 0.35);
  for (const doc of scored) {
    if (doc.score < minimumScore) continue;
    if ((counts.get(doc.parent) ?? 0) >= 2) continue;
    selected.push({ ...doc, links: relevantProjectLinks(doc, tokens) });
    counts.set(doc.parent, (counts.get(doc.parent) ?? 0) + 1);
    if (selected.length >= limit) break;
  }
  if (!selected.length)
    selected.push(knowledge.documents.find((doc) => doc.id === "about"));
  const sourceCandidates =
    intent === "catalog"
      ? knowledge.projects.map((p) => ({ label: p.name, url: `/work/${p.id}` }))
      : allCollection && intent === "writing"
        ? selected.map((doc) => ({ label: doc.title, url: doc.url }))
        : allCollection && intent === "credentials"
          ? selected.map((doc) => ({ label: doc.title, url: doc.url }))
          : selected.flatMap((doc) =>
              doc.links.filter(
                (link) =>
                  doc.type !== "skills" ||
                  !focused ||
                  link.url === doc.url ||
                  [...focusedProjects].some((id) => link.url === `/work/${id}`),
              ),
            );
  const uniqueSources = new Map();
  for (const source of sourceCandidates)
    if (!uniqueSources.has(source.url)) uniqueSources.set(source.url, source);
  const sources = [...uniqueSources.values()].slice(
    0,
    intent === "catalog" ? 20 : 10,
  );
  return { question, query, intent, allCollection, selected, sources };
}

const url = (label, href) => `[${label.replace(/[\[\]]/g, "")}](${href})`;
export function portfolioAnswer(retrieval) {
  const { intent, selected } = retrieval;
  if (retrieval.scope) {
    const explanation =
      retrieval.scope.kind === "not-documented"
        ? "That topic is not covered by Musa's public portfolio, so I can't support a claim of expertise in it. MusA.I is a guide to his work rather than a general trivia assistant."
        : retrieval.scope.message;
    return `${explanation}\n\nYou can review ${url("his documented background and qualifications", "/about")} or ${url("ask Musa directly", knowledge.links.email)}.`;
  }
  if (intent === "contact")
    return `For personal arrangements, compensation or references, the useful next step is a conversation with Musa: ${url("email him", knowledge.links.email)} or ${url("connect on LinkedIn", knowledge.links.linkedin)}.`;
  if (intent === "identity")
    return `I'm MusA.I, Muhammad Musa's AI portfolio guide. Musa is a computer science master's student at UW–Madison, working on language-model security, healthcare software and useful systems.\n\nYou can explore ${url("his full project catalog", "/work")}, ${url("his experience and education", "/about")}, or ${url("technical notes from the work", "/writing")}.`;
  if (intent === "catalog")
    return `Here is the full project catalog, including research, systems, products and earlier builds:\n\n${knowledge.projects.map((p) => `- ${url(p.name, `/work/${p.id}`)} — ${p.summary}`).join("\n")}\n\nThe ${url("playground", "/playground")} includes the live Kiln library, recorded measurements and clearly scoped product walkthroughs.`;
  const targetType = {
    credentials: "credential",
    publications: "publication",
    writing: "article",
    education: "education",
    experience: "experience",
  }[intent];
  const relevant = targetType
    ? selected.filter((doc) => doc.type === targetType)
    : selected;
  const chosen = (relevant.length ? relevant : selected).slice(
    0,
    intent === "credentials"
      ? 9
      : intent === "writing" && retrieval.allCollection
        ? knowledge.articles.length
        : 3,
  );
  const opening =
    {
      credentials:
        "These credentials are in the public portfolio, with original files or verification links:",
      publications: "These are the published research contributions:",
      writing:
        "These technical notes connect the work to the decisions behind it:",
      education: "Here is the documented education:",
      experience: "The experience most relevant to this question is:",
    }[intent] ?? "The closest documented work is:";
  const body = chosen
    .map((doc) => {
      const excerpt = doc.text
        .split("\n")
        .slice(0, doc.type === "project" ? 2 : 1)
        .join(" ");
      return `- ${url(doc.title, doc.url)} — ${excerpt}`;
    })
    .join("\n\n");
  return `${opening}\n\n${body}\n\n${url("Explore all work", "/work")} · ${url("Talk with Musa", knowledge.links.email)}`;
}
