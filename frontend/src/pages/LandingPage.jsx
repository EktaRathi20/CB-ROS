import { Link } from 'react-router-dom'
import {
  Atom,
  Beaker,
  ChevronRight,
  Cpu,
  Database,
  Dna,
  FlaskConical,
  GitBranch,
  Leaf,
  Microscope,
  Network,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Workflow
} from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import StatusChip from '../components/ui/StatusChip.jsx'
import WorkflowLoop from '../components/domain/WorkflowLoop.jsx'

const modules = [
  { icon: Atom, title: 'Reaction Input', desc: 'Specify reactants, products, and conditions; copilot fills the gaps.' },
  { icon: Database, title: 'Catalyst Retrieval', desc: 'Pull from PubChem, OCP, Materials Project, BRENDA — in one query.' },
  { icon: Sparkles, title: 'AI Candidate Generation', desc: 'Generate novel catalysts and enzyme cocktails with rationale.' },
  { icon: ShieldCheck, title: 'Validation Layer', desc: 'Applicability domain, sanity checks, and physics-aware filters.' },
  { icon: Cpu, title: 'Predictive Scoring', desc: 'Activity, selectivity, stability, Eₐ, with calibrated uncertainty.' },
  { icon: Microscope, title: 'Visualization', desc: '3D structures, energy profiles, pathway maps, danger zones.' },
  { icon: FlaskConical, title: 'Experiment Logs', desc: 'Capture lab outcomes alongside predictions, with full audit trail.' },
  { icon: GitBranch, title: 'Feedback Learning Loop', desc: 'Failures retrain models. Every run sharpens the engine.' },
  { icon: Workflow, title: 'Creator–Reviewer Workflow', desc: 'Two-eyes verification, lineage trees, institutional memory.' },
  { icon: Network, title: 'Synthetic Biology', desc: 'Microbe + enzyme co-design, flux analysis, mutation impact.' },
  { icon: Leaf, title: 'Sustainability Lens', desc: 'Green H₂ aware, carbon-intensity tagged, circular by default.' },
  { icon: Dna, title: 'Multi-modal Models', desc: 'Sequence, graph, and material representations under one runtime.' }
]

const stages = [
  {
    kicker: '01 · DISCOVER',
    title: 'Surface what is known.',
    body: 'Retrieve catalysts, enzymes, and prior art from curated scientific databases. Annotated by source, latency, and license.',
    icon: Database,
    accent: 'cyan'
  },
  {
    kicker: '02 · VALIDATE',
    title: 'Filter for what is real.',
    body: 'Applicability-domain checks, structural sanity, and physics-aware screens before any candidate enters the pipeline.',
    icon: ShieldCheck,
    accent: 'emerald'
  },
  {
    kicker: '03 · PREDICT',
    title: 'Score with calibrated uncertainty.',
    body: 'Activity, selectivity, stability, activation energy — every number paired with an honest uncertainty band.',
    icon: Cpu,
    accent: 'teal'
  },
  {
    kicker: '04 · LEARN FROM FAILURE',
    title: 'Failed runs are fuel.',
    body: 'Every flagged underperformer feeds the active-learning loop. The model gets sharper precisely where it was wrong.',
    icon: GitBranch,
    accent: 'amber'
  }
]

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Hero */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 bg-radial-glow" />
        <div className="grid-overlay pointer-events-none absolute inset-0 opacity-50" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 shadow-[0_0_30px_-6px_rgba(34,211,238,0.6)]">
              <Beaker className="h-4 w-4 text-ink-950" />
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight">CB-ROS</div>
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-400">
                Catalyst & Bio Research OS
              </div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-xs text-ink-300">
            <a href="#modules" className="hover:text-ink-100">Modules</a>
            <a href="#stages" className="hover:text-ink-100">Workflow</a>
            <a href="#stack" className="hover:text-ink-100">Stack</a>
            <a href="#trust" className="hover:text-ink-100">Trust</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/signin">
              <Button variant="primary" size="sm" iconRight={ChevronRight}>Launch Workspace</Button>
            </Link>
          </div>
        </header>

        <section className="relative z-10 mx-auto max-w-7xl px-6 pt-12 pb-20 lg:pt-20 lg:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/5 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-cyan-200">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulseSoft" />
                Built for sustainable fuels & chemicals
              </div>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
                A Research Operating System
                <br />
                for <span className="text-glow-cyan text-cyan-300">Molecular Discovery</span>.
              </h1>
              <p className="mt-5 max-w-2xl text-base sm:text-lg text-ink-300 leading-relaxed">
                CB-ROS unifies retrieval, generation, validation, and learning into one workstation
                for chemical catalysis and synthetic biology — so researchers move from
                reaction sketch to lab-tested candidate, with every decision auditable.
              </p>
            </div>

            <div className="lg:col-span-5 relative">
              <HeroPanel />
            </div>
          </div>
        </section>
      </div>

      {/* Stages: discover → validate → predict → learn */}
      <section id="stages" className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-2xl">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">THE LOOP</div>
          <h2 className="mt-1 text-3xl sm:text-4xl font-semibold tracking-tight">
            Four stages. One closed scientific loop.
          </h2>
          <p className="mt-3 text-ink-300">
            Discover what is known, validate what is real, predict what is plausible, and learn from
            what failed. Every loop tightens uncertainty.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stages.map((s, i) => (
            <div key={s.kicker} className="surface relative overflow-hidden p-5">
              <div
                className={`pointer-events-none absolute -top-12 -right-10 h-32 w-32 rounded-full blur-2xl opacity-50 ${
                  s.accent === 'cyan' ? 'bg-cyan-400/15' :
                  s.accent === 'emerald' ? 'bg-emerald-400/15' :
                  s.accent === 'teal' ? 'bg-teal-400/15' : 'bg-amber-400/15'
                }`}
              />
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
                {s.kicker}
              </div>
              <s.icon className="mt-3 h-5 w-5 text-cyan-300" />
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink-100">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-300 leading-relaxed">{s.body}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-mono text-ink-400">
                step {i + 1} / 4
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Full 10-stage closed loop */}
      <section className="relative mx-auto max-w-7xl px-6 pb-12">
        <WorkflowLoop />
      </section>

      {/* Modules grid */}
      <section id="modules" className="relative mx-auto max-w-7xl px-6 py-20 border-t divider-soft">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="max-w-2xl">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">PRODUCT MODULES</div>
            <h2 className="mt-1 text-3xl sm:text-4xl font-semibold tracking-tight">
              An operating system, not a tool.
            </h2>
            <p className="mt-3 text-ink-300">
              Twelve composable modules — chemistry, biology, retrieval, generation, validation,
              experiments, and audit — wired into one unified researcher experience.
            </p>
          </div>
          <StatusChip dot tone="emerald">All systems nominal</StatusChip>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {modules.map((m, i) => (
            <div
              key={i}
              className="surface group p-4 transition-colors hover:border-cyan-400/30"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-800 ring-1 ring-ink-700/60 text-cyan-300 group-hover:ring-cyan-400/30">
                <m.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-ink-100">{m.title}</h3>
              <p className="mt-1 text-xs text-ink-300 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stack + Trust band */}
      <section id="stack" className="relative mx-auto max-w-7xl px-6 py-20 border-t divider-soft">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">DATA STACK</div>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">
              Grounded in real scientific knowledge.
            </h2>
            <p className="mt-3 text-ink-300">
              Every recommendation is traceable to a primary source — never a hallucinated citation.
            </p>
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {['PubChem', 'Materials Project', 'Open Catalyst', 'BRENDA', 'UniProt', 'Crossref'].map((s) => (
                <div key={s} className="rounded-lg border divider-soft bg-ink-900/60 px-3 py-2 font-mono">
                  {s}
                </div>
              ))}
            </div>
          </div>
          <div id="trust">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">TRUST</div>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight">
              Built for institutional memory.
            </h2>
            <p className="mt-3 text-ink-300">
              Creator–reviewer workflow, lineage trees, and a tamper-evident audit log mean
              CB-ROS doesn't just produce candidates — it produces defensible decisions.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <StatusChip>SOC 2 Type II</StatusChip>
              <StatusChip>GxP-aware logs</StatusChip>
              <StatusChip>Role-based review</StatusChip>
              <StatusChip>Cryptographic versioning</StatusChip>
            </div>
          </div>
        </div>
      </section>    

      <footer className="border-t divider-soft">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-ink-400">
          <div>© 2026 CB-ROS · Catalyst & Bio Research Operating System</div>
          <div className="flex items-center gap-3">
            <a href="#" className="hover:text-ink-100">Status</a>
            <a href="#" className="hover:text-ink-100">Docs</a>
            <a href="#" className="hover:text-ink-100">Privacy</a>
            <a href="#" className="hover:text-ink-100">Security</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Stat({ kicker, value }) {
  return (
    <div className="surface px-3 py-2.5">
      <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">{kicker}</div>
      <div className="mt-0.5 text-xl font-semibold text-ink-100 tabular">{value}</div>
    </div>
  )
}

function HeroPanel() {
  return (
    <div className="surface relative overflow-hidden p-4 shadow-glow">
      <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-[length:24px_24px] opacity-40" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-cyan-500/15 ring-1 ring-cyan-400/30 text-cyan-300">
              <Sparkles className="h-3 w-3" />
            </span>
            <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-cyan-300/80">
              CB-ROS Workspace · Demo
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulseSoft" /> live
          </span>
        </div>

        <div className="mt-4 surface-raised p-3">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">Reaction</div>
          <div className="mt-1 font-mono text-sm text-ink-100">
            CO₂ + 3H₂ <span className="text-cyan-300">→</span> CH₃OH + H₂O
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <Tag>240°C</Tag>
            <Tag>50 bar</Tag>
            <Tag>Mixed oxide</Tag>
            <Tag tone="emerald">Green H₂</Tag>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <CandidateMini name="Cu/Zn v1.2" type="AI" act={92} sel={88} />
          <CandidateMini name="Cu-Zn-Al-01" type="Known" act={86} sel={91} />
        </div>

        <div className="mt-3 surface-raised p-3">
          <div className="flex items-center justify-between text-[11px] text-ink-300">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-300/80">
              Copilot · rationale
            </span>
            <span className="text-[10px] font-mono text-ink-400">conf 82%</span>
          </div>
          <p className="mt-1 text-xs text-ink-200 leading-relaxed">
            Mg dopant predicted to suppress sintering at 240°C. Backed by Materials Project mp-823
            and OCP-2024 entry 14887.
          </p>
        </div>
      </div>
    </div>
  )
}

function Tag({ children, tone }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-mono ${
      tone === 'emerald'
        ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
        : 'border-ink-700/70 bg-ink-800/60 text-ink-200'
    }`}>{children}</span>
  )
}

function CandidateMini({ name, type, act, sel }) {
  return (
    <div className="surface-raised p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-ink-100">{name}</div>
        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-mono ${
          type === 'AI'
            ? 'border-violet-400/30 bg-violet-500/10 text-violet-300'
            : 'border-ink-700/70 bg-ink-800/60 text-ink-300'
        }`}>{type}</span>
      </div>
      <div className="mt-2 space-y-1.5">
        <Bar label="act" value={act} />
        <Bar label="sel" value={sel} />
      </div>
    </div>
  )
}

function Bar({ label, value }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-mono text-ink-400">
        <span>{label}</span>
        <span className="text-ink-200">{value}%</span>
      </div>
      <div className="mt-0.5 h-1 rounded-full bg-ink-800 overflow-hidden">
        <div className="h-full bar-cyan" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
