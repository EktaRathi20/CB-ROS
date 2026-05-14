import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import StatusChip from '../components/ui/StatusChip.jsx'
import Tabs from '../components/ui/Tabs.jsx'
import ReactionInputPanel from '../components/domain/ReactionInputPanel.jsx'
import DiscoveryStreamPipeline from '../components/domain/DiscoveryStreamPipeline.jsx'
import { ProcessingComplete } from '../components/domain/ProcessingPipeline.jsx'
import { streamDiscovery } from '../services/discoveryStream.js'
import { mapApiProject, projectApi } from '../services/api.js'

export default function DiscoveryPage() {
  const navigate = useNavigate()
  const { id: projectId } = useParams()

  const [project, setProject] = useState(null)
  const [mode, setMode] = useState('chem')

  // 'idle' before user runs, 'running' during stream, 'done' once it closes,
  // 'error' if it failed.
  const [phase, setPhase] = useState('idle')
  const [steps, setSteps] = useState([])
  const [logs, setLogs] = useState([])
  const [results, setResults] = useState([])
  const [requestedCount, setRequestedCount] = useState(null)
  const [streamError, setStreamError] = useState(null)
  const [elapsed, setElapsed] = useState(0)

  const streamCtrlRef = useRef(null)
  const startedAtRef = useRef(null)
  const tickerRef = useRef(null)
  const resultsRef = useRef(null)

  // Load project info so we can pre-fill reaction defaults & show the title.
  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    projectApi
      .get(projectId)
      .then((data) => {
        if (!cancelled) setProject(mapApiProject(data))
      })
      .catch(() => {
        if (!cancelled) setProject(null)
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Drive the elapsed-time counter while the stream is running.
  useEffect(() => {
    if (phase !== 'running') {
      if (tickerRef.current) {
        clearInterval(tickerRef.current)
        tickerRef.current = null
      }
      return
    }
    startedAtRef.current = Date.now()
    setElapsed(0)
    tickerRef.current = setInterval(() => {
      if (startedAtRef.current) {
        setElapsed((Date.now() - startedAtRef.current) / 1000)
      }
    }, 200)
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current)
    }
  }, [phase])

  // Abort the stream if the page unmounts mid-run.
  useEffect(() => {
    return () => {
      streamCtrlRef.current?.abort()
    }
  }, [])

  const resetState = () => {
    setSteps([])
    setLogs([])
    setResults([])
    setRequestedCount(null)
    setStreamError(null)
    setPhase('idle')
  }

  const handleEvent = (event) => {
    // Defensive shape detection — the API spec lists event types
    // step / log / result / error / done.
    const type = (event.type || event.event || '').toLowerCase()

    if (type === 'step') {
      const id = event.id || event.step?.id || event.name || event.step?.name
      const name = event.name || event.step?.name || id || 'step'
      const status = (event.status || event.step?.status || 'running').toLowerCase()
      const detail = event.detail || event.message || ''
      setSteps((prev) => {
        const idx = prev.findIndex((s) => (s.id || s.name) === (id || name))
        if (idx === -1) {
          return [...prev, { id, name, status, detail }]
        }
        const next = prev.slice()
        next[idx] = { ...next[idx], status, detail: detail || next[idx].detail }
        return next
      })
      return
    }

    if (type === 'log') {
      const text = event.message || event.text || event.raw || ''
      const level = event.level || (event.error ? 'error' : 'info')
      setLogs((prev) => [
        ...prev,
        {
          id: `log-${prev.length}-${Date.now()}`,
          text: String(text),
          level,
          t: event.t || Date.now()
        }
      ])
      return
    }

    if (type === 'result') {
      const candidate = event.candidate || event.result || event.data || event
      setResults((prev) => [...prev, candidate])
      // Echo into the console so the user sees results streaming in.
      const formula = candidate?.formula || candidate?.name || candidate?.id
      if (formula) {
        setLogs((prev) => [
          ...prev,
          {
            id: `res-${prev.length}-${Date.now()}`,
            text: `result · ${formula}`,
            level: 'info',
            t: Date.now()
          }
        ])
      }
      return
    }

    if (type === 'error') {
      const message = event.message || event.error || 'Stream reported an error.'
      setStreamError(String(message))
      setLogs((prev) => [
        ...prev,
        {
          id: `err-${prev.length}-${Date.now()}`,
          text: String(message),
          level: 'error',
          t: Date.now()
        }
      ])
      return
    }

    if (type === 'done') {
      // Mark any still-running step as done.
      setSteps((prev) =>
        prev.map((s) => (s.status === 'running' ? { ...s, status: 'done' } : s))
      )
      setPhase('done')
      return
    }
  }

  const start = (input) => {
    if (!projectId) return
    resetState()
    setRequestedCount(input?.count ?? null)
    setPhase('running')
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)

    const reactionInput =
      input?.reactionInput?.trim() ||
      `${project?.reactants || ''} -> ${project?.products || ''}`.trim()

    const conditions =
      input?.conditions && Object.keys(input.conditions).length > 0
        ? input.conditions
        : project?.temperature || project?.pressure
        ? {
            ...(project.temperature ? { temp: project.temperature } : {}),
            ...(project.pressure ? { pressure: project.pressure } : {})
          }
        : {}

    const payload = {
      projectId,
      count: input?.count ?? 5,
      reactionInput,
      conditions
    }

    streamCtrlRef.current = streamDiscovery(payload, {
      onEvent: handleEvent,
      onError: (err) => {
        setStreamError(err?.message || 'Stream failed.')
        setPhase('error')
      },
      onAbort: () => {
        // user clicked Cancel
        setPhase('idle')
      },
      onClose: () => {
        // If the server never sent a `done` event, infer completion when the
        // stream closes cleanly (and there was no error).
        setPhase((prev) => {
          if (prev === 'running') return 'done'
          return prev
        })
        setSteps((prev) =>
          prev.map((s) => (s.status === 'running' ? { ...s, status: 'done' } : s))
        )
      }
    })
  }

  const cancel = () => {
    streamCtrlRef.current?.abort()
    streamCtrlRef.current = null
  }

  const reset = () => {
    streamCtrlRef.current?.abort()
    streamCtrlRef.current = null
    resetState()
  }

  return (
    <div>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
              DISCOVERY ENGINE
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {project?.name || 'From reaction sketch to candidate set.'}
            </h1>
            <p className="mt-1 text-sm text-ink-300 max-w-2xl">
              {project
                ? `Discovery for ${project.target}. Each run streams candidates from the model in real time.`
                : 'Define your reaction; CB-ROS retrieves known catalysts and generates novel candidates with rationale grounded in primary scientific sources.'}
            </p>
          </div>
          <Tabs
            value={mode}
            onChange={setMode}
            tabs={[
              { id: 'chem', label: 'Chemical Catalysis' },
              { id: 'bio', label: 'Synthetic Biology' }
            ]}
          />
        </div>

        <ReactionInputPanel
          initial={
            project
              ? {
                  reactants: project.reactants,
                  products: project.products,
                  temperature: project.temperature,
                  pressure: project.pressure
                }
              : undefined
          }
          onRun={start}
          running={phase === 'running'}
        />

        {/* Pipeline / results region */}
        <div ref={resultsRef} className="space-y-6 scroll-mt-20">
          {phase === 'running' && (
            <DiscoveryStreamPipeline
              steps={steps}
              logs={logs}
              resultCount={results.length}
              expectedCount={requestedCount}
              elapsed={elapsed}
              onCancel={cancel}
            />
          )}

          {phase === 'error' && (
            <DiscoveryStreamPipeline
              steps={steps}
              logs={logs}
              resultCount={results.length}
              expectedCount={requestedCount}
              error={streamError}
              elapsed={elapsed}
              onCancel={null}
            />
          )}

          {phase === 'done' && (
            <ProcessingComplete
              summary={
                results.length > 0
                  ? `${results.length} candidate${results.length === 1 ? '' : 's'} generated for this project`
                  : 'Discovery stream completed'
              }
              onView={() => navigate(`/app/projects/${projectId}/candidates`)}
              onAgain={reset}
            />
          )}

          {phase === 'idle' && (
            <div className="surface relative overflow-hidden p-6">
              <div className="pointer-events-none absolute inset-0 bg-grid-faint bg-[length:24px_24px] opacity-30" />
              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
                    READY
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-ink-100">
                    Pipeline armed · click <span className="text-cyan-300">Run discovery</span>{' '}
                    to stream candidates from the model
                  </h3>
                  <p className="mt-1 text-[12px] text-ink-400">
                    Steps and log lines appear here live as the server emits them. Generated
                    candidates land on the Candidates tab.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip dot tone="cyan">live stream</StatusChip>
                  <StatusChip>SSE</StatusChip>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
