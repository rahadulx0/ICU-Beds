import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Truck, CheckCircle2, Clock } from 'lucide-react';
import api from '../api/axios';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';

const PERIODS = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
];

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState('7d');
  const [requestStats, setRequestStats] = useState([]);
  const [responseTime, setResponseTime] = useState(null);
  const [hospitalStats, setHospitalStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/analytics/requests?period=${period}`),
      api.get(`/analytics/response-time?period=${period}`),
      api.get('/analytics/hospitals'),
    ])
      .then(([reqRes, rtRes, hospRes]) => {
        setRequestStats(reqRes.data);
        setResponseTime(rtRes.data);
        setHospitalStats(hospRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const totalRequests = requestStats.reduce((s, d) => s + d.total, 0);
  const totalCompleted = requestStats.reduce((s, d) => s + d.completed, 0);

  const chartData = requestStats.map((d) => ({
    ...d,
    date: format(parseISO(d._id), 'MMM dd'),
  }));

  const getUtilColor = (pct) => {
    if (pct > 80) return '#ef4444';
    if (pct > 50) return '#f59e0b';
    return '#10b981';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            System performance and utilization overview
          </p>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
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

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard
          title="Total Requests"
          value={totalRequests}
          icon={Truck}
          color="primary"
        />
        <StatsCard
          title="Completed"
          value={totalCompleted}
          subtitle={totalRequests > 0 ? `${Math.round((totalCompleted / totalRequests) * 100)}% completion rate` : undefined}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatsCard
          title="Avg Response Time"
          value={responseTime?.avgResponseMinutes != null ? `${responseTime.avgResponseMinutes} min` : 'N/A'}
          subtitle={responseTime?.sampleSize ? `Based on ${responseTime.sampleSize} requests` : undefined}
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Request Trends Chart */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          Ambulance Requests — Daily Breakdown
        </h3>
        {chartData.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            No request data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-gray-500 dark:fill-gray-400" />
              <YAxis tick={{ fontSize: 11 }} className="fill-gray-500 dark:fill-gray-400" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(31,41,55,0.95)',
                  borderColor: '#374151',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  color: '#f3f4f6',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="total" name="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cancelled" name="Cancelled" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Hospital Utilization Chart */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          Hospital Bed Utilization
        </h3>
        {hospitalStats.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            No hospital data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, hospitalStats.length * 44)}>
            <BarChart data={hospitalStats} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                className="fill-gray-500 dark:fill-gray-400"
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                className="fill-gray-500 dark:fill-gray-400"
                width={140}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(31,41,55,0.95)',
                  borderColor: '#374151',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  color: '#f3f4f6',
                }}
                formatter={(value) => [`${value}%`, 'Utilization']}
              />
              <Bar dataKey="utilization" name="Utilization" radius={[0, 4, 4, 0]}>
                {hospitalStats.map((entry) => (
                  <Cell key={entry._id} fill={getUtilColor(entry.utilization)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> &lt;50% utilized
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 50-80% utilized
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> &gt;80% utilized
          </span>
        </div>
      </div>
    </div>
  );
}
