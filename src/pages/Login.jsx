import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/25">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign in to manage ICU beds</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-400"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-400"
                placeholder="Enter your password" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-lg shadow-blue-600/25">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
