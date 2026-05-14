import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'cbros_user_projects'
const PICKS_STORAGE_KEY = 'cbros_project_picks'
const PROJECT_DATA_KEY = 'cbros_project_data_v2'

const ProjectStoreContext = createContext(null)

export function ProjectStoreProvider({ children }) {
  const [userProjects, setUserProjects] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const [picks, setPicks] = useState(() => {
    try {
      const raw = localStorage.getItem(PICKS_STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  const [projectData, setProjectData] = useState(() => {
    try {
      const raw = localStorage.getItem(PROJECT_DATA_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(userProjects)) } catch {}
  }, [userProjects])
  useEffect(() => {
    try { localStorage.setItem(PICKS_STORAGE_KEY, JSON.stringify(picks)) } catch {}
  }, [picks])
  useEffect(() => {
    try { localStorage.setItem(PROJECT_DATA_KEY, JSON.stringify(projectData)) } catch {}
  }, [projectData])

  const addProject = useCallback((data) => {
    const id = `p-${Date.now().toString(36)}`
    const project = {
      id,
      name: data.name?.trim() || 'Untitled project',
      target: data.target || `${data.reactants ?? ''} → ${data.products ?? ''}`,
      reactants: data.reactants || '',
      products: data.products || '',
      temperature: data.temperature || '',
      pressure: data.pressure || '',
      catalysisType: data.catalysisType || 'metal',
      status: data.status || 'Active',
      stage: 'Discovery',
      progress: 0,
      candidates: 0,
      validated: 0,
      leadPI: data.creator || '',
      sustainability: data.sustainability || 'Green H₂',
      notes: data.notes || '',
      lastActivity: 'just now',
      createdAt: new Date().toISOString(),
      isUserCreated: true
    }
    setUserProjects((prev) => [project, ...prev])
    setProjectData((prev) => ({
      ...prev,
      [id]: {
        candidates: [],
        runs: [],
        visualizeId: null,
        currentVersion: { major: 1, minor: 0 }
      }
    }))
    return project
  }, [])

  const togglePick = useCallback((projectId, candidateId) => {
    if (!projectId || !candidateId) return
    setPicks((prev) => {
      const list = prev[projectId] || []
      const next = list.includes(candidateId)
        ? list.filter((id) => id !== candidateId)
        : [...list, candidateId]
      return { ...prev, [projectId]: next }
    })
  }, [])

  const clearPicks = useCallback((projectId) => {
    if (!projectId) return
    setPicks((prev) => ({ ...prev, [projectId]: [] }))
  }, [])

  const selectVisualize = useCallback((projectId, candidateId) => {
    if (!projectId) return
    setProjectData((prev) => {
      const cur = prev[projectId] || { candidates: [], runs: [], visualizeId: null, currentVersion: { major: 1, minor: 0 } }
      return {
        ...prev,
        [projectId]: { ...cur, visualizeId: candidateId || null }
      }
    })
  }, [])

  const value = useMemo(
    () => ({
      projects: userProjects,
      picks,
      projectData,
      addProject,
      togglePick,
      clearPicks,
      selectVisualize
    }),
    [
      userProjects,
      picks,
      projectData,
      addProject,
      togglePick,
      clearPicks,
      selectVisualize
    ]
  )

  return <ProjectStoreContext.Provider value={value}>{children}</ProjectStoreContext.Provider>
}

export function useProjectStore() {
  const ctx = useContext(ProjectStoreContext)
  if (!ctx) throw new Error('useProjectStore must be used inside ProjectStoreProvider')
  return ctx
}

export function useProjects() {
  return useProjectStore().projects
}

export function useProjectPicks(projectId) {
  const { picks } = useProjectStore()
  return useMemo(() => picks[projectId] || [], [picks, projectId])
}

export function useProjectCandidates(projectId) {
  const { projectData } = useProjectStore()
  return useMemo(
    () => projectData[projectId]?.candidates ?? [],
    [projectData, projectId]
  )
}

export function useProjectRuns(projectId) {
  const { projectData } = useProjectStore()
  return useMemo(
    () => projectData[projectId]?.runs ?? [],
    [projectData, projectId]
  )
}

export function useProjectVersion(projectId) {
  const { projectData } = useProjectStore()
  return projectData[projectId]?.currentVersion ?? { major: 1, minor: 0 }
}

export function useVisualizeId(projectId) {
  const { projectData } = useProjectStore()
  return projectData[projectId]?.visualizeId ?? null
}

// Display helper: V{major}.{minor}
export function formatVersion(v) {
  if (!v) return ''
  if (typeof v === 'number') return `V1.${v}` // legacy fallback
  if (typeof v === 'object' && 'major' in v) return `V${v.major}.${v.minor}`
  return String(v)
}
