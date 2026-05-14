import { Maximize2, Move3d, RotateCw } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '../../lib/cn.js'

// Stylized scientific molecule placeholder. Renders an atom-bond graph derived
// from the candidate's chemical formula. The geometry is decorative — to be
// swapped for a real 3D viewer (e.g., 3Dmol.js, Mol*) once we have structural
// data. For now we extract element symbols from the formula and lay them out
// in a radial cluster so the picture reflects the actual candidate.
export default function MoleculeViewerPanel({
  title,
  formula,
  className
}) {
  const displayTitle = title || formula || 'Catalyst structure'
  const displayFormula = formula || '—'

  const atoms = useMemo(() => buildAtoms(formula || ''), [formula])
  const bonds = useMemo(() => buildBonds(atoms), [atoms])

  return (
    <div className={cn('surface relative overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-300/80">3D Structure</div>
          <h3 className="text-sm font-semibold text-ink-100 truncate">{displayTitle}</h3>
          <div className="text-[11px] text-ink-400 font-mono truncate">{displayFormula}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ToolBtn icon={RotateCw} />
          <ToolBtn icon={Move3d} />
          <ToolBtn icon={Maximize2} />
        </div>
      </div>

      <div className="relative mt-3 h-[360px] w-full grid-overlay scanline">
        <svg viewBox="0 0 480 320" className="absolute inset-0 h-full w-full">
          <defs>
            <radialGradient id="atomGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>

          {/* Faint orbiting rings */}
          <ellipse cx="240" cy="160" rx="200" ry="60" fill="none" stroke="rgba(34,211,238,0.18)" strokeDasharray="3 6" />
          <ellipse cx="240" cy="160" rx="170" ry="100" fill="none" stroke="rgba(45,212,191,0.12)" strokeDasharray="3 6" />

          {bonds.map((b, idx) => (
            <line
              key={idx}
              x1={b.x1}
              y1={b.y1}
              x2={b.x2}
              y2={b.y2}
              stroke="rgba(184,196,218,0.5)"
              strokeWidth="1.5"
            />
          ))}

          {atoms.map((a, i) => (
            <g key={i}>
              <circle cx={a.x} cy={a.y} r={a.r + 12} fill="url(#atomGlow)" opacity="0.6" />
              <circle cx={a.x} cy={a.y} r={a.r} fill={a.color} opacity="0.85" />
              <circle cx={a.x - a.r * 0.35} cy={a.y - a.r * 0.35} r={a.r * 0.35} fill="rgba(255,255,255,0.35)" />
              <text
                x={a.x}
                y={a.y + 4}
                textAnchor="middle"
                fontSize={a.r > 16 ? 12 : 10}
                fontFamily="JetBrains Mono, monospace"
                fill="#06090F"
                fontWeight="700"
              >
                {a.label}
              </text>
            </g>
          ))}

          {atoms.length === 0 && (
            <text
              x="240"
              y="170"
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              fontSize="12"
              fill="#5B6B8A"
            >
              No structural data available
            </text>
          )}
        </svg>

        {/* Element legend */}
        {atoms.length > 0 && (
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-1.5 max-w-[60%]">
            {uniqueByLabel(atoms).map((a) => (
              <span
                key={a.label}
                className="inline-flex items-center gap-1 rounded-full bg-ink-900/70 px-1.5 py-0.5 text-[10px] font-mono text-ink-200 ring-1 ring-ink-700/60"
              >
                <span
                  className="h-2 w-2 rounded-full ring-1 ring-white/20"
                  style={{ backgroundColor: a.color }}
                />
                {a.label}
              </span>
            ))}
          </div>
        )}

        <div className="pointer-events-none absolute top-3 right-3 text-[10px] font-mono text-ink-400">
          render: ball-and-stick · stylized
        </div>
      </div>
    </div>
  )
}

function ToolBtn({ icon: Icon }) {
  return (
    <button className="grid h-7 w-7 place-items-center rounded-md bg-ink-800 text-ink-300 ring-1 ring-ink-700 hover:text-cyan-300 hover:ring-cyan-400/30">
      <Icon className="h-3.5 w-3.5" />
    </button>
  )
}

// --- formula parsing -----------------------------------------------------

const ELEMENT_COLORS = {
  // Common transition metals — cyan/blues
  Cu: '#22D3EE',
  Pt: '#67E8F9',
  Pd: '#22D3EE',
  Ni: '#5EEAD4',
  Co: '#06B6D4',
  Fe: '#0EA5E9',
  Ag: '#94A3B8',
  Au: '#FCD34D',
  Mn: '#A78BFA',
  W: '#94A3B8',
  Mo: '#94A3B8',
  Ru: '#06B6D4',
  Rh: '#22D3EE',
  Ir: '#67E8F9',
  Ti: '#94A3B8',
  V: '#A78BFA',
  Cr: '#94A3B8',
  // Post-transition / main-group metals — emeralds
  Zn: '#34D399',
  Al: '#A7F3D0',
  Ga: '#34D399',
  In: '#10B981',
  Sn: '#A7F3D0',
  Mg: '#A78BFA',
  Ca: '#A78BFA',
  Ce: '#FBBF24',
  La: '#FBBF24',
  Zr: '#94A3B8',
  // Non-metals — warm
  O: '#F59E0B',
  H: '#FDE68A',
  N: '#60A5FA',
  C: '#9CA3AF',
  S: '#FACC15',
  P: '#F472B6',
  B: '#F87171'
}

const KNOWN_ELEMENTS = new Set(Object.keys(ELEMENT_COLORS))

function colorFor(symbol) {
  if (ELEMENT_COLORS[symbol]) return ELEMENT_COLORS[symbol]
  // Stable fallback: pick a hue from a small palette by symbol char codes.
  const palette = ['#22D3EE', '#34D399', '#A78BFA', '#F59E0B', '#F472B6', '#60A5FA']
  let hash = 0
  for (let i = 0; i < symbol.length; i++) hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0
  return palette[hash % palette.length]
}

// Parse a chemical formula like "Cu/ZnO/Al2O3" or "Cu₀.₄₅Zn₀.₄Mg₀.₁₅Oₓ" into
// a list of element symbols (in the order they appear, deduped).
function parseElements(formula) {
  if (!formula) return []
  // Strip subscripts/superscripts and common separators so the regex can find
  // [A-Z][a-z]? element symbols cleanly.
  const cleaned = formula
    .replace(/[₀-₉⁰-⁹·•⋅]/g, '')
    .replace(/[\d.]+/g, '')
    .replace(/[\/_\-\s+]/g, ' ')
  const matches = cleaned.match(/[A-Z][a-z]?/g) || []
  const seen = new Set()
  const out = []
  for (const m of matches) {
    if (seen.has(m)) continue
    seen.add(m)
    out.push(m)
  }
  return out
}

function buildAtoms(formula) {
  const symbols = parseElements(formula)
  if (!symbols.length) return []

  const cx = 240
  const cy = 160
  // Center atom + ring of remaining atoms.
  const center = symbols[0]
  const ring = symbols.slice(1)

  const atoms = []
  atoms.push({ x: cx, y: cy, r: 24, color: colorFor(center), label: center })

  if (!ring.length) return atoms

  const radius = ring.length <= 4 ? 95 : ring.length <= 7 ? 110 : 125
  ring.forEach((sym, i) => {
    const angle = (i / ring.length) * Math.PI * 2 - Math.PI / 2
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius * 0.78
    const r = ring.length <= 5 ? 18 : 14
    atoms.push({ x, y, r, color: colorFor(sym), label: sym })
  })

  return atoms
}

function buildBonds(atoms) {
  if (atoms.length < 2) return []
  const out = []
  // Connect every ring atom to the center.
  for (let i = 1; i < atoms.length; i++) {
    out.push({
      x1: atoms[0].x,
      y1: atoms[0].y,
      x2: atoms[i].x,
      y2: atoms[i].y
    })
  }
  // Connect adjacent ring atoms for a more complete graph (only when there
  // are at least 3 ring atoms).
  if (atoms.length >= 4) {
    for (let i = 1; i < atoms.length; i++) {
      const next = i + 1 < atoms.length ? i + 1 : 1
      out.push({
        x1: atoms[i].x,
        y1: atoms[i].y,
        x2: atoms[next].x,
        y2: atoms[next].y
      })
    }
  }
  return out
}

function uniqueByLabel(atoms) {
  const seen = new Map()
  for (const a of atoms) if (!seen.has(a.label)) seen.set(a.label, a)
  return [...seen.values()]
}
