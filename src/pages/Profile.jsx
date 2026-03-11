import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../api'
import socket from '../socket'

const inputCls = "w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
const cardCls = "bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
const sectionTitle = "text-base font-semibold text-slate-900 dark:text-white"
const sectionDesc = "text-sm text-slate-500 dark:text-slate-400 mt-0.5"

function getInitials(name, email) {
  if (name && name.trim()) return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (email || '?')[0].toUpperCase()
}

function formatDate(ts) {
  if (!ts) return 'N/A'
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── Personal Info Section ───
function PersonalInfoSection() {
  const { user, userData, updateProfile } = useAuth()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ displayName: '', phone: '', organization: '' })

  useEffect(() => {
    if (userData) {
      setForm({ displayName: userData.displayName || '', phone: userData.phone || '', organization: userData.organization || '' })
    }
  }, [userData])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile(form)
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(err.message || 'Failed to update profile')
    }
    setSaving(false)
  }

  const roleMeta = {
    admin: { label: 'Administrator', color: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-500/20' },
    moderator: { label: 'Moderator', color: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-500/20' },
    rep: { label: 'Hospital Representative', color: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-500/20' },
  }
  const role = roleMeta[userData?.role] || roleMeta.rep

  return (
    <div className={cardCls}>
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-600/20 shrink-0">
            {getInitials(userData?.displayName, user?.email)}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{userData?.displayName || 'Unnamed User'}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-md ${role.color}`}>{role.label}</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Joined {formatDate(userData?.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
      <form onSubmit={handleSave} className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className={labelCls}>Full Name</label>
            <input type="text" value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} placeholder="Your full name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email Address</label>
            <input type="email" value={user?.email || ''} disabled className={`${inputCls} opacity-60 cursor-not-allowed`} />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className={labelCls}>Phone Number</label>
            <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+880 1XXXXXXXXX" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Organization</label>
            <input type="text" value={form.organization} onChange={e => setForm({...form, organization: e.target.value})} placeholder="Hospital or organization name" className={inputCls} />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm shadow-blue-600/20">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Hospital Management Section (for Reps) ───
function HospitalManagementSection() {
  const { user, userData } = useAuth()
  const toast = useToast()
  const [hospitals, setHospitals] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => {
    api.get('/hospitals').then(all => {
      const assigned = userData?.assigned_hospitals || []
      setHospitals(all.filter(h => assigned.includes(h.id) || h.assigned_rep_id === user?.id))
    }).catch(() => {})

    const onUpdate = (h) => setHospitals(prev => prev.map(x => x.id === h.id ? h : x))
    socket.on('hospital:update', onUpdate)
    return () => socket.off('hospital:update', onUpdate)
  }, [user, userData])

  const startEdit = (h) => {
    setEditingId(h.id)
    setForm({
      name: h.name || '', address: h.address || '', phone: h.phone || '', email: h.email || '',
      website: h.website || '', total_beds: h.total_beds?.toString() || '0', available_beds: h.available_beds?.toString() || '0',
      icu_ventilators: h.icu_ventilators?.toString() || '0', available_ventilators: h.available_ventilators?.toString() || '0',
      department: h.department || '', head_doctor: h.head_doctor || '', emergency_contact: h.emergency_contact || '', notes: h.notes || '',
    })
  }

  const handleSave = async (hospitalId) => {
    setSaving(true)
    try {
      await api.put(`/hospitals/${hospitalId}`, {
        ...form,
        total_beds: parseInt(form.total_beds) || 0, available_beds: parseInt(form.available_beds) || 0,
        icu_ventilators: parseInt(form.icu_ventilators) || 0, available_ventilators: parseInt(form.available_ventilators) || 0,
      })
      toast.success('Hospital information updated')
      setEditingId(null)
    } catch (err) {
      toast.error(err.message || 'Failed to update hospital')
    }
    setSaving(false)
  }

  const handleQuickBedUpdate = async (hospitalId, beds) => {
    try {
      await api.put(`/hospitals/${hospitalId}`, { available_beds: parseInt(beds) || 0 })
      toast.success('Bed count updated')
    } catch (err) {
      toast.error(err.message || 'Failed to update')
    }
  }

  if (hospitals.length === 0) {
    return (
      <div className={cardCls}>
        <div className="p-6">
          <h3 className={sectionTitle}>My Hospital</h3>
          <p className={sectionDesc}>No hospital assigned to your account yet. Contact an admin.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {hospitals.map(h => (
        <div key={h.id} className={cardCls}>
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className={sectionTitle}>{h.name}</h3>
              <p className={sectionDesc}>{h.address}</p>
            </div>
            {editingId !== h.id ? (
              <button onClick={() => startEdit(h)} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                Edit Details
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => handleSave(h.id)} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">{saving ? 'Saving...' : 'Save'}</button>
                <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors">Cancel</button>
              </div>
            )}
          </div>
          <div className="p-6">
            {editingId === h.id ? (
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Bed Capacity</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div><label className={labelCls}>Total ICU Beds</label><input type="number" min="0" value={form.total_beds} onChange={e => setForm({...form, total_beds: e.target.value})} className={inputCls} /></div>
                    <div><label className={labelCls}>Available Beds</label><input type="number" min="0" value={form.available_beds} onChange={e => setForm({...form, available_beds: e.target.value})} className={inputCls} /></div>
                    <div><label className={labelCls}>Total Ventilators</label><input type="number" min="0" value={form.icu_ventilators} onChange={e => setForm({...form, icu_ventilators: e.target.value})} className={inputCls} /></div>
                    <div><label className={labelCls}>Avail. Ventilators</label><input type="number" min="0" value={form.available_ventilators} onChange={e => setForm({...form, available_ventilators: e.target.value})} className={inputCls} /></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Contact Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={labelCls}>Hospital Phone</label><input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+880-XXX-XXXXXXX" className={inputCls} /></div>
                    <div><label className={labelCls}>Hospital Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="info@hospital.com" className={inputCls} /></div>
                    <div><label className={labelCls}>Website</label><input type="url" value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://hospital.com" className={inputCls} /></div>
                    <div><label className={labelCls}>Emergency Contact</label><input type="tel" value={form.emergency_contact} onChange={e => setForm({...form, emergency_contact: e.target.value})} placeholder="Emergency hotline" className={inputCls} /></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Department Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={labelCls}>ICU Department</label><input type="text" value={form.department} onChange={e => setForm({...form, department: e.target.value})} placeholder="e.g. Cardiac ICU" className={inputCls} /></div>
                    <div><label className={labelCls}>Head Doctor</label><input type="text" value={form.head_doctor} onChange={e => setForm({...form, head_doctor: e.target.value})} placeholder="Dr. Name" className={inputCls} /></div>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Additional Notes</label>
                  <textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any additional info" className={`${inputCls} resize-none`} />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <StatCard label="Total Beds" value={h.total_beds ?? 0} color="blue" />
                  <StatCard label="Available" value={h.available_beds ?? 0} color={h.available_beds > 5 ? 'emerald' : h.available_beds >= 1 ? 'amber' : 'red'} editable onSave={(v) => handleQuickBedUpdate(h.id, v)} />
                  <StatCard label="Ventilators" value={h.icu_ventilators ?? 0} color="purple" />
                  <StatCard label="Avail. Vent." value={h.available_ventilators ?? 0} color="indigo" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <InfoRow label="Phone" value={h.phone} />
                  <InfoRow label="Email" value={h.email} />
                  <InfoRow label="Website" value={h.website} link />
                  <InfoRow label="Emergency" value={h.emergency_contact} />
                  <InfoRow label="Department" value={h.department} />
                  <InfoRow label="Head Doctor" value={h.head_doctor} />
                  {h.notes && <div className="sm:col-span-2"><InfoRow label="Notes" value={h.notes} /></div>}
                </div>
                {h.last_updated && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    Last updated: {new Date(h.last_updated).toLocaleString()}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </>
  )
}

function StatCard({ label, value, color, editable, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value?.toString())
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400',
    red: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  }
  const handleSave = () => { onSave?.(val); setEditing(false) }
  return (
    <div className={`rounded-xl p-3.5 text-center ${colors[color]} ${editable ? 'cursor-pointer hover:ring-2 hover:ring-current/20' : ''}`} onClick={() => editable && !editing && setEditing(true)}>
      {editing ? (
        <input type="number" value={val} onChange={e => setVal(e.target.value)} onBlur={handleSave} onKeyDown={e => e.key === 'Enter' && handleSave()} autoFocus className="w-full text-center text-2xl font-bold bg-transparent border-none outline-none" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
      <div className="text-[11px] font-medium opacity-70 mt-0.5">{label}</div>
      {editable && !editing && <div className="text-[10px] opacity-50 mt-0.5">Click to edit</div>}
    </div>
  )
}

function InfoRow({ label, value, link }) {
  if (!value) return (
    <div className="flex items-baseline justify-between py-1.5">
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</span>
      <span className="text-sm text-slate-300 dark:text-slate-600">--</span>
    </div>
  )
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate ml-4 max-w-[200px]">{value}</a>
      ) : (
        <span className="text-sm text-slate-700 dark:text-slate-200 truncate ml-4 max-w-[200px]">{value}</span>
      )}
    </div>
  )
}

// ─── Moderator Hospitals Section ───
function ModeratorHospitalsSection() {
  const { userData } = useAuth()
  const toast = useToast()
  const [hospitals, setHospitals] = useState([])

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
    try {
      await api.put(`/hospitals/${id}`, { [field]: parseInt(value) || 0 })
      toast.success('Updated successfully')
    } catch (err) { toast.error(err.message) }
  }

  return (
    <div className={cardCls}>
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
        <h3 className={sectionTitle}>Assigned Hospitals ({hospitals.length})</h3>
        <p className={sectionDesc}>Hospitals under your moderation</p>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {hospitals.map(h => (
          <div key={h.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm text-slate-900 dark:text-white">{h.name}</div>
              <div className="text-xs text-slate-400">{h.address}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-400">Beds:</label>
                <input type="number" defaultValue={h.available_beds} onBlur={e => handleUpdate(h.id, 'available_beds', e.target.value)} className="w-16 px-2 py-1.5 text-sm text-center bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/30" />
                <span className="text-[11px] text-slate-400">/ {h.total_beds}</span>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${h.available_beds > 5 ? 'bg-emerald-500' : h.available_beds >= 1 ? 'bg-amber-500' : 'bg-red-500'}`} />
            </div>
          </div>
        ))}
        {hospitals.length === 0 && <p className="px-6 py-8 text-center text-sm text-slate-400">No hospitals assigned.</p>}
      </div>
    </div>
  )
}

// ─── Admin Stats Section ───
function AdminStatsSection() {
  const [hospitals, setHospitals] = useState([])
  const [users, setUsers] = useState([])

  useEffect(() => {
    api.get('/hospitals').then(setHospitals).catch(() => {})
    api.get('/users').then(setUsers).catch(() => {})
  }, [])

  const totalBeds = hospitals.reduce((s, h) => s + (h.total_beds || 0), 0)
  const availBeds = hospitals.reduce((s, h) => s + (h.available_beds || 0), 0)

  return (
    <div className={cardCls}>
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
        <h3 className={sectionTitle}>System Overview</h3>
        <p className={sectionDesc}>Quick stats for the entire platform</p>
      </div>
      <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniStat label="Hospitals" value={hospitals.length} color="blue" />
        <MiniStat label="Total Beds" value={totalBeds} color="indigo" />
        <MiniStat label="Available" value={availBeds} color="emerald" />
        <MiniStat label="Admins" value={`${users.filter(u => u.role === 'admin').length}/2`} color="red" />
        <MiniStat label="Moderators" value={users.filter(u => u.role === 'moderator').length} color="amber" />
        <MiniStat label="Reps" value={users.filter(u => u.role === 'rep').length} color="emerald" />
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }) {
  const colors = {
    blue: 'text-blue-600 dark:text-blue-400', indigo: 'text-indigo-600 dark:text-indigo-400',
    emerald: 'text-emerald-600 dark:text-emerald-400', red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
  }
  return (
    <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40">
      <div className={`text-xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">{label}</div>
    </div>
  )
}

// ─── Change Password Section ───
function ChangePasswordSection() {
  const { changePassword } = useAuth()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (newPass !== confirm) return toast.error('New passwords do not match')
    if (newPass.length < 6) return toast.error('Password must be at least 6 characters')
    setSaving(true)
    try {
      await changePassword(current, newPass)
      toast.success('Password changed successfully')
      setCurrent(''); setNewPass(''); setConfirm('')
    } catch (err) {
      toast.error(err.message || 'Failed to change password')
    }
    setSaving(false)
  }

  return (
    <div className={cardCls}>
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
        <h3 className={sectionTitle}>Change Password</h3>
        <p className={sectionDesc}>Update your account password</p>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div><label className={labelCls}>Current Password</label><input type="password" required value={current} onChange={e => setCurrent(e.target.value)} placeholder="Enter current password" className={inputCls} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelCls}>New Password</label><input type="password" required value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="At least 6 characters" className={inputCls} /></div>
          <div><label className={labelCls}>Confirm New Password</label><input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" className={inputCls} /></div>
        </div>
        <div className="flex justify-end pt-1">
          <button type="submit" disabled={saving} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors">
            {saving ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Danger Zone ───
function DangerZone() {
  const { deleteAccount } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e) => {
    e.preventDefault()
    setDeleting(true)
    try {
      await deleteAccount(password)
      toast.success('Account deleted')
      navigate('/')
    } catch (err) {
      toast.error(err.message || 'Failed to delete account')
    }
    setDeleting(false)
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-500/20 overflow-hidden">
      <div className="px-6 py-4 border-b border-red-100 dark:border-red-500/10">
        <h3 className="text-base font-semibold text-red-700 dark:text-red-400">Danger Zone</h3>
        <p className="text-sm text-red-500/70 dark:text-red-400/60 mt-0.5">Irreversible actions</p>
      </div>
      <div className="p-6">
        {!showConfirm ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">Delete Account</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Permanently remove your account and all data</div>
            </div>
            <button onClick={() => setShowConfirm(true)} className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors">Delete Account</button>
          </div>
        ) : (
          <form onSubmit={handleDelete} className="space-y-3">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">This action cannot be undone. Enter your password to confirm.</p>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className={`${inputCls} border-red-200 dark:border-red-500/30 focus:ring-red-500/30 focus:border-red-500`} />
            <div className="flex gap-2">
              <button type="submit" disabled={deleting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors">{deleting ? 'Deleting...' : 'Confirm Delete'}</button>
              <button type="button" onClick={() => { setShowConfirm(false); setPassword('') }} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Main Profile Page ───
export default function Profile() {
  const { userData } = useAuth()

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Profile Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your account and preferences</p>
        </div>
        <PersonalInfoSection />
        {userData?.role === 'admin' && <AdminStatsSection />}
        {userData?.role === 'moderator' && <ModeratorHospitalsSection />}
        {(userData?.role === 'rep' || !userData?.role) && <HospitalManagementSection />}
        <ChangePasswordSection />
        <DangerZone />
      </div>
    </div>
  )
}
