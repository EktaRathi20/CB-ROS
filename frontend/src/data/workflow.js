// The 10-stage CB-ROS scientific loop.
// Used by the WorkflowLoop visualization on the landing page.

import {
  Atom,
  Cpu,
  Database,
  Download,
  FlaskConical,
  GitBranch,
  Microscope,
  ShieldCheck,
  Sparkles,
  TrendingUp
} from 'lucide-react'

export const workflowStages = [
  { n: 1,  id: 'input',    label: 'Reaction Input',          short: 'Input',     icon: Atom,         desc: 'Specify reactants, products, and conditions.' },
  { n: 2,  id: 'retrieve', label: 'Known Catalyst Retrieval', short: 'Retrieve',  icon: Database,    desc: 'Pull from PubChem, OCP, Materials Project, BRENDA.' },
  { n: 3,  id: 'generate', label: 'AI-Generated Designs',    short: 'Generate',  icon: Sparkles,     desc: 'Novel candidates with grounded rationale.' },
  { n: 4,  id: 'validate', label: 'Validation',              short: 'Validate',  icon: ShieldCheck,  desc: 'Applicability domain, sanity, physics-aware filters.' },
  { n: 5,  id: 'predict',  label: 'Predictive Scoring',      short: 'Predict',   icon: Cpu,          desc: 'Activity, selectivity, stability, Eₐ with uncertainty.' },
  { n: 6,  id: 'visualize',label: 'Visualization',           short: 'Visualize', icon: Microscope,   desc: '3D structure, energy profile, pathway.' },
  { n: 7,  id: 'export',   label: 'Export for Lab',          short: 'Export',    icon: Download,     desc: 'Lab-ready package: structure + recommended conditions.' },
  { n: 8,  id: 'log',      label: 'Experiment Logging',      short: 'Log',       icon: FlaskConical, desc: 'Capture lab outcomes alongside predictions.' },
  { n: 9,  id: 'compare',  label: 'Predicted vs Actual',     short: 'Compare',   icon: TrendingUp,   desc: 'Calibration & flagged underperformers.' },
  { n: 10, id: 'retrain',  label: 'Retraining from Failures',short: 'Retrain',   icon: GitBranch,    desc: 'Failures fuel the next iteration.' }
]

// Pull the project id out of a pathname like /app/projects/<id>/<seg>.
// '/app/projects/new' is the create-project form, not a project, so return
// null for it.
export function projectIdFromPath(pathname) {
  const m = pathname.match(/^\/app\/projects\/([^/]+)/)
  const id = m?.[1] ?? null
  return id && id !== 'new' ? id : null
}
