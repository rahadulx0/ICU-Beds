import { useState, useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { updateProfile, changePassword, logout } from '../store/authSlice';
import { DarkModeContext } from '../components/Layout';
import {
  User,
  Mail,
  Phone,
  Shield,
  Save,
  Truck,
  Hospital,
  Lock,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Languages,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { dark, setDark } = useContext(DarkModeContext);
  const { t, i18n } = useTranslation();

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await dispatch(updateProfile(form));
    setSaving(false);

    if (updateProfile.fulfilled.match(result)) {
      toast.success('Profile updated');
    } else {
      toast.error('Failed to update profile');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (passwordForm.newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setChangingPassword(true);
    const result = await dispatch(changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    }));
    setChangingPassword(false);

    if (changePassword.fulfilled.match(result)) {
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordSection(false);
    } else {
      toast.error(result.payload || 'Failed to change password');
    }
  };

  const handleLogout = async () => {
    await dispatch(logout());
    toast.success('Logged out successfully');
    navigate('/');
  };

  const roleLabels = {
    admin: { label: 'System Admin', icon: Shield, color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30' },
    moderator: { label: 'Regional Moderator', icon: Shield, color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30' },
    hospital_rep: {
      label: 'Hospital Representative',
      icon: Hospital,
      color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30',
    },
    driver: { label: 'Ambulance Driver', icon: Truck, color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30' },
    user: { label: 'Regular User', icon: User, color: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-800' },
  };

  const role = roleLabels[user?.role] || roleLabels.user;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8 animate-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30">
          <User className="h-7 w-7 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{user?.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
        </div>
      </div>

      {/* Role badge */}
      <div className={`mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${role.color}`}>
        <role.icon className="h-4 w-4" />
        <span className="font-medium">{role.label}</span>
      </div>

      {/* Email verification status */}
      {user && !user.email_verified && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          Your email is not verified. Check your inbox for a verification link.
        </div>
      )}

      {/* Profile form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="card space-y-4">
          <div>
            <label className="label">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                className="input pl-10"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                disabled
                className="input bg-gray-50 pl-10 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                value={user?.email || ''}
              />
            </div>
          </div>

          <div>
            <label className="label">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                className="input pl-10"
                placeholder="+880 1XX XXXX XXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          {user?.role === 'driver' && user?.vehicle_details && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle Details</p>
              <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>Plate: <span className="font-medium">{user.vehicle_details.plate_number}</span></p>
                <p>Type: <span className="font-medium capitalize">{user.vehicle_details.vehicle_type?.replace('_', ' ')}</span></p>
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Settings Section */}
      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
          <Settings className="h-4 w-4" />
          Settings
        </h2>
        <div className="mt-3 card divide-y divide-gray-100 dark:divide-gray-700/50 p-0 overflow-hidden">
          {/* Dark Mode */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              {dark ? <Moon className="h-5 w-5 text-indigo-500" /> : <Sun className="h-5 w-5 text-amber-500" />}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Appearance</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{dark ? 'Dark mode' : 'Light mode'}</p>
              </div>
            </div>
            <button
              onClick={() => setDark(!dark)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                dark ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  dark ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Languages className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Language</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{i18n.language === 'bn' ? 'Bengali' : 'English'}</p>
              </div>
            </div>
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'bn' ? 'en' : 'bn')}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 active:scale-95 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {i18n.language === 'bn' ? 'English' : 'Bengali'}
            </button>
          </div>

          {/* Change Password */}
          <button
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-700/50 dark:active:bg-gray-700"
          >
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Change Password</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Update your password</p>
              </div>
            </div>
            <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showPasswordSection ? 'rotate-90' : ''}`} />
          </button>

          {/* Password form - collapsible */}
          {showPasswordSection && (
            <form onSubmit={handlePasswordChange} className="space-y-3 px-4 py-4 bg-gray-50 dark:bg-gray-800/50 animate-in">
              <div>
                <label className="label">Current Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  required
                  className="input"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="input pr-10"
                    placeholder="Min 6 characters"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="input"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                />
              </div>
              <button type="submit" disabled={changingPassword} className="btn-primary w-full">
                {changingPassword ? 'Changing...' : 'Update Password'}
              </button>
            </form>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-red-600 transition-colors hover:bg-red-50 active:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/20 dark:active:bg-red-900/30"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
