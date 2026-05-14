import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Beaker, X } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { useProjectStore } from '../../data/projectStore.jsx'
import { useAuth } from '../../auth/AuthContext.jsx'
import { cn } from '../../lib/cn.js'
import { projectApi } from '../../services/api.js'

const sustainabilityOptions = [
  'Green H₂',
  'Blue H₂',
  'Bio-feedstock',
  'Plastic upcycling',
  'CO₂ utilization',
  'Other'
]

const catalysisTypes = [
  { id: 'metal', label: 'Metal catalysis' },
  { id: 'synthetic', label: 'Synthetic biology' }
]

const blank = {
  name: '',
  reactants: 'CO₂ + H₂',
  products: 'CH₃OH + H₂O',
  temperature: '240°C',
  pressure: '50 bar',
  catalysisType: 'metal',
  sustainability: 'Green H₂',
  status: 'Active',
  notes: '',
  maxIterations: 3
}

export default function NewProjectDrawer({ open, onClose, onCreated }) {
  const { addProject } = useProjectStore()
  const { user } = useAuth()
  const creatorName = user?.name || 'Demo User'

  const [form, setForm] = useState(blank)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Reset whenever the drawer opens — fresh form every time.
  useEffect(() => {
    if (open) {
      setError(null)
      setSubmitting(false)
      setForm({ ...blank })
    }
  }, [open])

  // ESC closes the drawer.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Project name is required.')
      return
    }
    if (!form.reactants.trim() || !form.products.trim()) {
      setError('Reactants and products are required.')
      return
    }
    setError(null)
    setSubmitting(true)

    const maxIterations = Number(form.maxIterations) || 3

    const payload = {
      name: form.name.trim(),
      reactants: form.reactants.trim(),
      products: form.products.trim(),
      temp: form.temperature.trim(),
      pressure: form.pressure.trim(),
      catalysisType: form.catalysisType,
      creatorId: user?.email || '',
      sustainabilityTag: form.sustainability,
      status: form.status,
      notes: form.notes,
      maxIterations
    }

    try {
      const created = await projectApi.create(payload)
      if (!created?.id) {
        throw new Error('Project was created but the server did not return an id.')
      }
      const project = addProject({
        name: created?.name || form.name,
        reactants: created?.reactants || form.reactants,
        products: created?.products || form.products,
        target: `${created?.reactants || form.reactants} → ${created?.products || form.products}`,
        temperature: created?.temp || form.temperature,
        pressure: created?.pressure || form.pressure,
        catalysisType: created?.catalysisType || form.catalysisType,
        creator: creatorName,
        sustainability: created?.sustainabilityTag || form.sustainability,
        status: created?.status || form.status,
        notes: created?.notes ?? form.notes,
        remoteId: created.id,
        maxIterations
      })
      // Hand the parent the server-side id so it can route to the discovery
      // page — DiscoveryPage fetches via projectApi.get(id) which needs the
      // API id, not the local store's generated id.
      onCreated?.({ ...project, id: created.id })
    } catch (err) {
      setError(err?.message || 'Failed to create project.')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity z-40',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-[560px] surface-raised border-l border-ink-700/60 transition-transform duration-300 flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b divider-soft bg-ink-900/80 px-5 py-3 backdrop-blur shrink-0">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
              NEW PROJECT
            </div>
            <h2 className="text-base font-semibold text-ink-100">Create a project</h2>
          </div>
        </div>

        {/* Body */}
        <form
          id="new-project-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
        >
          <Field label="Project name" required>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. CO₂ → Methanol — Cu/Zn pathway"
              className={inputCls}
              autoFocus
            />
          </Field>

          <Section kicker="REACTION">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Reactants" required>
                <input
                  value={form.reactants}
                  onChange={(e) => set('reactants', e.target.value)}
                  placeholder="CO₂ + H₂"
                  className={`${inputCls} font-mono`}
                />
              </Field>
              <Field label="Products" required>
                <input
                  value={form.products}
                  onChange={(e) => set('products', e.target.value)}
                  placeholder="CH₃OH + H₂O"
                  className={`${inputCls} font-mono`}
                />
              </Field>
              <Field label="Temperature">
                <input
                  value={form.temperature}
                  onChange={(e) => set('temperature', e.target.value)}
                  placeholder="e.g. 240°C"
                  className={`${inputCls} font-mono`}
                />
              </Field>
              <Field label="Pressure">
                <input
                  value={form.pressure}
                  onChange={(e) => set('pressure', e.target.value)}
                  placeholder="e.g. 50 bar"
                  className={`${inputCls} font-mono`}
                />
              </Field>
            </div>

            <div className="mt-3 rounded-md border border-ink-700/60 bg-ink-900/60 px-3 py-2.5 font-mono text-sm">
              <div className="text-[10px] uppercase tracking-wider text-ink-400">Reaction preview</div>
              <div className="mt-1 text-ink-100">
                {form.reactants || '—'}
                <span className="text-cyan-300 mx-2">→</span>
                {form.products || '—'}
              </div>
              <div className="mt-1 text-[11px] text-ink-400">
                {form.temperature || '—'} · {form.pressure || '—'}
              </div>
            </div>
          </Section>

          <Section kicker="CATALYSIS">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Type" required>
                <select
                  value={form.catalysisType}
                  onChange={(e) => set('catalysisType', e.target.value)}
                  className={inputCls}
                >
                  {catalysisTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Max iterations" hint="Discovery loop will stop after this many cycles.">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={form.maxIterations}
                  onChange={(e) => set('maxIterations', e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </Field>
            </div>
          </Section>

          <Section kicker="OWNER">
            <Field label="Creator" hint="Logged-in user — assigned automatically. Anyone in the workspace (other than you) can review submissions later.">
              <div className="flex items-center gap-2 rounded-md bg-ink-900/60 px-3 py-2 ring-1 ring-inset ring-ink-700/60">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-cyan-400/15 text-cyan-200 text-[10px] font-mono ring-1 ring-cyan-400/30">
                  {user?.initials || 'DU'}
                </span>
                <span className="text-sm text-ink-100 truncate">{creatorName}</span>
              </div>
            </Field>
          </Section>

          <Section kicker="META">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Sustainability tag">
                <select
                  value={form.sustainability}
                  onChange={(e) => set('sustainability', e.target.value)}
                  className={inputCls}
                >
                  {sustainabilityOptions.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => set('status', e.target.value)}
                  className={inputCls}
                >
                  <option value="Active">Active</option>
                  <option value="On hold">On hold</option>
                </select>
              </Field>
              <Field label="Notes" full>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Optional context for the team."
                  className={inputCls}
                />
              </Field>
            </div>
          </Section>

          {error && (
            <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
              {error}
            </div>
          )}
        </form>

        {/* Footer (sticky) */}
        <div className="border-t divider-soft bg-ink-900/80 px-5 py-3 flex items-center justify-end gap-2 backdrop-blur shrink-0">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-project-form"
            variant="primary"
            size="sm"
            iconRight={ArrowRight}
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Create project'}
          </Button>
        </div>
      </aside>
    </>,
    document.body
  )
}

const inputCls =
  'w-full rounded-md bg-ink-900/60 px-3 py-2 text-sm text-ink-100 ring-1 ring-inset ring-ink-700/60 placeholder:text-ink-500 outline-none focus:ring-cyan-400/40'

function Field({ label, required, hint, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-400">
        {label}
        {required && <span className="ml-1 text-rose-300">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <div className="mt-1 text-[11px] text-ink-500">{hint}</div>}
    </div>
  )
}

function Section({ kicker, children }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80 mb-2.5">
        {kicker}
      </div>
      {children}
    </div>
  )
}
