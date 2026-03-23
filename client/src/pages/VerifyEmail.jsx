import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { CheckCircle2, XCircle, Activity } from 'lucide-react';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const verify = async () => {
      try {
        await api.get(`/auth/verify-email/${token}`);
        setStatus('success');
      } catch {
        setStatus('error');
      }
    };
    if (token) verify();
  }, [token]);

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600 dark:border-gray-700" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">Verifying your email...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Email Verified!</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Your email has been successfully verified. You can now access all features.
            </p>
            <Link to="/dashboard" className="btn-primary mt-6 inline-flex">
              Go to Dashboard
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Verification Failed</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              This verification link is invalid or has expired.
            </p>
            <Link to="/login" className="btn-primary mt-6 inline-flex">
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
