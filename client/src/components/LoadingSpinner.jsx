import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ fullScreen, size = 'md' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  if (fullScreen) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className={`${sizes.lg} mx-auto animate-spin text-primary-600`} />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className={`${sizes[size]} animate-spin text-primary-600`} />
    </div>
  );
}
