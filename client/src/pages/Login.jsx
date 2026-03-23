import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { login, clearError } from '../store/authSlice';
import { Activity, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, error } = useSelector((state) => state.auth);
  const { t } = useTranslation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, navigate, from]);

  useEffect(() => {
    return () => dispatch(clearError());
  }, [dispatch]);

  const validate = () => {
    const errors = {};
    if (!form.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!form.password) {
      errors.password = 'Password is required';
    } else if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const result = await dispatch(login(form));
    if (login.fulfilled.match(result)) {
      toast.success(`Welcome back, ${result.payload.name}!`);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{t('auth.welcomeBack')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('auth.signInTo')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
          )}

          <div>
            <label className="label">{t('auth.email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                className={`input pl-10 ${fieldErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' });
                }}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
            </div>
            {fieldErrors.email && (
              <p id="email-error" role="alert" className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="label">{t('auth.password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                className={`input pl-10 pr-10 ${fieldErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' });
                }}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" role="alert" className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              t('auth.signingIn')
            ) : (
              <>
                {t('auth.signIn')}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            {t('auth.forgotPassword')}
          </Link>
          <p className="text-gray-500 dark:text-gray-400">
            {t('auth.noAccount')}{' '}
            <Link to="/signup" className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
              {t('nav.signup')}
            </Link>
          </p>
        </div>

        {/* Demo accounts */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t('auth.demoAccounts')}
          </p>
          <div className="mt-2 space-y-1">
            {[
              { role: 'Admin', email: 'admin@icubeds.com', pw: 'admin123' },
              { role: 'Moderator', email: 'moderator@icubeds.com', pw: 'mod123' },
              { role: 'Rep', email: 'rep@icubeds.com', pw: 'rep123' },
              { role: 'Driver', email: 'driver@icubeds.com', pw: 'driver123' },
              { role: 'User', email: 'user@icubeds.com', pw: 'user123' },
            ].map((account) => (
              <button
                key={account.role}
                onClick={() => setForm({ email: account.email, password: account.pw })}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="w-16 font-medium text-gray-700 dark:text-gray-300">{account.role}</span>
                <span className="text-gray-500 dark:text-gray-400">{account.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
