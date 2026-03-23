import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { register, clearError } from '../store/authSlice';
import { Activity, Mail, Lock, User, Phone, Eye, EyeOff, ArrowRight, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Signup() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useSelector((state) => state.auth);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'user',
    vehicle_details: {
      plate_number: '',
      vehicle_type: 'basic',
    },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    return () => dispatch(clearError());
  }, [dispatch]);

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) {
      errors.name = 'Name is required';
    } else if (form.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    if (!form.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!form.password) {
      errors.password = 'Password is required';
    } else if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (form.role === 'driver' && !form.vehicle_details.plate_number.trim()) {
      errors.plate_number = 'Plate number is required for drivers';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (field) => {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone || undefined,
      role: form.role,
    };

    if (form.role === 'driver') {
      payload.vehicle_details = form.vehicle_details;
    }

    const result = await dispatch(register(payload));
    if (register.fulfilled.match(result)) {
      toast.success('Account created successfully!');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Create an account</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Join the ICU Beds emergency care platform</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
          )}

          <div>
            <label className="label">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className={`input pl-10 ${fieldErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); clearFieldError('name'); }}
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
              />
            </div>
            {fieldErrors.name && (
              <p id="name-error" role="alert" className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                className={`input pl-10 ${fieldErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); clearFieldError('email'); }}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
            </div>
            {fieldErrors.email && (
              <p id="email-error" role="alert" className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                className={`input pl-10 pr-10 ${fieldErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Min 6 characters"
                value={form.password}
                onChange={(e) => { setForm({ ...form, password: e.target.value }); clearFieldError('password'); }}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" role="alert" className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
            )}
          </div>

          <div>
            <label className="label">Phone (Optional)</label>
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

          <div>
            <label className="label">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'user', label: 'Patient / Public', icon: User },
                { value: 'driver', label: 'Ambulance Driver', icon: Truck },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm({ ...form, role: r.value })}
                  className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all min-h-[44px] ${
                    form.role === r.value
                      ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <r.icon className="h-4 w-4" />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {form.role === 'driver' && (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Vehicle Details</p>
              <div>
                <label className="label">Plate Number</label>
                <input
                  type="text"
                  className={`input ${fieldErrors.plate_number ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="e.g., DHA-1234"
                  value={form.vehicle_details.plate_number}
                  onChange={(e) => {
                    setForm({
                      ...form,
                      vehicle_details: { ...form.vehicle_details, plate_number: e.target.value },
                    });
                    clearFieldError('plate_number');
                  }}
                  aria-invalid={!!fieldErrors.plate_number}
                  aria-describedby={fieldErrors.plate_number ? 'plate-error' : undefined}
                />
                {fieldErrors.plate_number && (
                  <p id="plate-error" role="alert" className="mt-1 text-xs text-red-500">{fieldErrors.plate_number}</p>
                )}
              </div>
              <div>
                <label className="label">Vehicle Type</label>
                <select
                  className="input"
                  value={form.vehicle_details.vehicle_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      vehicle_details: { ...form.vehicle_details, vehicle_type: e.target.value },
                    })
                  }
                >
                  <option value="basic">Basic Ambulance</option>
                  <option value="advanced">Advanced Life Support</option>
                  <option value="icu_ambulance">ICU Ambulance</option>
                </select>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              'Creating account...'
            ) : (
              <>
                Create Account
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
