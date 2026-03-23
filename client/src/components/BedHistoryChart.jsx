import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import api from '../api/axios';

const PERIODS = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
];

export default function BedHistoryChart({ hospitalId, hospitalName }) {
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospitalId) return;

    setLoading(true);
    api
      .get(`/analytics/bed-history/${hospitalId}?period=${period}`)
      .then((res) => {
        const formatted = res.data.map((d) => ({
          time: format(new Date(d.createdAt), period === '24h' ? 'HH:mm' : 'MMM dd'),
          available: d.available_icu_beds,
          occupied: d.total_icu_beds - d.available_icu_beds,
          total: d.total_icu_beds,
        }));
        setData(formatted);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [hospitalId, period]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {hospitalName ? `${hospitalName} — Bed History` : 'Bed History'}
        </h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                period === p.key
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          Loading...
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          No history data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11 }}
              className="fill-gray-500 dark:fill-gray-400"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="fill-gray-500 dark:fill-gray-400"
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tw-bg-opacity, #fff)',
                borderColor: '#e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area
              type="monotone"
              dataKey="available"
              name="Available"
              stackId="1"
              stroke="#059669"
              fill="#059669"
              fillOpacity={0.3}
            />
            <Area
              type="monotone"
              dataKey="occupied"
              name="Occupied"
              stackId="1"
              stroke="#dc2626"
              fill="#dc2626"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
