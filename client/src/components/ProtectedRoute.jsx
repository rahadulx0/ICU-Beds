import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function PendingApprovalScreen() {
  const { logout, userData } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Account Pending Approval</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
          Your account has been created successfully, but it needs to be approved by an administrator before you can access the dashboard.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
          Role: <span className="font-medium capitalize text-slate-600 dark:text-slate-300">{userData?.role || 'rep'}</span>
        </p>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-6">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">What happens next?</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">An admin will review your account and approve it. You'll be able to access the dashboard once approved.</p>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children, roles }) {
  const { user, userData, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" />

  if (userData?.status === 'pending') {
    return <PendingApprovalScreen />
  }

  if (roles && userData && !roles.includes(userData.role)) {
    return <Navigate to="/" />
  }

  return children
}
