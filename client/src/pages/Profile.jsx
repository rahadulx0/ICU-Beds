import { useState, useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { updateProfile, changePassword } from '../store/authSlice';
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
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Profile() {
  const dispatch = useDispatch();
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
    } else {
      toast.error(result.payload || 'Failed to change password');
    }
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
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your account information</p>

      {/* Role badge */}
      <div className={`mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 ${role.color}`}>
        <role.icon className="h-5 w-5" />
        <span className="font-medium">{role.label}</span>
      </div>

      {/* Email verification status */}
      {user && !user.email_verified && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          Your email is not verified. Check your inbox for a verification link.
        </div>
      )}

      {/* Profile form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="card space-y-5">
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
            <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
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
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle Details</p>
              <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  Plate: <span className="font-medium">{user.vehicle_details.plate_number}</span>
                </p>
                <p>
                  Type:{' '}
                  <span className="font-medium capitalize">
                    {user.vehicle_details.vehicle_type?.replace('_', ' ')}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Change Password */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="mt-4 card space-y-4">
          <div>
            <label className="label">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                className="input pl-10"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type={showPasswords ? 'text' : 'password'}
                required
                minLength={6}
                className="input pl-10 pr-10"
                placeholder="Min 6 characters"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                minLength={6}
                className="input pl-10"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" disabled={changingPassword} className="btn-primary">
            <Lock className="h-4 w-4" />
            {changingPassword ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Settings */}
      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Settings className="h-5 w-5" />
          Settings
        </h2>
        <div className="mt-4 card divide-y divide-gray-100 dark:divide-gray-700 p-0">
          {/* Dark Mode */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              {dark ? <Moon className="h-5 w-5 text-indigo-500" /> : <Sun className="h-5 w-5 text-amber-500" />}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Appearance</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{dark ? 'Dark mode' : 'Light mode'}</p>
              </div>
            </div>
            <button
              onClick={() => setDark(!dark)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                dark ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  dark ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Languages className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Language</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{i18n.language === 'bn' ? 'Bengali' : 'English'}</p>
              </div>
            </div>
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'bn' ? 'en' : 'bn')}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {i18n.language === 'bn' ? 'English' : 'Bengali'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
