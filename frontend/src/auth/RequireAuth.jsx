import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

// Route guard: anything wrapped in this redirects to /signin when no user.
// We pass the original location so SignInPage can return the user there.
export default function RequireAuth({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />
  }
  return children
}
