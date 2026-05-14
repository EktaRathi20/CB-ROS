import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Lock, Save, X } from 'lucide-react'
import Button from '../ui/Button.jsx'
import { useAuth } from '../../auth/AuthContext.jsx'
import { mapApiProject, projectApi } from '../../services/api.js'
import { cn } from '../../lib/cn.js'

const sustainabilityOptions = [
  'Green H₂',
  'Blue H₂',
  'Bio-feedstock',
  'Plastic upcycling',
  'CO₂ utilization',
  'Other'
]

export default function EditProjectDrawer({ open, project, onClose, onSaved }) {
  const { user } = useAuth()

  const [form, setForm] = useState(() => makeForm(project))
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && project) {
      setError(null)
      setSubmitting(false)
      setForm(makeForm(project))
    }
  }, [open, project])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, submitting])

  if (!project) return null

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Project name is required.')
      return
    }
    setError(null)
    setSubmitting(true)

    const payload = {
      name: form.name.trim(),
      temp: form.temperature,
      pressure: form.pressure,
      sustainabilityTag: form.sustainability,
      status: form.status,
      notes: form.notes,
      maxIterations: Math.max(1, Number(form.maxIterations) || 1),
      creatorId: user?.id || user?.email || ''
    }

    try {
      const updated = await projectApi.update(project.id, payload)
      const mapped = updated ? mapApiProject(updated) : null
      onSaved?.(mapped || { id: project.id, ...payload })
    } catch (err) {
      setError(err?.message || 'Failed to save project.')
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
        onClick={submitting ? undefined : onClose}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-[560px] surface-raised border-l border-ink-700/60 transition-transform duration-300 flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b divider-soft bg-ink-900/80 px-5 py-3 backdrop-blur shrink-0">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
              EDIT PROJECT
            </div>
            <h2 className="text-base font-semibold text-ink-100 truncate max-w-[40ch]">{project.name}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-md p-1.5 text-ink-300 hover:bg-ink-800 hover:text-ink-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          id="edit-project-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
        >
          <Field label="Project name" required>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              disabled={submitting}
              className={inputCls}
            />
          </Field>

          <Section
            kicker="REACTION"
            hint="Reactants and products are locked — they define the project's identity."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Reactants">
                <div className="flex items-center gap-1.5">
                  <input
                    value={form.reactants}
                    disabled
                    className={`${inputCls} font-mono opacity-60 cursor-not-allowed`}
                  />
                  <Lock className="h-3.5 w-3.5 text-ink-500 shrink-0" />
                </div>
              </Field>
              <Field label="Products">
                <div className="flex items-center gap-1.5">
                  <input
                    value={form.products}
                    disabled
                    className={`${inputCls} font-mono opacity-60 cursor-not-allowed`}
                  />
                  <Lock className="h-3.5 w-3.5 text-ink-500 shrink-0" />
                </div>
              </Field>
              <Field label="Temperature">
                <input
                  value={form.temperature}
                  onChange={(e) => set('temperature', e.target.value)}
                  disabled={submitting}
                  className={`${inputCls} font-mono`}
                />
              </Field>
              <Field label="Pressure">
                <input
                  value={form.pressure}
                  onChange={(e) => set('pressure', e.target.value)}
                  disabled={submitting}
                  className={`${inputCls} font-mono`}
                />
              </Field>
            </div>
          </Section>

          <Section kicker="META">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Sustainability tag">
                <select
                  value={form.sustainability}
                  onChange={(e) => set('sustainability', e.target.value)}
                  disabled={submitting}
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
                  disabled={submitting}
                  className={inputCls}
                >
                  <option value="Active">Active</option>
                  <option value="On hold">On hold</option>
                </select>
              </Field>
              <Field label="Max iterations" hint="Discovery loop will stop after this many cycles.">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={form.maxIterations}
                  onChange={(e) => set('maxIterations', e.target.value)}
                  disabled={submitting}
                  className={`${inputCls} font-mono`}
                />
              </Field>
              <Field label="Notes" full>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  disabled={submitting}
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

        <div className="border-t divider-soft bg-ink-900/80 px-5 py-3 flex items-center justify-end gap-2 backdrop-blur shrink-0">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-project-form"
            variant="primary"
            size="sm"
            icon={Save}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </aside>
    </>,
    document.body
  )
}

function makeForm(project) {
  return {
    name: project?.name || '',
    reactants: project?.reactants || '',
    products: project?.products || '',
    temperature: project?.temperature || '',
    pressure: project?.pressure || '',
    sustainability: project?.sustainability || 'Green H₂',
    status: project?.status || 'Active',
    notes: project?.notes || '',
    maxIterations: project?.maxIterations || 3
  }
}

const inputCls =
  'w-full rounded-md bg-ink-900/60 px-3 py-2 text-sm text-ink-100 ring-1 ring-inset ring-ink-700/60 placeholder:text-ink-500 outline-none focus:ring-cyan-400/40 disabled:opacity-60 disabled:cursor-not-allowed'

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

function Section({ kicker, hint, children }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80 mb-1">
        {kicker}
      </div>
      {hint && <div className="text-[11px] text-ink-400 mb-2.5">{hint}</div>}
      {!hint && <div className="mb-2.5" />}
      {children}
    </div>
  )
}
