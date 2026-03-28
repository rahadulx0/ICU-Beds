import { useSelector } from 'react-redux';
import AdminPanel from './AdminPanel';
import ModeratorDashboard from './ModeratorDashboard';
import HospitalManage from './HospitalManage';
import DriverDashboard from './DriverDashboard';
import UserDashboard from './UserDashboard';
import { Shield, Hospital, Truck, User, LayoutDashboard } from 'lucide-react';

const roleConfig = {
  admin: { component: AdminPanel, label: 'System Admin', desc: 'Administration & oversight', icon: Shield, color: 'text-red-500' },
  moderator: { component: ModeratorDashboard, label: 'Moderator', desc: 'Manage assigned hospitals', icon: Shield, color: 'text-blue-500' },
  hospital_rep: { component: HospitalManage, label: 'Hospital Rep', desc: 'Update bed availability', icon: Hospital, color: 'text-amber-500' },
  driver: { component: DriverDashboard, label: 'Driver', desc: 'Manage ambulance requests', icon: Truck, color: 'text-emerald-500' },
  user: { component: UserDashboard, label: 'Dashboard', desc: 'Your requests & activity', icon: User, color: 'text-gray-500' },
};

export default function Dashboard() {
  const { user } = useSelector((state) => state.auth);
  const config = roleConfig[user?.role] || roleConfig.user;
  const Component = config.component;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3 animate-in">
        <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          <LayoutDashboard className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{config.desc}</p>
        </div>
      </div>
      <Component />
    </div>
  );
}
