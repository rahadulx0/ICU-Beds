import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../store/notificationSlice';
import { Bell, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
  const dispatch = useDispatch();
  const { list, unreadCount, loading } = useSelector((state) => state.notifications);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    dispatch(fetchUnreadCount());
  }, [dispatch]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleOpen = () => {
    setOpen(!open);
    if (!open) dispatch(fetchNotifications());
  };

  const typeIcons = {
    request_status_change: '🚑',
    new_ambulance_request: '🚨',
    low_bed_alert: '🛏️',
    hospital_assigned: '🏥',
    role_changed: '👤',
    system_announcement: '📢',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 active:scale-95 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-gray-200 bg-white shadow-xl animate-scale-in sm:w-80 dark:border-gray-700 dark:bg-gray-800"
          role="menu"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => dispatch(markAllAsRead())}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary-600 transition-colors hover:bg-primary-50 active:scale-95 dark:text-primary-400 dark:hover:bg-primary-900/20"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : list.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No notifications</div>
            ) : (
              list.map((n) => (
                <div
                  key={n._id}
                  className={`flex items-start gap-3 border-b border-gray-50 px-4 py-3 transition-colors dark:border-gray-700/50 ${
                    !n.read
                      ? 'bg-primary-50/50 dark:bg-primary-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                  onClick={() => !n.read && dispatch(markAsRead(n._id))}
                  role="menuitem"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !n.read) dispatch(markAsRead(n._id));
                  }}
                >
                  <span className="mt-0.5 text-base">{typeIcons[n.type] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate dark:text-white">{n.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-2 dark:text-gray-400">{n.message}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
