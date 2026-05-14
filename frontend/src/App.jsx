import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell.jsx'
import LandingPage from './pages/LandingPage.jsx'
import SignInPage from './pages/SignInPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ProjectsListPage from './pages/ProjectsListPage.jsx'
import ProjectDetailPage from './pages/ProjectDetailPage.jsx'
import DiscoveryPage from './pages/DiscoveryPage.jsx'
import RankingPage from './pages/RankingPage.jsx'
import VisualizationPage from './pages/VisualizationPage.jsx'
import ExperimentLogPage from './pages/ExperimentLogPage.jsx'
import FeedbackPage from './pages/FeedbackPage.jsx'
import ReviewAuditPage from './pages/ReviewAuditPage.jsx'
import ExperimentLibraryPage from './pages/ExperimentLibraryPage.jsx'
import NotificationsPage from './pages/NotificationsPage.jsx'
import RequireAuth from './auth/RequireAuth.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="library" element={<ExperimentLibraryPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="projects" element={<ProjectsListPage />} />
        <Route path="projects/new" element={<Navigate to="/app/projects" replace />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="projects/:id/discovery" element={<DiscoveryPage />} />
        <Route path="projects/:id/candidates" element={<RankingPage />} />
        <Route path="projects/:id/visualize" element={<VisualizationPage />} />
        <Route path="projects/:id/experiments" element={<ExperimentLogPage />} />
        <Route path="projects/:id/feedback" element={<Navigate to="/app/feedback" replace />} />
        <Route path="projects/:id/audit" element={<ReviewAuditPage />} />

        {/* Legacy redirects so old links still work */}
        <Route path="discovery" element={<Navigate to="/app/projects" replace />} />
        <Route path="ranking" element={<Navigate to="/app/projects" replace />} />
        <Route path="visualize" element={<Navigate to="/app/projects" replace />} />
        <Route path="experiments" element={<Navigate to="/app/projects" replace />} />
        <Route path="audit" element={<Navigate to="/app/projects" replace />} />
        <Route path="project/:id" element={<LegacyProjectRedirect />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// Old `/app/project/:id` route — redirect to the new `/app/projects/:id`.
import { useParams } from 'react-router-dom'
function LegacyProjectRedirect() {
  const { id } = useParams()
  return <Navigate to={`/app/projects/${id}`} replace />
}
