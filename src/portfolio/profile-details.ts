// Curated public facts from the existing site and its documented portfolio.
// Do not replace this with an import of the private research snapshot.
export const PROFILE_NUMBERS = [
  {
    value: "20",
    label: "people on the TA team I lead",
    href: "/about#experience",
  },
  {
    value: "2",
    label: "published research contributions",
    href: "/about#publications",
  },
  {
    value: "3.9",
    label: "of 4.0 · undergraduate GPA",
    href: "/about#education",
  },
  {
    value: "9",
    label: "certificates, with the originals",
    href: "/about#certificates",
  },
] as const;

export const EXPERIENCE = [
  {
    id: "wumi",
    date: "Jul 2025 — present",
    organization: "WUMI Health",
    role: "Lead Software Engineer",
    location: "Remote",
    summary:
      "I build the connections between a patient, their record, and the people allowed to use it.",
    details: [
      "Built patient onboarding, consent, lab orders and results, prescriptions, health IDs and report uploads in Flutter, PostgreSQL and Supabase.",
      "Kept authorization close to the data through row-level security and audit trails. Appointment scheduling remains in progress.",
    ],
    href: "/work/wumi",
    link: "The product and its boundaries",
  },
  {
    id: "cs320",
    date: "Jul 2024 — present",
    organization: "University of Wisconsin–Madison",
    role: "Head Graduate Teaching Assistant · CS 320",
    location: "Madison",
    summary:
      "I lead a 20-person teaching staff and build the infrastructure behind a large data-science course.",
    details: [
      "Coordinate assignment logistics, grading consistency and student support. Automate grading with Python and the GitLab and Canvas APIs.",
      "Built a MOSS-based academic-integrity workflow and explored local-model assistance for course questions. I keep automation tied to a clear teaching purpose.",
    ],
  },
  {
    id: "saudconsult",
    date: "Jun — Aug 2024",
    organization: "SAUDCONSULT",
    role: "Data Science & Software Engineering Intern",
    location: "Riyadh",
    summary:
      "I worked on a pilot project-controls platform, bilingual document retrieval and inspection triage.",
    details: [
      "Scheduled ingestion with Airflow, validation contracts and replayable backfills. Used idempotent updates to make repeated ingestion safe.",
      "Compared Arabic/English retrieval configurations and calibrated a classifier around the quality team's review capacity. A constrained text-to-SQL path selected from an approved metric layer.",
    ],
  },
  {
    id: "cs220",
    date: "Aug 2023 — May 2024",
    organization: "University of Wisconsin–Madison",
    role: "Graduate Teaching Assistant · CS 220",
    location: "Madison",
    summary:
      "I helped students take their first steps in data-science programming.",
    details: [
      "Led Python labs and individual support in data manipulation, analysis and visualization.",
      "Contributed project and quiz material and supported grading across a large introductory course.",
    ],
  },
  {
    id: "cs331",
    date: "Jan 2022 — May 2023",
    organization: "Lahore University of Management Sciences",
    role: "Head Teaching Assistant · CS 331",
    location: "Lahore",
    summary:
      "I wrote programming assignments that made AI concepts something students could test.",
    details: [
      "Authored exercises in neural networks, Bayesian networks, reinforcement learning and constraint-satisfaction problems.",
      "Helped students connect the mathematics to their implementations and debug the places where the two diverged.",
    ],
  },
  {
    id: "kasb",
    date: "Jul — Oct 2021",
    organization: "KASB Securities & TransformX",
    role: "Blockchain & Web Developer Intern",
    location: "Remote",
    summary:
      "I built educational-credential software and web applications as an undergraduate.",
    details: [
      "Built an on-chain certificate system using Clarity contracts on Stacks, with a React and Next.js minting interface.",
      "Worked on responsive web applications for a communications platform and integrated Stripe payments.",
    ],
  },
] as const;

export const EDUCATION = [
  {
    school: "University of Wisconsin–Madison",
    degree: "M.S. Computer Sciences",
    date: "2023 — 2026 · in progress",
    detail:
      "My graduate work connects machine learning, language-based security and the systems needed to evaluate them.",
    result: "4.0/4.0 in recorded early graduate coursework",
    courses: [
      "Machine learning",
      "Language-based security",
      "Foundation models",
      "Big data systems",
      "Computer vision",
      "AI safety & differential privacy",
    ],
  },
  {
    school: "Lahore University of Management Sciences",
    degree: "B.Sc. Computer Science",
    date: "2019 — 2023",
    detail:
      "I combined coursework with research, teaching and building with other students. My senior thesis became a collaborative publication on ransomware provenance.",
    result: "3.9/4.0 · Dean’s Honor List every semester",
    courses: [
      "Algorithms",
      "Operating systems",
      "Computer networks",
      "Databases",
      "Deep learning",
      "Natural language processing",
    ],
  },
] as const;

export const TOOLKIT = [
  {
    name: "Languages",
    why: "From an experiment to a service.",
    href: "/work/lookup",
    project: "Replicated lookup service",
    tags: "programming scripting systems",
    tools: [
      "Python",
      "C++",
      "C",
      "SQL",
      "JavaScript",
      "R",
      "Scala",
      "MATLAB",
      "Clarity",
      "Solidity",
    ],
  },
  {
    name: "ML / AI",
    why: "Train, inspect, compare.",
    href: "/work/shahmukhi",
    project: "Shahmukhi Punjabi NLP",
    tags: "machine learning deep learning vision nlp neural notebooks jupyter",
    tools: [
      "PyTorch",
      "TensorFlow",
      "Hugging Face",
      "scikit-learn",
      "Keras",
      "LLMs / GPT API",
      "Ollama",
      "Generative AI (Claude, Gemini, GPT)",
      "YOLOv5",
      "Detectron2",
      "SAM",
      "NumPy",
      "Pandas",
    ],
  },
  {
    name: "AI engineering",
    why: "Give a workflow boundaries and evidence.",
    href: "/work/gauntlet",
    project: "Resume Gauntlet",
    tags: "agent agents llm retrieval embeddings orchestration evaluation",
    tools: [
      "RAG",
      "Multi-agent orchestration",
      "Claude Agent SDK",
      "LLM-as-judge",
      "Prompt engineering",
      "QLoRA / PEFT fine-tuning",
      "Model evaluation",
    ],
  },
  {
    name: "Data & cloud",
    why: "Make the data path dependable.",
    href: "/work/lookup",
    project: "Distributed-systems work",
    tags: "infrastructure database storage containers distributed backend",
    tools: [
      "Spark",
      "PostgreSQL",
      "Supabase",
      "AWS",
      "GCP",
      "Docker",
      "Kubernetes",
      "gRPC",
      "Power BI",
      "CUDA",
    ],
  },
  {
    name: "Web & mobile",
    why: "Put the system in somebody’s hands.",
    href: "/work/wumi",
    project: "WUMI Health",
    tags: "frontend ui application app ios android backend",
    tools: ["React", "Next.js", "Flutter/Dart", "Flask", "FastAPI", "Node"],
  },
] as const;

export type Credential = {
  id: string;
  name: string;
  issuer: string;
  issued: string;
  group: string;
  image: string;
  file: string;
  verify?: string;
  summary: string;
  tags: string;
};
export const CREDENTIALS: Credential[] = [
  {
    id: "claude-101",
    name: "Claude 101",
    issuer: "Anthropic",
    issued: "Jul 2026",
    group: "AI & programming",
    image: "/certificates/claude-101.png",
    file: "/certificates/claude-101.pdf",
    summary: "Foundations of working with Claude, prompting and tool use.",
    tags: "anthropic claude llm prompting api",
  },
  {
    id: "claude-code-101",
    name: "Claude Code 101",
    issuer: "Anthropic",
    issued: "Jul 2026",
    group: "AI & programming",
    image: "/certificates/claude-code-101.png",
    file: "/certificates/claude-code-101.pdf",
    summary: "Planning, editing, testing and verifying work with Claude Code.",
    tags: "anthropic claude agents coding developer tools",
  },
  {
    id: "kaggle-intro-ml",
    name: "Intro to Machine Learning",
    issuer: "Kaggle",
    issued: "Jul 2021",
    group: "AI & programming",
    image: "/certificates/kaggle-intro-ml.png",
    file: "/certificates/kaggle-intro-ml.png",
    summary: "Decision trees, model validation and overfitting.",
    tags: "python machine learning scikit-learn data",
  },
  {
    id: "udemy-python",
    name: "The Complete Python 3 Course",
    issuer: "Udemy",
    issued: "Jan 2021",
    group: "AI & programming",
    image: "/certificates/udemy-python.png",
    file: "/certificates/udemy-python.pdf",
    summary:
      "Python fundamentals, data structures and object-oriented programming.",
    tags: "python programming oop",
  },
  {
    id: "bulandi-achievement",
    name: "Bulandi Fellowship",
    issuer: "Beyond the Classroom × Seeds of Peace",
    issued: "Spring 2021",
    group: "Teaching & community",
    image: "/certificates/bulandi-achievement.png",
    file: "/certificates/bulandi-achievement.png",
    summary: "Dialogue, community education and leadership.",
    tags: "fellowship leadership community volunteering peace",
  },
  {
    id: "bulandi-training",
    name: "Bulandi Training & Workshop",
    issuer: "Beyond the Classroom",
    issued: "Spring 2021",
    group: "Teaching & community",
    image: "/certificates/bulandi-training.png",
    file: "/certificates/bulandi-training.png",
    summary: "Training followed by a three-day workshop with students.",
    tags: "teaching education training facilitation",
  },
  {
    id: "codinguru-ieee",
    name: "CodinGuru 3.0 · AIGuru Technical Team",
    issuer: "IEEE LUMS",
    issued: "Jan 2021",
    group: "Teaching & community",
    image: "/certificates/codinguru-ieee.jpg",
    file: "/certificates/codinguru-ieee.jpg",
    summary: "Technical-team contribution to the AIGuru coding competition.",
    tags: "ieee lums coding competition contest",
  },
  {
    id: "coursera-prob-r",
    name: "Introduction to Probability and Data with R",
    issuer: "Duke University · Coursera",
    issued: "Jun 2020",
    group: "Data & applications",
    image: "/certificates/coursera-prob-r.png",
    file: "/certificates/coursera-prob-r.pdf",
    verify: "https://coursera.org/verify/ZMCGZR3DG27Y",
    summary: "Probability, distributions and exploratory data analysis.",
    tags: "r statistics probability data analysis duke",
  },
  {
    id: "coursera-android",
    name: "Build Your First Android App",
    issuer: "CentraleSupélec · Coursera",
    issued: "Jul 2016",
    group: "Data & applications",
    image: "/certificates/coursera-android.png",
    file: "/certificates/coursera-android.pdf",
    verify: "https://coursera.org/verify/8TY85894WUHG",
    summary:
      "A project-centered introduction to Android application development.",
    tags: "android mobile java app",
  },
];

export const PUBLICATIONS = [
  {
    title: "Towards Reproducible Ransomware Analysis",
    venue: "ACM CSET 2023",
    format: "Workshop paper",
    role: "Co-author · second of nine",
    detail:
      "A collaborative dataset and collection pipeline for studying ransomware behavior through execution provenance.",
    href: "https://doi.org/10.1145/3607505.3607510",
    project: "/work/reprod",
  },
  {
    title: "Extremism on Social Media: Lynching of Priyantha Kumara Diyawadana",
    venue: "IEEE/ACM ASONAM 2022",
    format: "Two-page poster",
    role: "First author",
    detail:
      "An early study of social-media sentiment and the context needed to interpret extremist content. The poster presents preliminary findings.",
    href: "https://doi.org/10.1109/ASONAM55673.2022.10068622",
  },
] as const;

export const PROFILE_LINKS = {
  github: "https://github.com/muhammad-musa-ml",
  linkedin: "https://www.linkedin.com/in/mmusa2/",
  orcid: "https://orcid.org/0009-0009-5542-8040",
  resume: "/Muhammad-Musa-Resume.pdf",
};
