import { useSelector } from 'react-redux';
import AdminPanel from './AdminPanel';
import ModeratorDashboard from './ModeratorDashboard';
import HospitalManage from './HospitalManage';
import DriverDashboard from './DriverDashboard';
import UserDashboard from './UserDashboard';

export default function Dashboard() {
  const { user } = useSelector((state) => state.auth);

  const dashboardMap = {
    admin: AdminPanel,
    moderator: ModeratorDashboard,
    hospital_rep: HospitalManage,
    driver: DriverDashboard,
    user: UserDashboard,
  };

  const Component = dashboardMap[user?.role] || UserDashboard;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {user?.role === 'admin' && 'System administration and oversight'}
          {user?.role === 'moderator' && 'Manage your assigned hospitals'}
          {user?.role === 'hospital_rep' && 'Update bed availability for your hospital'}
          {user?.role === 'driver' && 'Manage ambulance requests'}
          {user?.role === 'user' && 'Your ambulance requests and activity'}
        </p>
      </div>
      <Component />
    </div>
  );
}
