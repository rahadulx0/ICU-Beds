import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const roles = [
  {
    value: 'rep',
    label: 'Hospital Representative',
    desc: 'Update bed counts for your assigned hospital',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
      </svg>
    ),
    color: 'emerald'
  },
  {
    value: 'moderator',
    label: 'Moderator',
    desc: 'Manage hospitals in your assigned region',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    color: 'amber'
  },
  {
    value: 'admin',
    label: 'Admin',
    desc: 'Full access to manage hospitals and users',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
      </svg>
    ),
    color: 'red'
  }
]

const colorMap = {
  emerald: {
    selected: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 ring-2 ring-emerald-500/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500'
  },
  amber: {
    selected: 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 ring-2 ring-amber-500/20',
    icon: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500'
  },
  red: {
    selected: 'border-red-500 bg-red-50 dark:bg-red-500/10 ring-2 ring-red-500/20',
    icon: 'text-red-600 dark:text-red-400',
    dot: 'bg-red-500'
  }
}

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('rep')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [adminCount, setAdminCount] = useState(0)
  const { signup, getAdminCount } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    getAdminCount().then(setAdminCount)
  }, [])

  const adminLimitReached = adminCount >= 2

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) return setError('Passwords do not match')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (role === 'admin' && adminLimitReached) return setError('Maximum of 2 admin accounts allowed.')

    setLoading(true)
    try {
      await signup(email, password, role, fullName)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/25">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Join ICU Beds to help track bed availability</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200 dark:border-slate-700 p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2.5">Account Type</label>
              <div className="space-y-2.5">
                {roles.map(r => {
                  const c = colorMap[r.color]
                  const isDisabled = r.value === 'admin' && adminLimitReached
                  const isSelected = role === r.value
                  return (
                    <button
                      key={r.value}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => !isDisabled && setRole(r.value)}
                      className={`w-full flex items-start gap-3.5 p-3.5 rounded-xl border text-left transition-all ${
                        isDisabled
                          ? 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50'
                          : isSelected
                            ? c.selected
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer'
                      }`}
                    >
                      <div className={`mt-0.5 shrink-0 ${isSelected ? c.icon : 'text-slate-400 dark:text-slate-500'}`}>{r.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>{r.label}</span>
                          {isDisabled && <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">LIMIT REACHED</span>}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.desc}</p>
                      </div>
                      <div className={`mt-1 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? `border-current ${c.icon}` : 'border-slate-300 dark:border-slate-600'}`}>
                        {isSelected && <div className={`w-2 h-2 rounded-full ${c.dot}`} />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-400" placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-400" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-400" placeholder="At least 6 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm Password</label>
              <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-400" placeholder="Confirm your password" />
            </div>

            <button type="submit" disabled={loading} className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-lg shadow-blue-600/25">
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
