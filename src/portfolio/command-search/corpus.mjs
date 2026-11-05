// Public data only. The build script validates both source modules before calling this.
const brief = (text, length = 190) =>
  text.length <= length
    ? text
    : `${text.slice(0, length).replace(/\s+\S*$/, "")}…`;
export function buildCorpus(
  { BIO, PROJECTS, ARTICLES },
  { EXPERIENCE, EDUCATION, TOOLKIT, CREDENTIALS, PUBLICATIONS },
) {
  const entries = [];
  const add = (entry) =>
    entries.push({
      ...entry,
      detail: brief(entry.detail),
      snippet: entry.snippet ?? entry.detail,
    });
  const pages = [
    [
      "home",
      "Home",
      "/",
      "Computer science. Human consequences.",
      "overview introduction selected work contact",
    ],
    [
      "all-work",
      "All work",
      "/work",
      "Explore my projects, their decisions, results and limits.",
      "projects portfolio builds software research",
    ],
    [
      "writing",
      "Writing",
      "/writing",
      "Technical notes from the things I built and tested.",
      "blogs articles essays reading notes",
    ],
    [
      "playground",
      "Playground",
      "/playground",
      "Explore Kaiju Cats, Kiln, recorded benchmarks, research results and product walkthroughs.",
      "interactive demos live projects experiments try",
    ],
    [
      "about",
      "About me",
      "/about",
      BIO.paragraphs[0],
      "Muhammad Musa biography background who are you how are you person hire hiring experience education resume",
    ],
  ];
  for (const [id, label, href, detail, keywords] of pages)
    add({
      id,
      label,
      href,
      detail,
      keywords,
      kind: "page",
      group: "Go somewhere",
      text: id === "about" ? BIO.paragraphs.join(" ") : detail,
    });
  const sections = [
    [
      "story",
      "My story",
      "/about#story",
      BIO.paragraphs.join(" "),
      "background biography Lahore Madison person interests",
    ],
    [
      "experience",
      "Experience",
      "/about#experience",
      EXPERIENCE.map((e) => `${e.role} at ${e.organization}`).join(". "),
      "hire hiring career employment internships leadership jobs",
    ],
    [
      "education",
      "Education",
      "/about#education",
      EDUCATION.map(
        (e) => `${e.degree} at ${e.school}. ${e.date}. ${e.result}`,
      ).join(". "),
      "university college studies degree GPA school masters graduate",
    ],
    [
      "toolkit",
      "Skills & toolkit",
      "/about#toolkit",
      TOOLKIT.map((g) => `${g.name}: ${g.tools.join(", ")}`).join(". "),
      "skills technologies programming languages frameworks stack tools abilities",
    ],
    [
      "certificates",
      "Certificates",
      "/about#certificates",
      "Original credentials in AI, programming, teaching, data and applications.",
      "certificates certifications credentials courses awards",
    ],
    [
      "publications",
      "Publications",
      "/about#publications",
      PUBLICATIONS.map((p) => `${p.title}. ${p.venue}`).join(". "),
      "published papers academic research DOI ACM IEEE",
    ],
    [
      "humanity",
      "What matters to me",
      "/about#humanity",
      BIO.paragraphs.slice(1).join(" "),
      "values person purpose teaching people humanity",
    ],
    [
      "contact",
      "Get in touch",
      "/#contact",
      "Start a conversation about the work.",
      "contact email reach hire hiring linkedin github",
    ],
  ];
  for (const [id, label, href, detail, keywords] of sections)
    add({
      id: `section-${id}`,
      label,
      href,
      detail,
      text: detail,
      keywords,
      kind: "section",
      group: "Sections",
    });
  for (const p of PROJECTS) {
    const parent = `project-${p.id}`;
    const base = {
      parent,
      group: "Projects",
      keywords: `${p.name} ${p.category} ${p.technologies.join(" ")}${p.id === "kaiju-cats" ? " kaijugo kaijucats roblox game screenshot planner" : ""}`,
      kind: "section",
    };
    add({
      ...base,
      id: parent,
      kind: "project",
      label: p.name,
      detail: p.summary,
      href: `/work/${p.id}#project-overview`,
      text: `${p.category}. ${p.headline} ${p.summary} ${p.role} ${p.technologies.join(", ")}`,
    });
    add({
      ...base,
      id: `${parent}-outcome`,
      label: `${p.name} · outcome & role`,
      detail: p.outcome,
      href: `/work/${p.id}#project-outcome`,
      text: `${p.role} ${p.outcome} ${p.status}`,
    });
    p.sections.forEach((s, index) =>
      add({
        ...base,
        id: `${parent}-section-${index}`,
        label: `${p.name} · ${s.title}`,
        detail: s.body,
        href: `/work/${p.id}#section-${index}`,
        text: `${s.title}. ${s.body}`,
      }),
    );
    if (
      ["kaiju-cats", "kiln", "lookup", "serving", "research", "wumi"].includes(
        p.id,
      )
    )
      add({
        ...base,
        id: `${parent}-playground`,
        label: `Explore ${p.name}`,
        detail: `${p.summary} ${p.status}`,
        href: `/playground?build=${p.id}`,
        keywords: `${base.keywords} interactive playground demo try`,
        text: `${p.summary} ${p.status}`,
      });
  }
  for (const a of ARTICLES) {
    const parent = `article-${a.slug}`;
    const base = {
      parent,
      group: "Writing",
      keywords: `${a.title} ${a.topics.join(" ")} blog article writing`,
      kind: "section",
    };
    add({
      ...base,
      id: parent,
      kind: "article",
      label: a.title,
      detail: a.dek,
      href: `/writing/${a.slug}`,
      text: a.dek,
    });
    a.sections.forEach((s, index) =>
      add({
        ...base,
        id: `${parent}-section-${index}`,
        label: `${a.title} · ${s.heading}`,
        detail: s.paragraphs.join(" "),
        href: `/writing/${a.slug}#section-${index}`,
        text: `${s.heading}. ${s.paragraphs.join(" ")}`,
      }),
    );
    add({
      ...base,
      id: `${parent}-sources`,
      label: `${a.title} · sources`,
      detail: a.references.map((r) => r.label).join(". "),
      href: `/writing/${a.slug}#sources`,
      text: a.references.map((r) => r.label).join(". "),
      keywords: `${base.keywords} references sources further reading`,
    });
  }
  for (const e of EXPERIENCE)
    add({
      id: `experience-${e.id}`,
      label: `${e.role} · ${e.organization}`,
      detail: e.summary,
      href: `/about#experience-${e.id}`,
      group: "Experience",
      kind: "experience",
      keywords: `${e.organization} ${e.role} ${e.location} ${e.date} career employment`,
      text: `${e.summary} ${e.details.join(" ")}`,
    });
  EDUCATION.forEach((e, index) =>
    add({
      id: `education-${index}`,
      label: `${e.degree} · ${e.school}`,
      detail: `${e.date}. ${e.result}`,
      href: `/about#education-${index}`,
      group: "Experience",
      kind: "education",
      keywords: `education degree university ${e.school} ${e.courses.join(" ")}`,
      text: `${e.detail} ${e.result} ${e.courses.join(", ")}`,
    }),
  );
  TOOLKIT.forEach((g, index) => {
    add({
      id: `toolkit-${index}`,
      label: g.name,
      detail: `${g.why} ${g.tools.join(", ")}`,
      href: `/about#toolkit-${index}`,
      group: "Skills",
      kind: "skill",
      parent: `toolkit-${index}`,
      keywords: `${g.tags} ${g.tools.join(" ")}`,
      text: `${g.name}. ${g.why} ${g.tools.join(", ")}. Related work: ${g.project}.`,
    });
    g.tools.forEach((skill, skillIndex) =>
      add({
        id: `skill-${index}-${skillIndex}`,
        label: skill,
        detail: `${g.name} · ${g.why} Related work: ${g.project}.`,
        href: `/about#toolkit-${index}`,
        group: "Skills",
        kind: "skill",
        parent: `toolkit-${index}`,
        keywords: `${skill} ${g.tags} ${g.name}`,
        text: `${skill}. ${g.name}. ${g.why} Related work: ${g.project}.`,
      }),
    );
  });
  for (const c of CREDENTIALS)
    add({
      id: `credential-${c.id}`,
      label: c.name,
      detail: `${c.issuer} · ${c.issued}. ${c.summary}`,
      href: `/about#credential-${c.id}`,
      group: "Credentials",
      kind: "credential",
      keywords: `${c.issuer} ${c.group} ${c.tags} certificate credential`,
      text: c.summary,
    });
  PUBLICATIONS.forEach((p, index) =>
    add({
      id: `publication-${index}`,
      label: p.title,
      detail: `${p.venue} · ${p.format}. ${p.role}. ${p.detail}`,
      href: `/about#publication-${index}`,
      group: "Writing",
      kind: "publication",
      keywords: `${p.title} ${p.venue} published research paper publication`,
      text: `${p.format}. ${p.role}. ${p.detail}`,
    }),
  );
  const ids = new Set();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`Duplicate search ID: ${entry.id}`);
    if (
      !/^\/(?:$|#|work(?:[/?#]|$)|writing(?:[/?#]|$)|about(?:[/?#]|$)|playground(?:[?#]|$))/.test(
        entry.href,
      )
    )
      throw new Error(`Nonpublic search destination: ${entry.href}`);
    ids.add(entry.id);
  }
  return entries;
}

// MiniLM was trained on short sentences. Long article sections are represented by
// overlapping passages; their strongest passage retrieves the same stable anchor.
export function embeddingPassages(entries) {
  return entries.flatMap((entry) => {
    const words = `${entry.text ?? entry.snippet ?? entry.detail}`.split(/\s+/);
    const passages = [];
    for (let offset = 0; offset < words.length; offset += 100) {
      passages.push({
        id: entry.id,
        text: `${entry.label}. ${words.slice(offset, offset + 130).join(" ")}`,
      });
      if (offset + 130 >= words.length) break;
    }
    return passages;
  });
}
