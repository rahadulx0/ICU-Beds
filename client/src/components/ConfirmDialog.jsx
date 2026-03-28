import { AlertTriangle, Info, X } from 'lucide-react';

const variants = {
  danger: {
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    button: 'btn-danger',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    button: 'btn-primary',
  },
  info: {
    icon: Info,
    iconColor: 'text-primary-500',
    iconBg: 'bg-primary-100 dark:bg-primary-900/30',
    button: 'btn-primary',
  },
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!isOpen) return null;

  const v = variants[variant] || variants.danger;
  const Icon = v.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 modal-overlay p-0 sm:p-4">
      <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-2xl dark:bg-gray-800 bottom-sheet sm:modal-content">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${v.iconBg}`}>
            <Icon className={`h-5 w-5 ${v.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 active:scale-95 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1" disabled={loading}>
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`${v.button} flex-1`} disabled={loading}>
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
