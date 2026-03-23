import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/axios';
import LoadingSpinner from '../components/LoadingSpinner';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'hospital.create', label: 'Hospital Created' },
  { value: 'hospital.update', label: 'Hospital Updated' },
  { value: 'hospital.delete', label: 'Hospital Deleted' },
  { value: 'hospital.bed_update', label: 'Bed Updated' },
  { value: 'hospital.assign', label: 'Staff Assigned' },
  { value: 'hospital.unassign', label: 'Staff Unassigned' },
  { value: 'user.role_change', label: 'Role Changed' },
  { value: 'user.deactivate', label: 'User Deactivated' },
  { value: 'user.activate', label: 'User Activated' },
  { value: 'ambulance.request', label: 'Ambulance Requested' },
  { value: 'ambulance.accept', label: 'Request Accepted' },
  { value: 'ambulance.status_change', label: 'Status Changed' },
  { value: 'ambulance.cancel', label: 'Request Cancelled' },
];

const RESOURCE_OPTIONS = [
  { value: '', label: 'All Resources' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'user', label: 'User' },
  { value: 'ambulance_request', label: 'Ambulance Request' },
];

const actionColors = {
  'hospital.create': 'badge-green',
  'hospital.update': 'badge-blue',
  'hospital.delete': 'badge-red',
  'hospital.bed_update': 'badge-yellow',
  'hospital.assign': 'badge-blue',
  'hospital.unassign': 'badge-gray',
  'user.role_change': 'badge-blue',
  'user.deactivate': 'badge-red',
  'user.activate': 'badge-green',
  'ambulance.request': 'badge-yellow',
  'ambulance.accept': 'badge-green',
  'ambulance.status_change': 'badge-blue',
  'ambulance.cancel': 'badge-red',
};

function formatDetails(details) {
  if (!details || Object.keys(details).length === 0) return '—';
  return Object.entries(details)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/audit', {
        params: {
          page,
          limit: 30,
          action: actionFilter || undefined,
          resource_type: resourceFilter || undefined,
        },
      })
      .then(({ data }) => {
        setLogs(data.logs);
        setPagination(data.pagination);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [page, actionFilter, resourceFilter]);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">System activity and change history</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <select
          value={actionFilter}
          onChange={handleFilterChange(setActionFilter)}
          className="input max-w-xs"
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={resourceFilter}
          onChange={handleFilterChange(setResourceFilter)}
          className="input max-w-xs"
        >
          {RESOURCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">No audit logs found</div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Timestamp</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actor</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Action</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Resource</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Details</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(log.createdAt), 'MMM dd, HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{log.actor?.name || 'System'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{log.actor?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={actionColors[log.action] || 'badge-gray'}>{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {log.resource_type}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-xs text-gray-500 dark:text-gray-400" title={formatDetails(log.details)}>
                      {formatDetails(log.details)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {logs.map((log) => (
              <div key={log._id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{log.actor?.name || 'System'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{log.actor?.email}</p>
                  </div>
                  <span className={actionColors[log.action] || 'badge-gray'}>{log.action}</span>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <p>{log.resource_type} — {formatDetails(log.details)}</p>
                  <p className="mt-1">{format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {pagination.page} of {pagination.pages} ({pagination.total} entries)
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary p-2 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                  className="btn-secondary p-2 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
