export type SearchEntry = {
  id: string;
  label: string;
  detail: string;
  href: string;
  group:
    | "Go somewhere"
    | "Sections"
    | "Projects"
    | "Writing"
    | "Experience"
    | "Skills"
    | "Credentials";
  keywords: string;
  snippet?: string;
  parent?: string;
  kind?:
    | "page"
    | "section"
    | "project"
    | "article"
    | "experience"
    | "education"
    | "skill"
    | "credential"
    | "publication";
  text?: string;
};

export type SemanticMatch = { id: string; score: number };
export type RankedEntry = SearchEntry & { score: number };
export type MeaningUpdate = {
  status: "idle" | "loading" | "searching" | "ready" | "error";
  query: string;
  matches: SemanticMatch[];
  message?: string;
  percent?: number;
};
export type WorkerRequest =
  | { type: "search"; id: number; query: string }
  | { type: "cancel"; id: number };
export type WorkerResponse =
  | { type: "progress"; message: string; percent?: number }
  | { type: "ready" }
  | { type: "results"; id: number; query: string; matches: SemanticMatch[] }
  | { type: "error"; id?: number; message: string };
