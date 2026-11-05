export type PortfolioProject = {
  id: string;
  name: string;
  category: string;
  headline: string;
  summary: string;
  role: string;
  outcome: string;
  status: string;
  featured: boolean;
  technologies: string[];
  sections: { title: string; body: string }[];
  links: { label: string; url: string }[];
  demo?: "consent" | "defense" | "provenance";
};

export type Article = {
  slug: string;
  title: string;
  dek: string;
  topics: string[];
  projectId: string;
  minutes: number;
  sections: { heading: string; paragraphs: string[]; code?: string }[];
  references: { label: string; url: string }[];
};

export const BIO = {
  intro: "Computer science. Human consequences.",
  paragraphs: [
    "I’m Muhammad Musa, a computer science master’s student at UW–Madison. I work on language-model security, build healthcare software, and turn scattered ideas into useful systems.",
    "From Lahore to Madison, the question I return to is simple. Who will this help? Sometimes the answer is a product. Sometimes it’s a better experiment. Often, it starts with finding out why something broke.",
    "Teaching is part of that work, too. Explaining a system to someone else has a way of exposing the parts I don’t understand yet.",
  ],
};

export const PROJECTS: PortfolioProject[] = [
  {
    id: "wumi",
    name: "WUMI Health",
    category: "Healthcare software",
    headline: "Who gets to see a patient’s record?",
    summary:
      "I built a patient-owned health record that connects clinical work across facilities, with consent enforced where the data lives.",
    role: "I led engineering across the Flutter application and PostgreSQL backend, working with a clinical co-founder and three engineering interns.",
    outcome:
      "One longitudinal record, with patient, clinician, laboratory and pharmacy workflows built around it.",
    status:
      "Product in development. Core clinical workflows are implemented; scheduling is in progress. The portfolio interaction uses synthetic information.",
    featured: true,
    technologies: [
      "Flutter",
      "Dart",
      "PostgreSQL",
      "Supabase",
      "FHIR R4",
      "Row-level security",
    ],
    demo: "consent",
    sections: [
      {
        title: "The problem",
        body: "A patient’s history can be scattered across clinics, paper reports and separate systems. I wanted the record to follow the patient without making every person at every facility equally powerful.",
      },
      {
        title: "The decision that shaped the system",
        body: "I separated the interface’s permissions from the database’s authority. Roles, individual overrides, facility scope and patient consent are checked at the data boundary. A hidden button is useful guidance; it cannot be the security mechanism.",
      },
      {
        title: "Making access visible",
        body: "Cross-patient reads go through audited database functions. The patient can see an access history, grant or revoke sharing, and protect selected records. A QR health card carries an opaque identifier rather than medical information.",
      },
      {
        title: "What is built",
        body: "The implementation connects identity, patient timelines, clinical encounters, diagnostic orders, laboratory reports and pharmacy dispensing. I also built code-catalog validation and private file access. These are engineering controls, not a claim of clinical certification or complete medical-reference coverage.",
      },
      {
        title: "What I would keep improving",
        body: "The next delivery work includes scheduling and the surrounding operational workflows. AI summaries and external credential-dependent integrations are separate planned capabilities; I do not present them as live features.",
      },
    ],
    links: [{ label: "Visit website", url: "https://wumihealth.com/" }],
  },
  {
    id: "research",
    name: "RAG attack & defense",
    category: "Language-model security",
    headline: "What does a defense cost?",
    summary:
      "I tested how poisoned source material changes a model’s answers, then measured what the defenses broke along the way.",
    role: "I co-authored this two-person study and led the advanced attacks, fused defense, ablations and evaluation. Waleed Arshad built the initial pipeline scaffold and early attack modules.",
    outcome:
      "A defense that reduced measured attack success also removed useful evidence. Reporting both changed the conclusion.",
    status:
      "Scoped research study at UW–Madison with public code and recorded results. The defense is not deployment-ready.",
    featured: true,
    technologies: [
      "Python",
      "PyTorch",
      "ChromaDB",
      "Transformers",
      "scikit-learn",
      "Ollama",
    ],
    demo: "defense",
    sections: [
      {
        title: "The threat model",
        body: "The attacker could add passages to the retrieved corpus, but could not edit the user’s question or the system prompt. I studied the point where useful retrieved text becomes an instruction the generator should never have followed.",
      },
      {
        title: "What I built",
        body: "I developed obfuscated, semantic, fragmented and defense-aware attacks, a classifier-based fused defense, and an evaluation pipeline that preserves the retrieved evidence and generated answers. The classifier combines several signals; one proposed signal contributed almost no learned weight, which matters when describing the final mechanism.",
      },
      {
        title: "The result worth keeping",
        body: "In the paired T2 ablation on llama3.2:3b, attack success was 12% without a defense, 38% with a prompt-only defense and 0% with the fused defense, across 50 attack-paired queries. Those are results for that experiment, not a universal ranking of defenses.",
      },
      {
        title: "The cost behind zero",
        body: "On 50 clean queries, the fixed-threshold fused defense removed at least one retrieved chunk for 76% of queries. A later analysis separated the denominators: 31% of retrieved chunks were removed, 32% of queries combined removal with a degraded answer, and 34% were judged to have worse answers. Those metrics describe different effects; they are not interchangeable.",
      },
      {
        title: "The limits",
        body: "The corpus, model choices and attack families constrain the result. An attack that never retrieves its required fragments has not proved a defense strong. A model judge also has its own biases. I kept those limitations beside the scores rather than treating them as footnotes.",
      },
    ],
    links: [
      {
        label: "Read the research code",
        url: "https://github.com/muhammad-musa-ml/IPI-763",
      },
      {
        label: "Read the utility analysis",
        url: "https://github.com/muhammad-musa-ml/IPI-763/blob/main/docs/phase5_honest_fpr.md",
      },
    ],
  },
  {
    id: "gauntlet",
    name: "Resume Gauntlet",
    category: "Agent systems",
    headline: "Can the claim survive a second opinion?",
    summary:
      "I built a writing workflow that traces claims to evidence, then hands the draft to independent reviewers with permission to reject it.",
    role: "I designed and built the plugin, data model, review orchestration, document checks and guarded workflows.",
    outcome:
      "Eight review perspectives examine the rendered document; unsupported claims and failed checks block completion.",
    status:
      "Working personal tool with Claude Code and Codex adapters. The source repository is private.",
    featured: true,
    technologies: [
      "Python",
      "Multi-agent orchestration",
      "Claude Code",
      "Codex",
      "LaTeX",
      "pytest",
    ],
    sections: [
      {
        title: "The problem",
        body: "A fluent sentence can make a weak claim sound convincing. I wanted a system that keeps the original evidence close enough to challenge the wording, including the numbers, scope and ownership of the work.",
      },
      {
        title: "Separate writing from judging",
        body: "The workflow separates the writer from the verifier model family. Reviewers inspect a fixed artifact and report findings instead of silently editing the document they judge. The system checks whether the expected reviewers actually returned.",
      },
      {
        title: "The artifact is part of the answer",
        body: "A good source document can still become a broken PDF. I added checks against the rendered output, including parsing, layout and exact-artifact receipts. Reusing an old verdict after changing the page is not an acceptable shortcut.",
      },
      {
        title: "Facts outlive a draft",
        body: "Raw portfolio facts and their provenance live outside the plugin repository. A guarded correction path updates evidence without discarding unrelated facts. Published examples use synthetic identities, and sensitive actions remain separate from drafting.",
      },
    ],
    links: [],
  },
  {
    id: "kiln",
    name: "Kiln",
    category: "Knowledge systems",
    headline: "Can an idea survive its bookmark?",
    summary:
      "I built a research library that turns saved material into practical guides while keeping the path back to every source.",
    role: "I built the ingestion, research, topic organization, publishing workflow and shared local/public website.",
    outcome:
      "Sources become useful guides, with citations, files and a publication process that verifies the actual live result.",
    status:
      "Live personal project. The public library is a curated static snapshot; private intake and write operations stay local.",
    featured: true,
    technologies: [
      "Python",
      "SQLite",
      "Full-text search",
      "JavaScript",
      "Content hashing",
      "Vercel",
    ],
    demo: "provenance",
    sections: [
      {
        title: "From saved to useful",
        body: "Keeping a link is easy. Remembering what it was useful for is harder. Kiln takes a source dossier, checks the practical claims against current evidence, and produces a guide that can hold instructions, prompts, files and project ideas together.",
      },
      {
        title: "Keep the trail",
        body: "I retain original source URLs and immutable input revisions. Related sources can become one topic, but merging is reversible and earlier links still resolve. Similar tags alone are not enough reason to collapse two different ideas.",
      },
      {
        title: "Research is not implementation",
        body: "A completed guide does not mean I built every project it suggests. Kiln tracks the owner’s progress separately and keeps project builds behind a separate queue decision. This makes the library a more honest record of work.",
      },
      {
        title: "Publishing with a boundary",
        body: "The public export includes only allowed fields and artifacts. Private notes, credentials and machine paths stay out. After deployment, the release workflow compares the live files with the exported hashes before calling the publication complete.",
      },
    ],
    links: [
      { label: "Visit website", url: "https://kiln-by-m.vercel.app/" },
      {
        label: "Read the code",
        url: "https://github.com/muhammad-musa-ml/kiln",
      },
    ],
  },
  {
    id: "open-source",
    name: "Small fixes, real boundaries",
    category: "Open-source contributions",
    headline: "Make the contract match the behavior.",
    summary:
      "I trace small failures in shared tools back to their boundary: an oversized schema, a lingering environment flag, or metadata that never reaches its consumer.",
    role: "I authored scoped patches and regression tests in forks, then opened upstream pull requests with the reproduction, measured result and remaining limits.",
    outcome:
      "In a Notion MCP patch, the measured tools/list response fell from 76,259 to 23,749 bytes while retaining referenced definitions.",
    status:
      "Submitted upstream pull requests, open at the November 4, 2026 review. These are proposed fixes, not claims of merged releases.",
    featured: false,
    technologies: [
      "TypeScript",
      "Python",
      "JSON Schema",
      "MCP",
      "Vitest",
      "pytest",
    ],
    sections: [
      {
        title: "A smaller tool contract",
        body: "The Notion MCP converter attached every component definition to every tool. I changed it to retain only definitions reachable from that tool’s input parameters, following nested references and cycles. The measurement is response bytes, not tokens or a measured model-speed improvement.",
      },
      {
        title: "Restore the state you borrowed",
        body: "In Palantir’s OAuth client, a temporary environment variable stayed enabled after a token exchange when it had originally been absent. My patch removes it in that case and preserves a prior value. The process-global concurrency limitation remains; I did not claim to solve it.",
      },
      {
        title: "A useful review starts with limits",
        body: "Each PR records what the tests cover and what I did not run. A passing local regression demonstrates the patch’s intended behavior; it does not substitute for the maintainer’s review, every supported platform or a real client integration.",
      },
    ],
    links: [
      {
        label: "Notion MCP schema pruning · PR #377",
        url: "https://github.com/makenotion/notion-mcp-server/pull/377",
      },
      {
        label: "OAuth environment cleanup · PR #21",
        url: "https://github.com/palantir/palantir-oauth-client/pull/21",
      },
      {
        label: "TypeORM view metadata · PR #13037",
        url: "https://github.com/typeorm/typeorm/pull/13037",
      },
    ],
  },
  {
    id: "shahmukhi",
    name: "Shahmukhi Punjabi NLP",
    category: "Language equity",
    headline: "Start with the language the tools overlook.",
    summary:
      "I fine-tuned a multilingual transformer and used uncertainty sampling to study topic classification with limited labeled data.",
    role: "In a two-person project, I owned model fine-tuning and active learning. Waleed Arshad owned data collection, augmentation and dataset creation.",
    outcome:
      "An experiment in where to spend a limited annotation budget, with explicit comparisons between data conditions.",
    status:
      "Completed academic research project. Results depend on the corpus, augmentation and script conditions.",
    featured: false,
    technologies: ["PyTorch", "XLM-RoBERTa", "Hugging Face", "Active learning"],
    sections: [
      {
        title: "My part",
        body: "I worked on the model and the labeling strategy for a four-topic classification task in Shahmukhi Punjabi. The team contributed a labeled dataset and a larger transliterated corpus; I do not claim the dataset work as mine alone.",
      },
      {
        title: "What the headline leaves out",
        body: "The full augmented pipeline reached 92.9% accuracy. A controlled comparison under different script conditions produced substantially different results. I keep the experimental setup attached to the number rather than treating it as the accuracy of an entire language.",
      },
      {
        title: "The useful question",
        body: "Active learning asks which examples are worth labeling next. I used maximum-entropy uncertainty sampling to concentrate the annotation effort on examples the model found difficult.",
      },
    ],
    links: [],
  },
  {
    id: "reprod",
    name: "REPROD",
    category: "Published security research",
    headline: "Make the evidence reproducible.",
    summary:
      "I co-authored work on ransomware execution provenance, helping turn sandbox observations into reusable research evidence.",
    role: "I was a co-author in the LUMS and SRI International collaboration published at ACM CSET 2023.",
    outcome:
      "An open dataset and collection pipeline for reproducible ransomware analysis.",
    status:
      "Published team research. The repository documents the collection pipeline; the dataset is available separately.",
    featured: false,
    technologies: [
      "Python",
      "SPADE",
      "Process Monitor",
      "Provenance graphs",
      "VirtualBox",
    ],
    sections: [
      {
        title: "Why provenance",
        body: "A process log records events. A provenance graph helps connect the processes, files and dependencies behind them. The research used those relationships to make ransomware behavior more inspectable and experiments more reproducible.",
      },
      {
        title: "The team’s contribution",
        body: "The project released sandboxed execution logs, inferred provenance graphs and orchestration code. I present this as a collaborative publication, not a system I built alone.",
      },
      {
        title: "A restrained conclusion",
        body: "The paper’s pilot evaluated signatures across a defined set of ransomware families and benign traces. That supports a scoped research result, not a claim that the technique detects all ransomware.",
      },
    ],
    links: [
      {
        label: "Read the paper",
        url: "https://doi.org/10.1145/3607505.3607510",
      },
      {
        label: "Browse the dataset",
        url: "https://doi.org/10.5281/zenodo.8123115",
      },
      {
        label: "Read the code",
        url: "https://github.com/muhammad-musa-ml/reprod",
      },
    ],
  },
  {
    id: "serving",
    name: "Small-GPU serving bench",
    category: "ML systems",
    headline: "Measure the queue, not just the tokens.",
    summary:
      "I served an open-weight language model on a 6 GB laptop GPU and measured the tradeoffs between precision, throughput, latency and answer quality.",
    role: "I built the load harness, evaluation runner and observability stack, and recorded the experiments.",
    outcome:
      "A repeatable comparison of FP16, AWQ and GPTQ serving, with raw results and hardware scope attached.",
    status:
      "Reproducible personal benchmark on one laptop. The quantized weights come from the model publisher; I did not quantize them myself.",
    featured: false,
    technologies: ["Python", "vLLM", "Docker", "Prometheus", "Grafana"],
    sections: [
      {
        title: "The setup",
        body: "I compared three precision variants of Qwen2.5-1.5B-Instruct using synthetic load prompts and a separate quality set. Model revisions were pinned, and the repository records the tested hardware and measurement conditions.",
      },
      {
        title: "Two different load questions",
        body: "Closed-loop workers show how throughput changes with concurrency. Open-loop arrivals expose what happens when requests arrive faster than the service can handle them. A server can produce more tokens and still make a person wait longer for the first one.",
      },
      {
        title: "The tradeoff",
        body: "The lower-precision arms used less weight memory and delivered more output tokens per second in this setup. Quality changed too, so I report it alongside latency instead of describing compression as a free improvement.",
      },
    ],
    links: [
      {
        label: "Read the measurements",
        url: "https://github.com/muhammad-musa-ml/vllm-serving-bench",
      },
    ],
  },
  {
    id: "lookup",
    name: "Replicated lookup service",
    category: "Distributed systems",
    headline: "A failed replica should not end the request.",
    summary:
      "I rebuilt a property lookup service with a cache tier, replicated storage, bounded failover and three implementations of the same contract.",
    role: "I extended the course exercise into a standalone repository with Python, Java and Go servers, conformance checks, failure injection and deployment tooling.",
    outcome:
      "One API contract, replayed across three implementations, with recorded behavior when a replica dies or stops answering.",
    status:
      "Working personal systems project with public code and reproducible scripts. It is not a claimed production service.",
    featured: false,
    technologies: ["Python", "Go", "Java", "gRPC", "Docker", "Kubernetes"],
    sections: [
      {
        title: "Keep the contract",
        body: "I implemented the dataset tier in three languages and built a conformance tool that replays keys against each. I also preserved an older protobuf contract to check compatibility in both directions.",
      },
      {
        title: "Failover has a budget",
        body: "The HTTP tier rotates between replicas, caches successful lookups and retries safe reads when a replica is unavailable or exceeds its deadline. It does not blindly replay arbitrary operations. Errors are not cached.",
      },
      {
        title: "Make failure observable",
        body: "Health checks, metrics and failure-injection scripts make it possible to see which replica answered and which failed first. The useful demonstration is a request completing through the remaining replica, followed by recovery.",
      },
    ],
    links: [
      {
        label: "Read the code and experiments",
        url: "https://github.com/muhammad-musa-ml/replicated-lookup-service",
      },
    ],
  },
  {
    id: "tap",
    name: "TAP red-teaming experiments",
    category: "Language-model security",
    headline: "The evaluator changes the experiment.",
    summary:
      "I extended an existing red-teaming workflow and explored how the search and evaluator affected its results.",
    role: "I ran experiments, proposed a multi-evaluator extension, and presented the work in a UW–Madison course project.",
    outcome:
      "Exploratory runs and a proposal for evaluating different aspects of an attack separately.",
    status:
      "Course research using a fork of TAP/PAIR. Results were weak or inconclusive; this is not a measured safety-breakthrough claim.",
    featured: false,
    technologies: [
      "Python",
      "TAP / PAIR",
      "Tree search",
      "GPT APIs",
      "Weights & Biases",
    ],
    sections: [
      {
        title: "What I changed",
        body: "I varied the search depth, width and branching in an existing Tree-of-Attacks-with-Pruning workflow and examined a multi-evaluator design. The framework was upstream work; my contribution was the experimentation and proposed extension.",
      },
      {
        title: "What the result taught me",
        body: "Evaluator capability and cost constrained the experiment. I keep the weak results visible because they change what the work supports: practical experience with model evaluation, rather than a universal jailbreak success rate.",
      },
    ],
    links: [],
  },
  {
    id: "voice-agent",
    name: "Voice Agent",
    category: "Agent systems",
    headline: "Let the model speak. Keep control explicit.",
    summary:
      "I built a voice-workflow prototype that connects grounded research, verified pitches and a deterministic conversation controller.",
    role: "I designed and built the pipeline, data contracts, audio loop and state-machine boundaries.",
    outcome:
      "A working local simulation with business discovery, a writer/verifier loop, speech recognition and speech synthesis.",
    status:
      "Prototype. The documented version has not placed real phone calls. Discovery and voice components run locally; some writing and verification use cloud models.",
    featured: false,
    technologies: [
      "Python",
      "asyncio",
      "Pydantic",
      "SQLite",
      "faster-whisper",
      "Ollama",
      "Piper TTS",
    ],
    sections: [
      {
        title: "Separate language from control",
        body: "The language model supplies wording inside a defined state. Typed classifiers and a deterministic state machine decide which transition is allowed. The audio loop supports interrupted playback rather than assuming the other person waits.",
      },
      {
        title: "Carry evidence between stages",
        body: "Discovery produces a structured facts artifact. A writer and an independent verifier use that grounding before the voice stage receives the resulting pitch. The contracts make the provenance of a statement inspectable.",
      },
      {
        title: "The boundary of the prototype",
        body: "The microphone and speaker stand in for a call. Self-authored policy checks and an opt-out store are engineering controls, not legal certification, and a latency target is not a measured result.",
      },
    ],
    links: [],
  },
  {
    id: "satellite",
    name: "Satellite building footprints",
    category: "Computer vision",
    headline: "A model meets a different city.",
    summary:
      "I adapted a pretrained geospatial segmentation workflow to imagery of dense residential areas in Lahore.",
    role: "I worked with a teammate on the inference pipeline and geospatial deep-learning toolchain.",
    outcome:
      "Building-footprint masks from local satellite imagery, with qualitative inspection of where the model transferred and where it struggled.",
    status:
      "LUMS course project. Uses pretrained SpaceNet weights; no from-scratch training or quantitative IoU/F1 evaluation is claimed.",
    featured: false,
    technologies: [
      "PyTorch",
      "Solaris",
      "GDAL",
      "Docker",
      "VGG16 U-Net",
      "SpaceNet-7",
    ],
    sections: [
      {
        title: "Make inference work end to end",
        body: "I helped assemble the Solaris/GDAL environment, reconstruct pretrained weight files and connect resizing, data preparation and inference. The model required a consistent image size, so preprocessing was part of the result.",
      },
      {
        title: "Keep the evidence at its actual scale",
        body: "The output was assessed qualitatively. Dense residential layouts were the motivating case; close-up imagery exposed weaknesses. Training on local data and measuring overlap against labeled footprints remained future work.",
      },
    ],
    links: [],
  },
  {
    id: "extremism",
    name: "Social-media sentiment research",
    category: "Published research",
    headline: "Sentiment needs context.",
    summary:
      "I led an early study of social-media sentiment following the killing of Priyantha Kumara Diyawadana, presented as an ASONAM poster.",
    role: "I was first author, with Muhammad Usama and Momin Uppal.",
    outcome:
      "A published two-page poster with preliminary analysis and a proposed context-aware research direction.",
    status:
      "IEEE/ACM ASONAM 2022 poster. Sentiment analysis is not the same as a validated extremist-content classifier.",
    featured: false,
    technologies: [
      "Python",
      "Twint",
      "Sentiment analysis",
      "Data visualization",
    ],
    sections: [
      {
        title: "What I measured",
        body: "The study collected a case-specific set of tweets and examined polarity and subjectivity. The visual analysis supported preliminary observations about the sample, not automatic judgments about individual people.",
      },
      {
        title: "What remained a proposal",
        body: "The poster outlined the context a fuller framework would need: offline events, online channels and the meaning of different content types. Building and validating that framework was beyond the poster's delivered scope.",
      },
    ],
    links: [
      {
        label: "Read the poster",
        url: "https://doi.org/10.1109/ASONAM55673.2022.10068622",
      },
    ],
  },
  {
    id: "sentiment-robustness",
    name: "Adversarial sentiment classification",
    category: "Machine-learning robustness",
    headline: "How much can a few words change?",
    summary:
      "I trained a sentiment classifier and tested its sensitivity to small, constrained token substitutions.",
    role: "I built the classifier baseline and implemented a HotFlip-style adversarial attack.",
    outcome:
      "A comparison between ordinary test predictions and predictions after a small number of token substitutions.",
    status:
      "LUMS course project from 2023. The result concerns the trained classifier and its experimental setup, not all sentiment models.",
    featured: false,
    technologies: [
      "Python",
      "PyTorch",
      "CNN",
      "LSTM",
      "GloVe",
      "HotFlip-style attacks",
    ],
    sections: [
      {
        title: "Establish the baseline",
        body: "I trained a CNN/LSTM sentiment model over normalized movie reviews. The baseline provided a reference for separating the effect of the attack from ordinary classification errors.",
      },
      {
        title: "Constrain the perturbation",
        body: "The attack searched nearby candidates in GloVe embedding space while limiting the number of substitutions. That made it possible to inspect how a small textual change altered the classifier's decision.",
      },
    ],
    links: [],
  },
  {
    id: "mask-detection",
    name: "Multi-camera detection & stitching",
    category: "Computer vision",
    headline: "Three cameras. One shared plane.",
    summary:
      "I worked on a mask/no-mask detector and projected detections from three camera views onto a common top-view plane.",
    role: "I built the course project with Suleman Mahmood.",
    outcome:
      "A YOLOv5s detector connected to a manually calibrated, three-camera homography prototype.",
    status:
      "LUMS computer-vision course project. Recorded detection scores used training images; they do not establish held-out accuracy. Tracking and duplicate removal were not implemented.",
    featured: false,
    technologies: [
      "Python",
      "YOLOv5s",
      "PyTorch",
      "OpenCV",
      "Homography",
      "ffmpeg",
    ],
    sections: [
      {
        title: "Connect detection to geometry",
        body: "We labeled video frames, trained a two-class detector and projected detection centroids into a shared floor plane. Four manually selected correspondences defined each camera's homography.",
      },
      {
        title: "The limits are part of the demonstration",
        body: "The cameras required manual calibration and the views used simple blending. The dataset was small and the recorded evaluation reused training images, so I present the pipeline and its limitations rather than a deployment-ready accuracy claim.",
      },
    ],
    links: [],
  },
  {
    id: "uav",
    name: "TEKNOFEST fixed-wing UAV",
    category: "Engineering & leadership",
    headline: "Make the parts work together.",
    summary:
      "I led the electronics and systems sub-team for a fixed-wing UAV competition entry.",
    role: "I was project head and led a seven-person electronics and systems sub-team.",
    outcome:
      "The team finished among the global top 20 in the TÜBİTAK TEKNOFEST International UAV Competition.",
    status:
      "Team competition project, March–July 2021. My documented scope was component selection, autopilot-software selection and circuit design.",
    featured: false,
    technologies: [
      "SolidWorks",
      "CAD",
      "Circuit design",
      "Electronics",
      "Systems integration",
    ],
    sections: [
      {
        title: "Own the interfaces",
        body: "I coordinated component decisions, autopilot-software selection and circuit design with the rest of the fixed-wing aircraft effort. The work depended on decisions made across the team, not on one isolated subsystem.",
      },
      {
        title: "What I carry forward",
        body: "The project gave me practice turning a competition brief into coordinated engineering responsibilities. I describe the documented electronics and design work without attributing unimplemented perception or autonomous-navigation features to it.",
      },
    ],
    links: [],
  },
];

// New editorial drafts for the local redesign. No prior publication dates or
// personal endorsements are implied; source links support the technical work.
export const ARTICLES: Article[] = [
  {
    slug: "dynamic-workflows-need-a-stopping-rule",
    title: "Dynamic workflows still need a stopping rule",
    dek: "Reading Anthropic’s dynamic-workflows article alongside the decisions I made in Resume Gauntlet: separate the work, verify the artifact, and make failure count.",
    topics: [
      "Reading notes",
      "Anthropic",
      "Dynamic workflows",
      "Agents",
      "Evaluation",
      "Orchestration",
    ],
    projectId: "gauntlet",
    minutes: 5,
    sections: [
      {
        heading: "The useful idea in the article",
        paragraphs: [
          "Anthropic describes dynamic workflows as task-specific orchestration: the system breaks down a problem, runs independent subagents, checks and challenges their findings, then combines the results. Progress persists across interruptions. The article also makes the cost visible: this can consume substantially more tokens than an ordinary session.",
          "The part I want to examine is the checking step. Parallel work can cover more ground, but a larger collection of plausible answers is not automatically a more trustworthy result. I care about what a verifier receives, what it can change, and what happens when it disagrees with the writer.",
        ],
      },
      {
        heading: "A concrete version of the problem",
        paragraphs: [
          "Resume Gauntlet starts from evidence about someone’s work and produces a document. The failure I wanted to catch was not only bad grammar. A system can turn a team result into a sole-author claim, turn an experiment into a production claim, or keep a number while dropping the conditions that made it true.",
          "I separated raw facts from rendered wording and made the review a distinct part of the workflow. Eight reviewer perspectives inspect the output. A plausibility check asks a different question from a parser check; neither replaces the other. Their value comes from the particular failure each is responsible for detecting.",
        ],
      },
      {
        heading: "Independence needs an implementation",
        paragraphs: [
          "In the canonical Claude workflow, writer and verifier model families must differ, and verifier tools are read-only. The reviewer reports a defect instead of rewriting the artifact it was supposed to judge. That preserves an inspectable relationship between the draft, the finding and the later fix.",
          "I also check that expected reviewers returned. A missing report is not a passing report. Otherwise a broken orchestration step can make a run look cleaner simply by skipping the person, or agent, most likely to object.",
          "This is a narrower, task-specific system than the broad workflows in Anthropic’s article. I am comparing design decisions, not claiming I implemented Claude’s dynamic-workflow runtime or that this project depends on that feature.",
        ],
      },
      {
        heading: "Check the thing that will be delivered",
        paragraphs: [
          "A verdict about an earlier draft should not quietly authorize a changed PDF. I bind validation to the artifact being delivered and inspect the rendered result. Layout, parse integrity and claim defensibility can all fail after a source-level edit that looked harmless.",
          "The same principle appears in software review. If a worker returns a claim that a test passes, the orchestrator needs enough evidence to connect that result to the code under review. A summary without the artifact identity is easy to carry past the point where it stopped being true.",
        ],
      },
      {
        heading: "The stop condition is part of the product",
        paragraphs: [
          "A review system needs a defined response to rejection. In Resume Gauntlet, blocking outcomes keep the workflow unresolved, bounded fix loops attempt repairs, and missing verification must be reported. A completion message cannot be the only evidence that the work completed.",
          "Reuse is useful when its conditions are explicit. An unchanged artifact and unchanged review requirements can justify carrying prior work. When either changes, the workflow needs to determine what must be checked again. Repeating every step wastes effort; carrying every old verdict hides risk.",
          "That is the practical question I take from this reading: where is additional parallel work likely to change the answer, and where do I instead need a stronger contract between the work and its verification? For systems I build, I want the stopping rule to be something I can inspect and test.",
        ],
      },
    ],
    references: [
      {
        label: "Anthropic: Introducing dynamic workflows in Claude Code",
        url: "https://claude.com/resources/articles/introducing-dynamic-workflows-in-claude-code",
      },
      { label: "My Resume Gauntlet project notes", url: "/work/gauntlet" },
    ],
  },
  {
    slug: "only-send-the-schema-a-tool-needs",
    title: "Only send the schema a tool needs",
    dek: "A Notion MCP pull request reduced the tool-list response by pruning unreachable definitions. The interesting work was proving what remained.",
    topics: ["Open source", "MCP", "TypeScript", "Performance", "Testing"],
    projectId: "open-source",
    minutes: 4,
    sections: [
      {
        heading: "The response carried more than the tool used",
        paragraphs: [
          "In the Notion MCP server, each generated tool input schema carried all nine component definitions from the OpenAPI specification. A read tool with no object parameters still received structures for writing blocks, rich text and parents. The converter was attaching a shared inventory where it needed a dependency set.",
          "I opened a pull request to retain only the definitions a tool could reach from its input parameters. On the real specification, the measured tools/list JSON-RPC response fell from 76,259 bytes to 23,749 bytes. The important unit is bytes: I did not measure tokenizer output, model latency or a particular client’s improvement.",
        ],
      },
      {
        heading: "Reachability, not a special case for read tools",
        paragraphs: [
          "It would have been easy to remove a few known definitions from a few known tool names. That would have encoded today’s specification in the fix. Instead, the converter starts from the input schema’s references and follows references within each definition until it has reached every dependency.",
          "A visited set makes cycles finite. References inside unions, arrays, additional properties and query parameters still count. The traversal is conservative: a reference-looking field inside a default or enum can keep a definition even if that means retaining more than strictly necessary. Removing a needed structure would be a worse failure than keeping an extra one.",
        ],
        code: "pending = references in the tool parameters\nwhile pending is not empty:\n  visit one previously unseen definition\n  add its references to pending\nkeep the visited definitions",
      },
      {
        heading: "Keep the shape, reduce the contents",
        paragraphs: [
          "The patch keeps the $defs key even when it becomes an empty object. Definitions that remain keep their original structure. Return schemas are unchanged, because this change targets the input contracts sent in tools/list. That gives a reviewer a narrower behavior to evaluate.",
          "The tests cover synthetic dependency graphs and the actual generated tool list. The latter starts the proxy, connects an SDK client over an in-memory transport, calls listTools and checks the definitions each tool exposes. A separate walk in the test computes the expected reachable set instead of simply asserting that the helper returns its own output.",
        ],
      },
      {
        heading: "What the tests established",
        paragraphs: [
          "Six of the seven new tests failed against the original behavior. With the patch, the recorded run passed 119 tests across 15 files and built successfully. A manual stdio session measured the response itself after initialization, rather than estimating savings from source files.",
          "This does not prove the patch fixes every client report associated with schema size. I did not test the client named in the original issue, and the local run was on Windows with Node 22. The contribution is a bounded improvement with a reproducible measurement and a clear review surface.",
        ],
      },
      {
        heading: "The status is part of the story",
        paragraphs: [
          "At the November 4 review, the upstream pull request was open and unmerged. I can describe the patch I wrote and the behavior I measured, but not present it as a released upstream feature.",
          "What I like about this kind of engineering is that the before and after can be inspected. The code sends less irrelevant structure, preserves what a tool needs, and carries tests that fail when those promises stop holding. The reduction matters because the boundary is better defined, not just because the response is smaller.",
        ],
      },
    ],
    references: [
      {
        label: "The upstream pull request, tests and measurement",
        url: "https://github.com/makenotion/notion-mcp-server/pull/377",
      },
    ],
  },
  {
    slug: "when-a-safety-score-hides-the-cost",
    title: "When a safety score hides the cost",
    dek: "A defense reached zero attack success in one test. The more useful question was what happened to the clean answers.",
    topics: ["AI safety", "Evaluation", "RAG", "False positives", "Research"],
    projectId: "research",
    minutes: 5,
    sections: [
      {
        heading: "The attractive number",
        paragraphs: [
          "In a paired experiment on llama3.2:3b, our fused defense stopped the measured T2 attacks. Attack success was 12% without a defense, 38% with a prompt-only defense and 0% with the fused defense. There were 50 attack-paired queries. It is a striking comparison, and an easy place to stop reading.",
          "I do not think it is a sufficient account of the result. The same filter can remove malicious instructions and useful evidence. A retrieval system that avoids an attack by losing the information needed to answer has traded one failure for another. I wanted that tradeoff to be visible in the evaluation.",
        ],
      },
      {
        heading: "Give every percentage its denominator",
        paragraphs: [
          "The initial clean-query measure was deliberately strict: count a query whenever the defense removes at least one retrieved chunk. The fixed-threshold fused defense triggered that condition for 76% of 50 clean queries. That does not mean it removed 76% of chunks, and it does not mean 76% of answers were wrong.",
          "Each query retrieved five chunks. Removing one of those five can leave enough information to answer; removing the only relevant passage can do much more damage. Combining both events into one flag makes the result easy to count but difficult to interpret. I kept the original measure and added more specific ones.",
        ],
      },
      {
        heading: "Three views of the cost",
        paragraphs: [
          "The first view counted removed chunks over all retrieved chunks: 31%. The second counted clean queries where removal coincided with a degraded answer: 32%. The third used a pairwise model judge to compare answers with and without the defense, independent of whether a removal occurred: 34% were judged worse.",
          "These figures describe different populations and conditions. They refine the original 76% signal rather than replacing it with a more flattering score. In the public analysis, the definitions sit next to the results so a reader can tell exactly which event each percentage counts.",
        ],
        code: "removed chunks / all retrieved chunks\nqueries with removal and degradation / clean queries\nqueries judged degraded / clean queries",
      },
      {
        heading: "The evaluator needs scrutiny too",
        paragraphs: [
          "I compared saved defense-on and defense-off answers and randomized their A/B order, recording that assignment so it could be inspected. This reduces a source of position bias; it does not turn a model judge into ground truth. The report also records how ties, refusals and parse failures were handled.",
          "The study remains small and specific. A single seed, one clean-query set and one target model cannot establish deployment safety. Other parts of the project exposed additional limits: a fragmented attack could fail because its pieces were not retrieved together, and a proposed defense signal could contribute almost no learned weight. Those details change what the headline is allowed to mean.",
        ],
      },
      {
        heading: "What I would carry into the next experiment",
        paragraphs: [
          "I would preserve the retrieved passages, filter decisions and answers as first-class results. Then I would measure security and utility separately across more seeds, domains and model sizes. If a decision changes the denominator, I would make that change explicit rather than compare the numbers as though they were the same experiment.",
          "The useful outcome was not a claim that I had solved prompt injection. It was a clearer account of where a defense helped, where it hurt, and which next experiments could distinguish those effects. That is a much better starting point for a system someone might actually use.",
        ],
      },
    ],
    references: [
      {
        label: "Experiment code and recorded results",
        url: "https://github.com/muhammad-musa-ml/IPI-763",
      },
      {
        label: "Definitions and results for the three utility metrics",
        url: "https://github.com/muhammad-musa-ml/IPI-763/blob/main/docs/phase5_honest_fpr.md",
      },
    ],
  },
  {
    slug: "a-bookmark-is-not-a-research-system",
    title: "A bookmark is not a research system",
    dek: "What I changed in Kiln to keep ideas useful without losing the evidence, the uncertainty or the original source.",
    topics: [
      "Knowledge systems",
      "Search",
      "Provenance",
      "Product engineering",
      "Publishing",
    ],
    projectId: "kiln",
    minutes: 5,
    sections: [
      {
        heading: "Saving was the easy part",
        paragraphs: [
          "A saved link is a promise to return. It is not yet a useful note. The interesting part might be a diagram halfway through a video, a tool mentioned without a link, or a technique that only works under conditions the creator never explains. Collect enough of those promises and the library becomes another inbox.",
          "I built Kiln to close that gap. A source can become a practical guide with citations, files, commands and project ideas. The important design constraint is that the guide must not replace its evidence. I want to be able to ask where a statement came from after the polished explanation has made it feel obvious.",
        ],
      },
      {
        heading: "Split capture from research",
        paragraphs: [
          "The earlier workflow tried to acquire and understand the media itself. That made authentication, frame selection and transcription part of every research task. The current workflow starts from a Markdown dossier: the original URL, transcript or visual observations, named tools, claims and gaps are already captured.",
          "Kiln saves an immutable revision before it changes the database. An identical completed revision is not new work; a changed revision becomes pending. From there, research can concentrate on checking current sources and producing something useful. A source’s confident wording is evidence to inspect, not permission to run its commands.",
        ],
      },
      {
        heading: "Merge the idea without erasing its history",
        paragraphs: [
          "Two sources can discuss the same practical problem in different language. Keeping both as isolated cards duplicates the work; merging everything with a shared tag loses useful distinctions. I compare purpose and subject, using specific terms, tools, repositories and original URLs to find candidates. A broad category alone does not establish that two items belong together.",
          "When sources do become one topic, the originals remain attached. Membership can be reversed, and earlier item links still resolve. That makes organization a decision I can revisit instead of a destructive cleanup operation. Disagreements and different methods should survive the synthesis when they matter to the task.",
        ],
      },
      {
        heading: "Keep finished research separate from finished work",
        paragraphs: [
          "A good tutorial can suggest ten projects. It cannot make all ten projects real. Kiln tracks the owner’s outcome separately from whether research is complete, and building a proposed project requires a separate queue decision. That boundary is small in the interface and important in the data model.",
          "The same distinction applies to unresolved evidence. Missing sources or a failed artifact leave an item pending with a retryable error. I would rather retain a useful incomplete record than disguise a missing step as a successful pipeline run.",
        ],
      },
      {
        heading: "A publish button is only the beginning",
        paragraphs: [
          "The local workspace and public library serve different purposes. The public site is a static snapshot. It receives an allowlisted set of fields and artifacts, while private notes, raw intake, credentials and machine paths remain local. Sharing a common interface does not require sharing all the underlying capabilities.",
          "After deployment, the workflow compares the live files with the exported hashes. A successful export or push is not sufficient proof that the reader is seeing the intended version. This is the same lesson a small visual website change can teach: verify the thing the person receives, not only the command that produced it.",
          "The result I want from Kiln is modest but useful. Find an idea, understand how to apply it, see what is uncertain, and follow the trail back. The library earns its place when that takes less effort than reconstructing the research from the original bookmarks.",
        ],
      },
    ],
    references: [
      {
        label: "Kiln’s current workflow and code map",
        url: "https://github.com/muhammad-musa-ml/kiln",
      },
      {
        label: "The public research library",
        url: "https://kiln-by-m.vercel.app/",
      },
    ],
  },
  {
    slug: "a-spotlight-without-the-rings",
    title: "A spotlight without the rings",
    dek: "A small visual defect in this site turned into a useful distinction: lighting the background and revealing its geometry are different operations.",
    topics: [
      "Graphics",
      "Three.js",
      "Shaders",
      "Interaction design",
      "Debugging",
    ],
    projectId: "portfolio",
    minutes: 4,
    sections: [
      {
        heading: "The detail that broke the illusion",
        paragraphs: [
          "The background of this site used a cursor spotlight to reveal a constellation. The interaction was meant to feel quiet: a dark surface, a small warm pointer, and a little structure emerging as I moved. Broad blue-black rings around the pointer made the surface feel like a stack of effects instead.",
          "The distinction mattered more than the size of the change. I still wanted the spotlight. I did not want the empty background to become a visibly shaded disk. Removing the interaction entirely would have hidden the symptom without preserving the design.",
        ],
      },
      {
        heading: "Reveal the marks, leave the surface alone",
        paragraphs: [
          "The earlier implementation placed a veil over the scene. A later version used a CSS mask to fade the rendered constellation. I moved the reveal into the point and line materials, where it could change the opacity of the geometry without painting a separate gradient across otherwise empty pixels.",
          "The material compares the current fragment position with the pointer, divides by the spotlight radius, and uses the resulting distance to calculate a falloff. Points and line fragments receive that opacity adjustment. A pixel where the scene drew nothing remains the original matte surface.",
        ],
        code: "distanceFromPointer = distance(fragment, pointer) / radius\ngeometryOpacity *= reveal(distanceFromPointer)\n// Empty background pixels receive no extra tinted layer.",
      },
      {
        heading: "Coordinates are part of the visual design",
        paragraphs: [
          "Pointer events arrive in browser coordinates. The shader works in drawing-buffer pixels, with a different vertical origin. The implementation accounts for the renderer’s pixel ratio and flips the pointer’s vertical coordinate before sending it to the material. A correct equation in the wrong coordinate system still produces the wrong interaction.",
          "I also kept the pointer easing dependent on elapsed time rather than assuming every display draws the same number of frames. That lets the spotlight follow smoothly without making the intended response depend entirely on refresh rate. It is a small piece of engineering in service of a very simple visual promise.",
        ],
      },
      {
        heading: "Fixing the rings did not settle the brightness",
        paragraphs: [
          "After the rendering change, the live background could still feel too dim. Brightness outside the spotlight and the amount of fading while the pointer rested were separate controls. I adjusted those without changing the palette. That was a useful reminder that a technically correct fix does not automatically match the visual intention.",
          "For the next design, the requirement became more specific: a fully matte surface, with the hidden geometry visible only under the cursor. That changes the ambient visibility target, but keeps the same separation between the surface and the thing being revealed.",
        ],
      },
      {
        heading: "Verify the delivered page",
        paragraphs: [
          "I checked the production build and the assets served by the public URL, then inspected the actual page. An up-to-date deployment and the right visual result answer different questions; both need checking. A user describing a translucency difference is giving useful evidence even when the deployment contains the expected commit.",
          "The part worth reusing is not a particular shader trick. It is the decision to give each visual layer one job, then test the interaction in the place people will experience it. A quiet effect stops feeling quiet as soon as its implementation becomes the most visible thing about it.",
        ],
      },
    ],
    references: [
      {
        label: "The published spotlight implementation",
        url: "https://github.com/muhammad-musa-ml/musa-portfolio/blob/832355c2345bd82157a35e9dfa01a701bab24fab/src/three/useTorchlight.ts",
      },
      {
        label: "The material-rendering change",
        url: "https://github.com/muhammad-musa-ml/musa-portfolio/commit/ee1754ec271fa9b929357fc7ee7ee7bab5cfb311",
      },
    ],
  },
];
