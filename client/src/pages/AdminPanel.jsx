import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchHospitals,
  createHospital,
  deleteHospital,
  updateHospital,
} from '../store/hospitalSlice';
import api from '../api/axios';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Map from '../components/Map';
import {
  Hospital,
  Users,
  Bed,
  Truck,
  Plus,
  Trash2,
  Edit3,
  X,
  Shield,
  UserCheck,
  Activity,
  UserPlus,
  UserMinus,
  Download,
  Map as MapIcon,
  List,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportCsv } from '../utils/exportCsv';

export default function AdminPanel() {
  const dispatch = useDispatch();
  const { list: hospitals, loading } = useSelector((state) => state.hospitals);
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [ambulanceStats, setAmbulanceStats] = useState(null);
  const [tab, setTab] = useState('hospitals');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingHospital, setEditingHospital] = useState(null);
  const [assigningHospital, setAssigningHospital] = useState(null);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [hospitalView, setHospitalView] = useState('list'); // 'list' | 'map'
  const [hospitalForm, setHospitalForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    total_icu_beds: '',
    available_icu_beds: '',
    contact: { phone: '', email: '' },
  });

  useEffect(() => {
    dispatch(fetchHospitals());
    fetchUsers();
    fetchStats();
  }, [dispatch]);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch (err) {
      toast.error('Failed to fetch users');
    }
  };

  const fetchStats = async () => {
    try {
      const [userRes, ambRes] = await Promise.all([
        api.get('/users/stats'),
        api.get('/ambulance/stats'),
      ]);
      setUserStats(userRes.data);
      setAmbulanceStats(ambRes.data);
    } catch {
      // Non-critical
    }
  };

  const totalBeds = hospitals.reduce((s, h) => s + h.total_icu_beds, 0);
  const availableBeds = hospitals.reduce((s, h) => s + h.available_icu_beds, 0);

  const handleCreateHospital = async (e) => {
    e.preventDefault();
    const result = await dispatch(
      createHospital({
        ...hospitalForm,
        latitude: parseFloat(hospitalForm.latitude),
        longitude: parseFloat(hospitalForm.longitude),
        total_icu_beds: parseInt(hospitalForm.total_icu_beds),
        available_icu_beds: parseInt(hospitalForm.available_icu_beds),
      })
    );
    if (createHospital.fulfilled.match(result)) {
      toast.success('Hospital created');
      setShowCreateModal(false);
      resetForm();
    } else {
      toast.error(result.payload || 'Failed to create hospital');
    }
  };

  const handleUpdateHospital = async (e) => {
    e.preventDefault();
    const result = await dispatch(
      updateHospital({
        id: editingHospital._id,
        updates: {
          ...hospitalForm,
          latitude: parseFloat(hospitalForm.latitude),
          longitude: parseFloat(hospitalForm.longitude),
          total_icu_beds: parseInt(hospitalForm.total_icu_beds),
          available_icu_beds: parseInt(hospitalForm.available_icu_beds),
        },
      })
    );
    if (updateHospital.fulfilled.match(result)) {
      toast.success('Hospital updated');
      setEditingHospital(null);
      resetForm();
    } else {
      toast.error(result.payload || 'Failed to update hospital');
    }
  };

  const handleDeleteHospital = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const result = await dispatch(deleteHospital(id));
    if (deleteHospital.fulfilled.match(result)) {
      toast.success('Hospital deleted');
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/users/${userId}/role`, { role });
      toast.success('Role updated');
      fetchUsers();
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleStatusChange = async (userId, is_active) => {
    try {
      await api.put(`/users/${userId}/status`, { is_active });
      toast.success(`User ${is_active ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const openAssignModal = async (hospital) => {
    setAssigningHospital(hospital);
    setAssignLoading(true);
    try {
      const { data } = await api.get(`/hospitals/${hospital._id}`);
      setAssignedUsers(data.managed_by || []);
    } catch {
      toast.error('Failed to load assignments');
    }
    setAssignLoading(false);
  };

  const handleAssign = async (userId) => {
    try {
      await api.put(`/hospitals/${assigningHospital._id}/assign`, { userId });
      const { data } = await api.get(`/hospitals/${assigningHospital._id}`);
      setAssignedUsers(data.managed_by || []);
      toast.success('User assigned');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign user');
    }
  };

  const handleUnassign = async (userId) => {
    try {
      await api.put(`/hospitals/${assigningHospital._id}/unassign`, { userId });
      const { data } = await api.get(`/hospitals/${assigningHospital._id}`);
      setAssignedUsers(data.managed_by || []);
      toast.success('User unassigned');
      fetchUsers();
    } catch {
      toast.error('Failed to unassign user');
    }
  };

  const resetForm = () => {
    setHospitalForm({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      total_icu_beds: '',
      available_icu_beds: '',
      contact: { phone: '', email: '' },
    });
  };

  const handleMapAddHospital = (coords) => {
    setHospitalForm({
      name: '',
      address: '',
      latitude: coords.lat.toFixed(6),
      longitude: coords.lng.toFixed(6),
      total_icu_beds: '',
      available_icu_beds: '',
      contact: { phone: '', email: '' },
    });
    setShowCreateModal(true);
  };

  const startEdit = (hospital) => {
    setEditingHospital(hospital);
    setHospitalForm({
      name: hospital.name,
      address: hospital.address,
      latitude: hospital.location.coordinates[1].toString(),
      longitude: hospital.location.coordinates[0].toString(),
      total_icu_beds: hospital.total_icu_beds.toString(),
      available_icu_beds: hospital.available_icu_beds.toString(),
      contact: hospital.contact || { phone: '', email: '' },
    });
  };

  const roleColors = {
    admin: 'badge-red',
    moderator: 'badge-blue',
    hospital_rep: 'badge-yellow',
    driver: 'badge-green',
    user: 'badge-gray',
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 stagger-in">
        <StatsCard
          title="Total Hospitals"
          value={hospitals.length}
          icon={Hospital}
          color="primary"
        />
        <StatsCard
          title="Available ICU Beds"
          value={availableBeds}
          subtitle={`of ${totalBeds} total`}
          icon={Bed}
          color="emerald"
        />
        <StatsCard
          title="Total Users"
          value={userStats?.total || 0}
          icon={Users}
          color="violet"
        />
        <StatsCard
          title="Requests Today"
          value={ambulanceStats?.todayCount || 0}
          subtitle={`${ambulanceStats?.total || 0} total`}
          icon={Truck}
          color="amber"
        />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'hospitals', label: 'Hospitals', icon: Hospital },
          { key: 'users', label: 'Users', icon: Users },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Hospitals Tab */}
      {tab === 'hospitals' && (
        <div className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">{hospitals.length} hospitals</p>
            <div className="flex gap-2">
              {/* List / Map toggle */}
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <button
                  onClick={() => setHospitalView('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    hospitalView === 'list'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  List
                </button>
                <button
                  onClick={() => setHospitalView('map')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                    hospitalView === 'map'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  <MapIcon className="h-3.5 w-3.5" />
                  Map
                </button>
              </div>
              <button
                onClick={() =>
                  exportCsv(
                    hospitals,
                    [
                      { key: 'name', header: 'Name' },
                      { key: 'address', header: 'Address' },
                      { key: 'total_icu_beds', header: 'Total ICU Beds' },
                      { key: 'available_icu_beds', header: 'Available ICU Beds' },
                      { key: 'contact.phone', header: 'Phone' },
                      { key: 'contact.email', header: 'Email' },
                    ],
                    'hospitals.csv'
                  )
                }
                className="btn-secondary text-sm"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <button onClick={() => setShowCreateModal(true)} className="btn-primary text-sm">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Hospital</span>
              </button>
            </div>
          </div>

          {/* Map View */}
          {hospitalView === 'map' && (
            <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <Map
                hospitals={hospitals}
                onHospitalClick={(h) => startEdit(h)}
                onAddHospital={handleMapAddHospital}
                showSearch
                className="h-[500px]"
              />
              <div className="flex items-center gap-2 border-t border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800">
                <MapIcon className="h-4 w-4 text-gray-400" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Search for a location, then click <span className="font-semibold text-primary-600 dark:text-primary-400">+</span> and click on the map to add a new hospital. Click a marker to edit.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <LoadingSpinner />
          ) : hospitalView === 'list' ? (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Hospital</th>
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">ICU Beds</th>
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                    {hospitals.map((h) => (
                      <tr key={h._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-white">{h.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{h.address}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {h.available_icu_beds}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400"> / {h.total_icu_beds}</span>
                        </td>
                        <td className="px-4 py-3">
                          {h.available_icu_beds === 0 ? (
                            <span className="badge-red">Full</span>
                          ) : h.available_icu_beds / h.total_icu_beds <= 0.2 ? (
                            <span className="badge-yellow">Low</span>
                          ) : (
                            <span className="badge-green">Available</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEdit(h)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                              title="Edit"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openAssignModal(h)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/30 dark:hover:text-primary-400"
                              title="Assign Staff"
                            >
                              <UserPlus className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteHospital(h._id, h.name)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {hospitals.map((h) => (
                  <div key={h._id} className="card">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{h.name}</p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{h.address}</p>
                      </div>
                      {h.available_icu_beds === 0 ? (
                        <span className="badge-red ml-2">Full</span>
                      ) : h.available_icu_beds / h.total_icu_beds <= 0.2 ? (
                        <span className="badge-yellow ml-2">Low</span>
                      ) : (
                        <span className="badge-green ml-2">Available</span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-semibold">{h.available_icu_beds}</span>
                      <span className="text-gray-400"> / {h.total_icu_beds} beds</span>
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => startEdit(h)} className="btn-secondary flex-1 py-2 text-xs">
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button onClick={() => openAssignModal(h)} className="btn-secondary flex-1 py-2 text-xs">
                        <UserPlus className="h-3.5 w-3.5" /> Assign
                      </button>
                      <button
                        onClick={() => handleDeleteHospital(h._id, h.name)}
                        className="btn-danger py-2 text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">{users.length} users</p>
            <button
              onClick={() =>
                exportCsv(
                  users,
                  [
                    { key: 'name', header: 'Name' },
                    { key: 'email', header: 'Email' },
                    { key: 'role', header: 'Role' },
                    { key: 'phone', header: 'Phone' },
                    { key: 'is_active', header: 'Active', formatter: (v) => (v ? 'Yes' : 'No') },
                  ],
                  'users.csv'
                )
              }
              className="btn-secondary text-sm"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">User</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Role</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                      >
                        <option value="user">User</option>
                        <option value="driver">Driver</option>
                        <option value="hospital_rep">Hospital Rep</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.is_active ? 'badge-green' : 'badge-red'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleStatusChange(u._id, !u.is_active)}
                        className={`text-xs font-medium ${
                          u.is_active
                            ? 'text-red-600 hover:text-red-700 dark:text-red-400'
                            : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {users.map((u) => (
              <div key={u._id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                  </div>
                  <span className={u.is_active ? 'badge-green' : 'badge-red'}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <option value="user">User</option>
                    <option value="driver">Driver</option>
                    <option value="hospital_rep">Hospital Rep</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => handleStatusChange(u._id, !u.is_active)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      u.is_active
                        ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                    }`}
                  >
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign Staff Modal */}
      {assigningHospital && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 modal-overlay p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-2xl max-h-[85vh] overflow-y-auto dark:bg-gray-800 bottom-sheet sm:modal-content">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Assign Staff - {assigningHospital.name}
              </h3>
              <button
                onClick={() => setAssigningHospital(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Currently Assigned */}
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Currently Assigned</p>
              {assignLoading ? (
                <LoadingSpinner size="sm" />
              ) : assignedUsers.length === 0 ? (
                <p className="text-sm text-gray-400">No staff assigned</p>
              ) : (
                <div className="space-y-2">
                  {assignedUsers.map((u) => (
                    <div
                      key={u._id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-600"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {u.email} - <span className={roleColors[u.role]}>{u.role}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleUnassign(u._id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        title="Unassign"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Users to Assign */}
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Available to Assign</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {users
                  .filter(
                    (u) =>
                      ['moderator', 'hospital_rep'].includes(u.role) &&
                      !assignedUsers.some((a) => a._id === u._id)
                  )
                  .map((u) => (
                    <div
                      key={u._id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-600"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{u.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {u.email} - <span className={roleColors[u.role]}>{u.role}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleAssign(u._id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/30 dark:hover:text-primary-400"
                        title="Assign"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                {users.filter(
                  (u) =>
                    ['moderator', 'hospital_rep'].includes(u.role) &&
                    !assignedUsers.some((a) => a._id === u._id)
                ).length === 0 && (
                  <p className="text-sm text-gray-400">No available moderators or reps</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Hospital Modal */}
      {(showCreateModal || editingHospital) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 modal-overlay p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white p-5 sm:p-6 shadow-2xl dark:bg-gray-800 max-h-[90vh] overflow-y-auto bottom-sheet sm:modal-content">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingHospital ? 'Edit Hospital' : 'Add Hospital'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingHospital(null);
                  resetForm();
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={editingHospital ? handleUpdateHospital : handleCreateHospital}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="label">Hospital Name</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={hospitalForm.name}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Address</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={hospitalForm.address}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="input"
                    placeholder="23.7461"
                    value={hospitalForm.latitude}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, latitude: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="input"
                    placeholder="90.3742"
                    value={hospitalForm.longitude}
                    onChange={(e) =>
                      setHospitalForm({ ...hospitalForm, longitude: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Total ICU Beds</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="input"
                    value={hospitalForm.total_icu_beds}
                    onChange={(e) =>
                      setHospitalForm({ ...hospitalForm, total_icu_beds: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Available ICU Beds</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="input"
                    value={hospitalForm.available_icu_beds}
                    onChange={(e) =>
                      setHospitalForm({ ...hospitalForm, available_icu_beds: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Contact Phone</label>
                  <input
                    type="text"
                    className="input"
                    value={hospitalForm.contact.phone}
                    onChange={(e) =>
                      setHospitalForm({
                        ...hospitalForm,
                        contact: { ...hospitalForm.contact, phone: e.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label">Contact Email</label>
                  <input
                    type="email"
                    className="input"
                    value={hospitalForm.contact.email}
                    onChange={(e) =>
                      setHospitalForm({
                        ...hospitalForm,
                        contact: { ...hospitalForm.contact, email: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingHospital(null);
                    resetForm();
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingHospital ? 'Update' : 'Create'} Hospital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
