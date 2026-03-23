import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Mail, ArrowLeft, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('If that email is registered, a reset link has been sent');
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {sent ? (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-700 dark:bg-emerald-900/20">
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Check your email for a password reset link. It expires in 1 hour.
            </p>
            <Link to="/login" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400">
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  className="input pl-10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <p className="text-center">
              <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
                <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
                Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
