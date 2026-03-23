import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth } from './store/authSlice';
import { addNotification, fetchUnreadCount } from './store/notificationSlice';
import { updateBedCount } from './store/hospitalSlice';
import socket from './socket';
import toast from 'react-hot-toast';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const HospitalDetail = lazy(() => import('./pages/HospitalDetail'));
const RequestHistory = lazy(() => import('./pages/RequestHistory'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  const dispatch = useDispatch();
  const { loading, user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  // Socket connection management
  useEffect(() => {
    // Always connect for public bed-update events
    socket.connect();

    // Listen for real-time bed updates (public)
    const handleBedUpdate = (data) => {
      dispatch(updateBedCount(data));
    };
    socket.on('bed-update', handleBedUpdate);

    if (user) {
      dispatch(fetchUnreadCount());

      // Listen for real-time notifications (authenticated)
      const handleNotification = (data) => {
        dispatch(
          addNotification({
            _id: Date.now().toString(),
            ...data,
            read: false,
            createdAt: new Date().toISOString(),
          })
        );
        toast(data.title || 'New notification', { icon: '🔔' });
      };

      const handleReconnect = () => {
        dispatch(fetchUnreadCount());
      };

      const handleReconnectFailed = () => {
        toast.error('Lost connection to server. Please refresh the page.');
      };

      socket.on('notification', handleNotification);
      socket.on('reconnect', handleReconnect);
      socket.on('reconnect_failed', handleReconnectFailed);

      return () => {
        socket.off('notification', handleNotification);
        socket.off('reconnect', handleReconnect);
        socket.off('reconnect_failed', handleReconnectFailed);
        socket.off('bed-update', handleBedUpdate);
        socket.disconnect();
      };
    }

    return () => {
      socket.off('bed-update', handleBedUpdate);
      socket.disconnect();
    };
  }, [user, dispatch]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<ErrorBoundary><Home /></ErrorBoundary>} />
          <Route path="/login" element={<ErrorBoundary><Login /></ErrorBoundary>} />
          <Route path="/signup" element={<ErrorBoundary><Signup /></ErrorBoundary>} />
          <Route path="/forgot-password" element={<ErrorBoundary><ForgotPassword /></ErrorBoundary>} />
          <Route path="/reset-password/:token" element={<ErrorBoundary><ResetPassword /></ErrorBoundary>} />
          <Route path="/verify-email/:token" element={<ErrorBoundary><VerifyEmail /></ErrorBoundary>} />
          <Route path="/hospitals/:id" element={<ErrorBoundary><HospitalDetail /></ErrorBoundary>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Dashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Profile />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <RequestHistory />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute roles={['admin', 'moderator']}>
                <ErrorBoundary>
                  <AnalyticsDashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute roles={['admin']}>
                <ErrorBoundary>
                  <AuditLogs />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
