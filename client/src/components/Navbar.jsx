import { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { logout } from '../store/authSlice';
import { DarkModeContext } from './Layout';
import NotificationBell from './NotificationBell';
import {
  Activity,
  LogOut,
  User,
  LayoutDashboard,
  MapPin,
  LogIn,
  UserPlus,
  History,
  Moon,
  Sun,
  Languages,
  BarChart3,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { dark, setDark } = useContext(DarkModeContext);
  const { t, i18n } = useTranslation();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'bn' ? 'en' : 'bn');
  };

  const handleLogout = async () => {
    await dispatch(logout());
    toast.success('Logged out successfully');
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800'
    }`;

  const bottomNavClass = (path) =>
    `flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors ${
      isActive(path) ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
    }`;

  return (
    <>
      {/* Top Navbar */}
      <nav aria-label="Main navigation" className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-900/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                ICU<span className="text-primary-600 dark:text-primary-400">Beds</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden items-center gap-1 md:flex">
              <Link to="/" className={navLinkClass('/')}>
                <MapPin className="h-4 w-4" />
                {t('nav.map')}
              </Link>

              {user && (
                <>
                  <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                    <LayoutDashboard className="h-4 w-4" />
                    {t('nav.dashboard')}
                  </Link>
                  <Link to="/history" className={navLinkClass('/history')}>
                    <History className="h-4 w-4" />
                    {t('nav.history')}
                  </Link>
                  {['admin', 'moderator'].includes(user.role) && (
                    <Link to="/analytics" className={navLinkClass('/analytics')}>
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </Link>
                  )}
                  {user.role === 'admin' && (
                    <Link to="/audit-logs" className={navLinkClass('/audit-logs')}>
                      <FileText className="h-4 w-4" />
                      Audit Logs
                    </Link>
                  )}
                </>
              )}

              {/* Language toggle */}
              <button
                onClick={toggleLang}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                title={i18n.language === 'bn' ? 'Switch to English' : 'বাংলায় পরিবর্তন করুন'}
                aria-label={i18n.language === 'bn' ? 'Switch to English' : 'Switch to Bengali'}
              >
                <Languages className="h-4 w-4" />
              </button>

              {/* Dark mode toggle */}
              <button
                onClick={() => setDark(!dark)}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {user ? (
                <div className="ml-2 flex items-center gap-2 border-l border-gray-200 pl-3 dark:border-gray-700">
                  <NotificationBell />
                  <Link to="/profile" className={navLinkClass('/profile')}>
                    <User className="h-4 w-4" />
                    {user.name}
                  </Link>
                  <button onClick={handleLogout} className={navLinkClass('')}>
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </button>
                </div>
              ) : (
                <div className="ml-2 flex items-center gap-2 border-l border-gray-200 pl-3 dark:border-gray-700">
                  <Link to="/login" className={navLinkClass('/login')}>
                    <LogIn className="h-4 w-4" />
                    {t('nav.login')}
                  </Link>
                  <Link to="/signup" className="btn-primary text-sm">
                    <UserPlus className="h-4 w-4" />
                    {t('nav.signup')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 md:hidden">
        <div className="flex items-stretch">
          <Link to="/" className={bottomNavClass('/')}>
            <MapPin className="h-5 w-5" />
            {t('nav.map')}
          </Link>

          {user ? (
            <>
              <Link to="/dashboard" className={bottomNavClass('/dashboard')}>
                <LayoutDashboard className="h-5 w-5" />
                {t('nav.dashboard')}
              </Link>
              <Link to="/history" className={bottomNavClass('/history')}>
                <History className="h-5 w-5" />
                {t('nav.history')}
              </Link>
              <button
                onClick={() => setDark(!dark)}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400`}
              >
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                {t('nav.theme')}
              </button>
              <Link to="/profile" className={bottomNavClass('/profile')}>
                <User className="h-5 w-5" />
                {t('nav.profile')}
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={() => setDark(!dark)}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400`}
              >
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                {t('nav.theme')}
              </button>
              <Link to="/login" className={bottomNavClass('/login')}>
                <LogIn className="h-5 w-5" />
                {t('nav.login')}
              </Link>
              <Link to="/signup" className={bottomNavClass('/signup')}>
                <UserPlus className="h-5 w-5" />
                {t('nav.signup')}
              </Link>
            </>
          )}
        </div>
        {/* Safe area for phones with home indicator */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </>
  );
}
