import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { profile } from '../../lib/profile'
import { MOTION_OFF } from '../../lib/motionEnv'

// the tools he actually leans on — lit warmer in the band
const HOT = new Set([
  'PyTorch',
  'Hugging Face',
  'LLMs / GPT API',
  'RAG',
  'Multi-agent orchestration',
  'Claude Agent SDK',
  'QLoRA / PEFT fine-tuning',
  'Python',
  'Docker',
  'FastAPI',
  'React',
  'Supabase',
])

/* ————— semantic search layer —————
   Each tool carries hand-tuned tags (what it's for, what family it belongs
   to, what people call it), and common query spellings are rewritten first —
   so "python" lights up the python ecosystem and "ipynb" finds the
   notebook-world tools, not nothing. */

const TAGS: Record<string, string[]> = {
  Python: ['language', 'scripting', 'jupyter', 'notebooks', 'py', 'ml', 'data science'],
  'C++': ['language', 'systems', 'cpp', 'performance', 'native'],
  C: ['language', 'systems', 'embedded', 'low-level'],
  SQL: ['language', 'database', 'queries', 'relational', 'db'],
  JavaScript: ['language', 'web', 'js', 'frontend', 'node', 'typescript'],
  R: ['language', 'statistics', 'data science', 'analysis'],
  Scala: ['language', 'jvm', 'spark', 'functional', 'big data'],
  MATLAB: ['language', 'numerical', 'engineering', 'simulation'],
  Clarity: ['language', 'blockchain', 'smart contracts', 'stacks', 'web3'],
  Solidity: ['language', 'blockchain', 'smart contracts', 'ethereum', 'web3'],
  PyTorch: ['python', 'deep learning', 'neural networks', 'ml framework', 'torch', 'training', 'jupyter', 'gpu'],
  TensorFlow: ['python', 'deep learning', 'neural networks', 'ml framework', 'keras', 'google', 'training'],
  'Hugging Face': ['python', 'transformers', 'nlp', 'models', 'fine-tuning', 'llm', 'ml'],
  'scikit-learn': ['python', 'machine learning', 'classical ml', 'jupyter', 'data science'],
  Keras: ['python', 'deep learning', 'tensorflow', 'neural networks'],
  'LLMs / GPT API': ['llm', 'openai', 'language models', 'chatbots', 'api', 'ai', 'generative'],
  Ollama: ['llm', 'local models', 'inference', 'open source', 'ai'],
  'Generative AI (Claude, Gemini, GPT)': ['llm', 'claude', 'gemini', 'anthropic', 'google', 'openai', 'ai', 'chatbots', 'generative'],
  YOLOv5: ['computer vision', 'object detection', 'python', 'images', 'ml'],
  Detectron2: ['computer vision', 'segmentation', 'detection', 'pytorch', 'meta', 'images'],
  SAM: ['computer vision', 'segmentation', 'segment anything', 'meta', 'images'],
  NumPy: ['python', 'numerical', 'arrays', 'data science', 'jupyter', 'scientific'],
  Pandas: ['python', 'dataframes', 'data science', 'analysis', 'jupyter', 'tabular'],
  RAG: ['retrieval', 'embeddings', 'vector search', 'llm', 'grounding', 'ai', 'context'],
  'Multi-agent orchestration': ['agents', 'llm', 'pipelines', 'autonomous', 'ai', 'workflows'],
  'Claude Agent SDK': ['agents', 'anthropic', 'claude', 'llm', 'sdk', 'ai', 'typescript'],
  'LLM-as-judge': ['evaluation', 'llm', 'evals', 'scoring', 'ai', 'benchmarks'],
  'Prompt engineering': ['llm', 'prompts', 'ai', 'context', 'generative'],
  'QLoRA / PEFT fine-tuning': ['fine-tuning', 'lora', 'llm', 'training', 'efficient', 'python', 'hugging face'],
  'Model evaluation': ['evals', 'benchmarks', 'metrics', 'testing', 'ml', 'quality'],
  Spark: ['big data', 'scala', 'distributed', 'etl', 'data engineering', 'pipelines'],
  PostgreSQL: ['database', 'sql', 'relational', 'db', 'backend'],
  Supabase: ['database', 'postgresql', 'backend', 'realtime', 'auth', 'storage'],
  AWS: ['cloud', 'infrastructure', 's3', 'ec2', 'devops', 'deployment'],
  GCP: ['cloud', 'google', 'infrastructure', 'devops', 'deployment'],
  Docker: ['containers', 'devops', 'deployment', 'infrastructure', 'images'],
  Kubernetes: ['containers', 'orchestration', 'devops', 'infrastructure', 'scaling'],
  gRPC: ['api', 'rpc', 'microservices', 'protobuf', 'backend', 'streaming'],
  'Power BI': ['visualization', 'dashboards', 'analytics', 'microsoft', 'reporting'],
  CUDA: ['gpu', 'nvidia', 'parallel', 'performance', 'deep learning'],
  React: ['javascript', 'frontend', 'web', 'ui', 'components', 'typescript'],
  'Next.js': ['react', 'frontend', 'web', 'ssr', 'javascript', 'fullstack'],
  'Flutter/Dart': ['mobile', 'cross-platform', 'ios', 'android', 'ui', 'apps'],
  Flask: ['python', 'web', 'backend', 'api', 'server'],
  FastAPI: ['python', 'web', 'backend', 'api', 'async', 'server'],
  Node: ['javascript', 'backend', 'server', 'runtime', 'web'],
}

// query rewrites: what people type → what it means in this toolkit
const ALIASES: Record<string, string> = {
  ipynb: 'jupyter',
  notebook: 'jupyter',
  notebooks: 'jupyter',
  colab: 'jupyter',
  js: 'javascript',
  ts: 'typescript',
  k8s: 'kubernetes',
  tf: 'tensorflow',
  hf: 'hugging face',
  postgres: 'postgresql',
  np: 'numpy',
  pd: 'pandas',
  sklearn: 'scikit-learn',
  torch: 'pytorch',
  cv: 'computer vision',
  vision: 'computer vision',
  nn: 'neural networks',
  dl: 'deep learning',
  db: 'database',
  gpt: 'llm',
  chatgpt: 'llm',
  openai: 'llm',
  anthropic: 'claude',
  gemini: 'google',
  embeddings: 'rag',
  vectors: 'rag',
  eth: 'ethereum',
  crypto: 'blockchain',
  viz: 'visualization',
  chart: 'visualization',
  frontend: 'web',
  ui: 'frontend',
  serverless: 'cloud',
  infra: 'infrastructure',
  finetuning: 'fine-tuning',
  finetune: 'fine-tuning',
  lora: 'fine-tuning',
  agentic: 'agents',
  agent: 'agents',
}

function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
  return dp[a.length][b.length]
}

/** 0 = no match · 25 = fuzzy/typo · 45+ = related · 60+ = direct */
function scoreTool(tool: string, category: string, terms: string[]): number {
  const name = tool.toLowerCase()
  const tags = TAGS[tool]?.map((t) => t.toLowerCase()) ?? []
  const cat = category.toLowerCase()
  let best = 0
  for (const t of terms) {
    if (t.length < 2) {
      // single-letter queries ("c", "r") match exact names/tags only —
      // substring matching would light up half the toolkit
      if (name === t) best = Math.max(best, 100)
      else if (tags.includes(t)) best = Math.max(best, 60)
      continue
    }
    if (name === t) best = Math.max(best, 100)
    else if (name.includes(t)) best = Math.max(best, 70)
    else if (tags.includes(t)) best = Math.max(best, 60)
    else if (tags.some((tag) => tag.includes(t) || (t.length > 3 && tag.length > 2 && t.includes(tag))))
      best = Math.max(best, 45)
    else if (cat.includes(t)) best = Math.max(best, 30)
    else {
      const words = name.split(/[^a-z0-9+#.]+/).concat(tags.flatMap((x) => x.split(' ')))
      const tol = t.length > 5 ? 2 : 1
      if (words.some((w) => w.length > 3 && editDistance(w, t) <= tol)) best = Math.max(best, 25)
    }
  }
  return best
}

function expandQuery(q: string): string[] {
  const raw = q.toLowerCase().trim().split(/\s+/).filter(Boolean)
  const out = new Set<string>()
  for (const t of raw) {
    out.add(t)
    if (ALIASES[t]) out.add(ALIASES[t])
  }
  const whole = q.toLowerCase().trim()
  if (ALIASES[whole]) out.add(ALIASES[whole])
  return [...out]
}

export default function Toolkit() {
  const [openAll, setOpenAll] = useState(MOTION_OFF)
  const [q, setQ] = useState('')
  const all = useMemo(() => Object.values(profile.skills).flat(), [])
  const track = [...all, ...all] // duplicate for a seamless marquee loop

  const terms = useMemo(() => expandQuery(q), [q])
  const scores = useMemo(() => {
    if (!q.trim()) return null
    const m = new Map<string, number>()
    for (const [cat, tools] of Object.entries(profile.skills))
      for (const t of tools) m.set(t, scoreTool(t, cat, terms))
    return m
  }, [q, terms])

  const matchCount = scores ? [...scores.values()].filter((s) => s >= 45).length : 0
  const fuzzyOnly = scores && matchCount === 0 && [...scores.values()].some((s) => s > 0)

  const chipState = (t: string): string => {
    if (!scores) return ''
    const s = scores.get(t) ?? 0
    if (s >= 60) return 'is-match'
    if (s >= 45) return 'is-related'
    if (s >= 25 && matchCount === 0) return 'is-related' // fall back to fuzzy hits
    return 'is-dim'
  }

  return (
    <section className="toolkit" id="toolkit" aria-label="Toolkit">
      <div className="toolkit__bar">
        <p className="toolkit__label mono-label">
          03 · toolkit — {all.length} tools across research, ML, and the stack
        </p>
        {!MOTION_OFF && (
          <button
            className="toolkit__toggle"
            onClick={() => {
              setOpenAll((v) => !v)
              setQ('')
            }}
            aria-expanded={openAll}
            data-cursor="hover"
          >
            {openAll ? '− back to the ticker' : '+ browse all & search'}
          </button>
        )}
      </div>

      {!openAll && (
        <div className="toolkit__viewport">
          <div className="toolkit__track">
            {track.map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="chip toolkit__chip"
                data-hot={HOT.has(t) ? 1 : 0}
                aria-hidden={i >= all.length}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {openAll && (
        <motion.div
          className="toolkit__panel"
          initial={MOTION_OFF ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="toolkit__searchrow">
            <span className="toolkit__searchicon" aria-hidden>
              ⌕
            </span>
            <input
              className="toolkit__search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="search the toolkit — try “python”, “agents”, “ipynb”, “cloud”…"
              aria-label="Search tools"
            />
            {q && (
              <button className="toolkit__clear" onClick={() => setQ('')} aria-label="Clear search" data-cursor="hover">
                ✕
              </button>
            )}
            {scores && (
              <span className="toolkit__count mono-label">
                {matchCount > 0
                  ? `${matchCount} match${matchCount === 1 ? '' : 'es'}`
                  : fuzzyOnly
                    ? 'closest matches'
                    : 'no matches'}
              </span>
            )}
          </div>

          {Object.entries(profile.skills).map(([cat, tools]) => (
            <div className="toolkit__group" key={cat}>
              <p className="toolkit__cat mono-label">{cat}</p>
              <div className="toolkit__chips">
                {tools.map((t) => (
                  // no data-hot here: the amber "most-used" emphasis belongs to
                  // the ticker; the browse panel stays neutral until you search
                  <span key={t} className={`chip toolkit__chip ${chipState(t)}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </section>
  )
}
