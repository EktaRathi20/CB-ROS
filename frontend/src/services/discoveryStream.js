// SSE-over-POST client for /api/discovery/stream.
// EventSource only supports GET, so we use fetch + ReadableStream and parse
// the SSE wire format ourselves: each event is `data: <json>\n\n`.
//
// Usage:
//   const ctrl = streamDiscovery(payload, {
//     onEvent: (e) => …,   // every parsed event (step / log / result / error / done)
//     onError: (err) => …, // network or HTTP error
//     onAbort: () => …,    // user-cancelled
//     onClose: () => …     // stream closed cleanly (after `done` or EOF)
//   })
//   ctrl.abort() // cancel

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export function streamDiscovery(payload, handlers = {}) {
  const controller = new AbortController()

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream'
  }
  try {
    const raw = localStorage.getItem('cbros_auth_user')
    if (raw) {
      const user = JSON.parse(raw)
      if (user?.id) headers['X-User-Id'] = user.id
      if (user?.email) headers['X-User-Email'] = user.email
    }
  } catch {
    // ignore storage failures
  }

  ;(async () => {
    try {
      const res = await fetch(`${BASE_URL}/discovery/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      })

      if (!res.ok) {
        let detail = ''
        try {
          detail = (await res.text()).slice(0, 500)
        } catch {
          // ignore
        }
        throw new Error(`HTTP ${res.status}${detail ? ' – ' + detail : ''}`)
      }
      if (!res.body) throw new Error('Empty response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let idx
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const block = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const event = parseSseBlock(block)
          if (event) handlers.onEvent?.(event)
        }
      }
      // flush a trailing partial event, if any
      if (buffer.trim()) {
        const event = parseSseBlock(buffer)
        if (event) handlers.onEvent?.(event)
      }
      handlers.onClose?.()
    } catch (err) {
      if (err?.name === 'AbortError') {
        handlers.onAbort?.()
      } else {
        handlers.onError?.(err)
      }
    }
  })()

  return controller
}

function parseSseBlock(block) {
  const lines = block.split(/\r?\n/)
  const dataLines = []
  let eventName = null
  for (const line of lines) {
    if (!line || line.startsWith(':')) continue
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^\s/, ''))
    } else if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
    }
  }
  if (!dataLines.length) return null
  const data = dataLines.join('\n')
  let parsed
  try {
    parsed = JSON.parse(data)
  } catch {
    parsed = { raw: data }
  }
  // Allow either {type: 'step', ...} payloads or SSE `event: step` framing.
  if (eventName && !parsed.type) parsed.type = eventName
  return parsed
}
