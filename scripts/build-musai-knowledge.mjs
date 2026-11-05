import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadContent, loadProfile } from "./prerender-portfolio.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = resolve(ROOT, "server/musai/knowledge.generated.mjs");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const link = (label, url) => ({ label, url });

export async function buildKnowledge({ check = false } = {}) {
  const content = await loadContent(resolve(ROOT, "src/portfolio/content.ts"));
  const profile = await loadProfile(
    resolve(ROOT, "src/portfolio/profile-details.ts"),
  );
  const documents = [];
  const add = (
    id,
    title,
    type,
    url,
    text,
    keywords = "",
    links = [],
    parent = id,
  ) =>
    documents.push({
      id,
      title,
      type,
      url,
      text,
      keywords,
      links: [link(title, url), ...links],
      parent,
    });
  add(
    "about",
    "About Muhammad Musa",
    "profile",
    "/about",
    content.BIO.paragraphs.join("\n"),
    "biography background identity introduction person Lahore Madison humanity",
  );
  for (const p of content.PROJECTS) {
    const links = p.links.map((l) => link(l.label, l.url));
    const keywords = `${p.id} ${p.name} ${p.category} ${p.technologies.join(" ")}`;
    add(
      `project-${p.id}`,
      p.name,
      "project",
      `/work/${p.id}`,
      `${p.summary}\nRole: ${p.role}\nOutcome: ${p.outcome}\nStatus: ${p.status}\nTechnologies: ${p.technologies.join(", ")}.`,
      keywords,
      links,
    );
    p.sections.forEach((s, index) =>
      add(
        `project-${p.id}-${index}`,
        `${p.name}: ${s.title}`,
        "project-section",
        `/work/${p.id}#section-${index}`,
        `${s.body}\nProject status: ${p.status}`,
        keywords,
        links,
        `project-${p.id}`,
      ),
    );
  }
  for (const a of content.ARTICLES) {
    const links = a.references.map((r) => link(r.label, r.url));
    add(
      `article-${a.slug}`,
      a.title,
      "article",
      `/writing/${a.slug}`,
      a.dek,
      `${a.topics.join(" ")} ${a.projectId} writing blogs`,
      links,
    );
    a.sections.forEach((s, index) =>
      add(
        `article-${a.slug}-${index}`,
        `${a.title}: ${s.heading}`,
        "article-section",
        `/writing/${a.slug}#section-${index}`,
        s.paragraphs.join("\n"),
        `${a.topics.join(" ")} ${a.projectId}`,
        links,
        `article-${a.slug}`,
      ),
    );
  }
  for (const e of profile.EXPERIENCE)
    add(
      `experience-${e.id}`,
      `${e.role} at ${e.organization}`,
      "experience",
      `/about#experience-${e.id}`,
      `${e.date}. ${e.location}. ${e.summary}\n${e.details.join("\n")}`,
      `${e.organization} ${e.role} career jobs employment leadership teaching`,
      e.href ? [link(e.link ?? "Related work", e.href)] : [],
    );
  profile.EDUCATION.forEach((e, i) =>
    add(
      `education-${i}`,
      `${e.degree}, ${e.school}`,
      "education",
      `/about#education-${i}`,
      `${e.date}. ${e.detail} ${e.result}. Coursework: ${e.courses.join(", ")}.`,
      "education degree university GPA masters graduate LUMS Wisconsin Madison",
    ),
  );
  profile.TOOLKIT.forEach((g, i) =>
    add(
      `toolkit-${i}`,
      g.name,
      "skills",
      `/about#toolkit-${i}`,
      `${g.why} Tools: ${g.tools.join(", ")}. Related work: ${g.project}.`,
      `${g.tags} ${g.tools.join(" ")}`,
      [link(g.project, g.href)],
    ),
  );
  for (const c of profile.CREDENTIALS)
    add(
      `credential-${c.id}`,
      c.name,
      "credential",
      `/about#credential-${c.id}`,
      `${c.issuer}; ${c.issued}. ${c.summary}`,
      `${c.tags} ${c.group} certificate credential`,
      [
        link("View the original credential", c.file),
        ...(c.verify ? [link("Verify with the issuer", c.verify)] : []),
      ],
    );
  profile.PUBLICATIONS.forEach((p, i) =>
    add(
      `publication-${i}`,
      p.title,
      "publication",
      `/about#publication-${i}`,
      `${p.venue}. ${p.format}. ${p.role}. ${p.detail}`,
      `${p.title} publications academic published paper research`,
      [
        link(`${p.venue} publication`, p.href),
        ...(p.project ? [link("Related project notes", p.project)] : []),
      ],
    ),
  );
  const data = {
    version: 1,
    sourceHash: hash(JSON.stringify({ content, profile })),
    biography: content.BIO.paragraphs,
    numbers: profile.PROFILE_NUMBERS,
    experience: profile.EXPERIENCE,
    education: profile.EDUCATION,
    links: { ...profile.PROFILE_LINKS, email: "mailto:mmusa2@wisc.edu" },
    projects: content.PROJECTS.map(({ sections, ...p }) => p),
    articles: content.ARTICLES.map(({ sections, ...a }) => a),
    documents,
  };
  const serialized = `// Generated only from the curated public content and profile. Do not edit.\nexport default ${JSON.stringify(data)};\n`;
  if (check) {
    const existing = await readFile(OUTPUT, "utf8");
    if (existing !== serialized)
      throw new Error(
        "MusA.I public knowledge is stale. Run node scripts/build-musai-knowledge.mjs",
      );
    console.log(
      `MusA.I knowledge current: ${data.projects.length} projects, ${data.articles.length} articles, ${documents.length} source passages.`,
    );
  } else {
    await mkdir(dirname(OUTPUT), { recursive: true });
    await writeFile(OUTPUT, serialized);
    console.log(
      `Generated ${Buffer.byteLength(serialized)} public knowledge bytes; ${documents.length} source passages.`,
    );
  }
  return data;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await buildKnowledge({ check: process.argv.includes("--check") });
