import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'
import socket from '../socket'
import { useToast } from '../contexts/ToastContext'

// ─── Admin View ───
function AdminView() {
  const [hospitals, setHospitals] = useState([])
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState('hospitals')
  const [showAddHospital, setShowAddHospital] = useState(false)
  const [editingHospital, setEditingHospital] = useState(null)
  const [form, setForm] = useState({ name: '', address: '', lat: '', lng: '', total_beds: '', available_beds: '' })
  const [saving, setSaving] = useState(false)
  const { approveUser, rejectUser } = useAuth()
  const toast = useToast()

  useEffect(() => {
    api.get('/hospitals').then(setHospitals).catch(() => {})
    api.get('/users').then(setUsers).catch(() => {})

    const onHospitalUpdate = (h) => setHospitals(prev => prev.map(x => x.id === h.id ? h : x))
    const onHospitalCreate = (h) => setHospitals(prev => [...prev, h])
    const onHospitalDelete = (id) => setHospitals(prev => prev.filter(x => x.id !== id))
    const onUserUpdate = (u) => setUsers(prev => prev.map(x => x.id === u.id ? u : x))
    const onUserDelete = (id) => setUsers(prev => prev.filter(x => x.id !== id))

    socket.on('hospital:update', onHospitalUpdate)
    socket.on('hospital:create', onHospitalCreate)
    socket.on('hospital:delete', onHospitalDelete)
    socket.on('user:update', onUserUpdate)
    socket.on('user:delete', onUserDelete)

    return () => {
      socket.off('hospital:update', onHospitalUpdate)
      socket.off('hospital:create', onHospitalCreate)
      socket.off('hospital:delete', onHospitalDelete)
      socket.off('user:update', onUserUpdate)
      socket.off('user:delete', onUserDelete)
    }
  }, [])

  const handleSaveHospital = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        name: form.name,
        address: form.address,
        coordinates: { lat: parseFloat(form.lat), lng: parseFloat(form.lng) },
        total_beds: parseInt(form.total_beds),
        available_beds: parseInt(form.available_beds),
      }
      if (editingHospital) {
        const updated = await api.put(`/hospitals/${editingHospital}`, data)
        setHospitals(prev => prev.map(h => h.id === editingHospital ? updated : h))
      } else {
        const created = await api.post('/hospitals', data)
        setHospitals(prev => [...prev, created])
      }
      setForm({ name: '', address: '', lat: '', lng: '', total_beds: '', available_beds: '' })
      setShowAddHospital(false)
      setEditingHospital(null)
    } catch (err) {
      toast.error('Error saving: ' + err.message)
    }
    setSaving(false)
  }

  const handleDeleteHospital = async (id) => {
    if (!confirm('Delete this hospital?')) return
    try {
      await api.delete(`/hospitals/${id}`)
      setHospitals(prev => prev.filter(h => h.id !== id))
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }

  const handleEditHospital = (h) => {
    setForm({
      name: h.name || '',
      address: h.address || '',
      lat: h.coordinates?.lat?.toString() || '',
      lng: h.coordinates?.lng?.toString() || '',
      total_beds: h.total_beds?.toString() || '',
      available_beds: h.available_beds?.toString() || ''
    })
    setEditingHospital(h.id)
    setShowAddHospital(true)
  }

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete this user record?')) return
    try {
      await api.delete(`/users/${id}`)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (err) {
      toast.error('Error: ' + err.message)
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 w-fit">
        {['hospitals', 'users'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t === 'hospitals' ? 'Hospitals' : 'Users'}
          </button>
        ))}
      </div>

      {tab === 'hospitals' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Hospital Management</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{hospitals.length} hospitals registered</p>
            </div>
            <button
              onClick={() => { setShowAddHospital(true); setEditingHospital(null); setForm({ name: '', address: '', lat: '', lng: '', total_beds: '', available_beds: '' }) }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-600/25"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Hospital
            </button>
          </div>

          {showAddHospital && (
            <form onSubmit={handleSaveHospital} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 mb-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {editingHospital ? 'Edit Hospital' : 'New Hospital'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" required placeholder="Hospital name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50" />
                <input type="text" required placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50" />
                <input type="number" step="any" required placeholder="Latitude" value={form.lat} onChange={e => setForm({...form, lat: e.target.value})} className="px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50" />
                <input type="number" step="any" required placeholder="Longitude" value={form.lng} onChange={e => setForm({...form, lng: e.target.value})} className="px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50" />
                <input type="number" required placeholder="Total beds" value={form.total_beds} onChange={e => setForm({...form, total_beds: e.target.value})} className="px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50" />
                <input type="number" required placeholder="Available beds" value={form.available_beds} onChange={e => setForm({...form, available_beds: e.target.value})} className="px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors">
                  {saving ? 'Saving...' : (editingHospital ? 'Update' : 'Create')}
                </button>
                <button type="button" onClick={() => { setShowAddHospital(false); setEditingHospital(null) }} className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Hospital</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden sm:table-cell">Address</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Beds</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Available</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {hospitals.map(h => (
                    <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{h.name}</div>
                        <div className="text-xs text-slate-400 sm:hidden">{h.address}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell">{h.address}</td>
                      <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300">{h.total_beds}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${
                          h.available_beds > 5 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                          h.available_beds >= 1 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                          'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                        }`}>
                          {h.available_beds}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEditHospital(h)} className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                            </svg>
                          </button>
                          <button onClick={() => handleDeleteHospital(h.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {hospitals.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">No hospitals found. Add one to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">User Management</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{users.length} registered users</p>
          </div>

          {users.filter(u => u.status === 'pending').length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Pending Approval ({users.filter(u => u.status === 'pending').length})
              </h3>
              <div className="space-y-2">
                {users.filter(u => u.status === 'pending').map(u => (
                  <div key={u.id} className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{u.displayName || u.email}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                          u.role === 'admin' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
                          u.role === 'moderator' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                          'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        }`}>{u.role}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={async () => {
                          try {
                            await approveUser(u.id)
                            setUsers(prev => prev.map(x => x.id === u.id ? { ...x, status: 'active' } : x))
                            toast.success(`${u.displayName || u.email} has been approved`)
                          } catch (err) { toast.error('Failed to approve: ' + err.message) }
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Approve
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Reject and delete ${u.displayName || u.email}'s account?`)) return
                          try {
                            await rejectUser(u.id)
                            setUsers(prev => prev.filter(x => x.id !== u.id))
                            toast.success(`${u.displayName || u.email} has been rejected`)
                          } catch (err) { toast.error('Failed to reject: ' + err.message) }
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">User</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Role</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-white">{u.displayName || u.email?.split('@')[0]}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          u.role === 'admin' ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400' :
                          u.role === 'moderator' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                          'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                        }`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          u.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                          'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                        }`}>{u.status || 'active'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Moderator View ───
function ModeratorView() {
  const { userData } = useAuth()
  const [hospitals, setHospitals] = useState([])
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    api.get('/hospitals').then(all => {
      const assigned = userData?.assigned_hospitals || []
      setHospitals(assigned.length > 0 ? all.filter(h => assigned.includes(h.id)) : all)
    }).catch(() => {})

    const onUpdate = (h) => setHospitals(prev => prev.map(x => x.id === h.id ? h : x))
    socket.on('hospital:update', onUpdate)
    return () => socket.off('hospital:update', onUpdate)
  }, [userData])

  const handleUpdate = async (id, field, value) => {
    setSaving(id)
    try {
      await api.put(`/hospitals/${id}`, { [field]: parseInt(value) })
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setSaving(null)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Assigned Hospitals</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage bed information for your region</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hospitals.map(h => (
          <div key={h.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{h.name}</h3>
            <p className="text-xs text-slate-400 mb-4">{h.address}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Beds</label>
                <input type="number" defaultValue={h.total_beds} onBlur={e => handleUpdate(h.id, 'total_beds', e.target.value)} className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Available</label>
                <input type="number" defaultValue={h.available_beds} onBlur={e => handleUpdate(h.id, 'available_beds', e.target.value)} className="mt-1 w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
            </div>
            {saving === h.id && <p className="text-xs text-blue-500 mt-2">Saving...</p>}
          </div>
        ))}
        {hospitals.length === 0 && (
          <p className="text-slate-400 dark:text-slate-500 col-span-full text-center py-12">No hospitals assigned to you yet.</p>
        )}
      </div>
    </div>
  )
}

// ─── Hospital Rep View ───
function RepView() {
  const { user, userData } = useAuth()
  const [hospitals, setHospitals] = useState([])
  const [bedCounts, setBedCounts] = useState({})
  const [saving, setSaving] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    api.get('/hospitals').then(all => {
      const assigned = userData?.assigned_hospitals || []
      const mine = all.filter(h => assigned.includes(h.id) || h.assigned_rep_id === user?.id)
      setHospitals(mine)
      const counts = {}
      mine.forEach(h => { counts[h.id] = h.available_beds?.toString() || '0' })
      setBedCounts(counts)
    }).catch(() => {})

    const onUpdate = (h) => {
      setHospitals(prev => prev.map(x => x.id === h.id ? h : x))
    }
    socket.on('hospital:update', onUpdate)
    return () => socket.off('hospital:update', onUpdate)
  }, [user, userData])

  const handleUpdate = async (hospitalId) => {
    setSaving(hospitalId)
    setSuccess(null)
    try {
      await api.put(`/hospitals/${hospitalId}`, {
        available_beds: parseInt(bedCounts[hospitalId]) || 0,
      })
      setSuccess(hospitalId)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setSaving(null)
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Update Bed Availability</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Keep your hospital's ICU bed count up to date</p>
      </div>

      {hospitals.map(h => (
        <div key={h.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{h.name}</h3>
          <p className="text-xs text-slate-400 mb-4">{h.address}</p>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Available ICU Beds</label>
              <input type="number" min="0" max={h.total_beds} value={bedCounts[h.id] || '0'} onChange={e => setBedCounts({...bedCounts, [h.id]: e.target.value})} className="w-full px-4 py-3 text-2xl font-bold text-center bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
            <div className="text-center px-4">
              <div className="text-xs text-slate-400 mb-1">of</div>
              <div className="text-2xl font-bold text-slate-300 dark:text-slate-600">{h.total_beds}</div>
              <div className="text-xs text-slate-400">total</div>
            </div>
          </div>
          <button onClick={() => handleUpdate(h.id)} disabled={saving === h.id} className={`w-full py-3 text-sm font-semibold rounded-xl transition-all shadow-lg ${success === h.id ? 'bg-emerald-500 text-white shadow-emerald-500/25' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25 disabled:opacity-50'}`}>
            {saving === h.id ? 'Updating...' : success === h.id ? 'Updated Successfully!' : 'Update Bed Count'}
          </button>
          {h.last_updated && (
            <p className="text-xs text-slate-400 text-center mt-3">Last updated: {new Date(h.last_updated).toLocaleString()}</p>
          )}
        </div>
      ))}

      {hospitals.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <p className="text-slate-400 dark:text-slate-500">No hospital assigned to your account yet.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Contact an administrator to get assigned.</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ───
export default function Dashboard() {
  const { userData } = useAuth()

  const greetings = {
    admin: { title: 'Admin Dashboard', subtitle: 'Manage hospitals, users, and system settings' },
    moderator: { title: 'Moderator Dashboard', subtitle: 'Manage hospitals in your assigned region' },
    rep: { title: 'Hospital Dashboard', subtitle: 'Update your facility\'s ICU bed availability' },
  }

  const g = greetings[userData?.role] || greetings.rep

  return (
    <div className="min-h-screen pt-20 pb-8 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{g.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{g.subtitle}</p>
        </div>
        {userData?.role === 'admin' && <AdminView />}
        {userData?.role === 'moderator' && <ModeratorView />}
        {(userData?.role === 'rep' || !userData?.role) && userData?.role !== 'admin' && userData?.role !== 'moderator' && <RepView />}
      </div>
    </div>
  )
}
