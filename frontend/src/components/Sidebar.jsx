import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Columns, CheckSquare,
  Store, LogOut, Settings2, UserCheck, Megaphone, CalendarRange
} from 'lucide-react';
import toast from 'react-hot-toast';
import BrandLogo from './BrandLogo';

const adminLinks = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/board',         icon: Columns,         label: 'Tasks' },
  { to: '/shop',          icon: Store,           label: 'Shop' },
  { to: '/attendance',    icon: UserCheck,       label: 'Attendance' },
  { to: '/roaster',       icon: CalendarRange,   label: 'Roaster' },
  { to: '/announcements', icon: Megaphone,       label: 'Announcements' },
  { to: '/settings',      icon: Settings2,       label: 'Settings' },
];

const hrLinks = [
  { to: '/board',         icon: Columns,         label: 'Tasks' },
  { to: '/shop',          icon: Store,           label: 'Shop' },
  { to: '/attendance',    icon: UserCheck,       label: 'Attendance' },
  { to: '/roaster',       icon: CalendarRange,   label: 'Roaster' },
  { to: '/announcements', icon: Megaphone,       label: 'Announcements' },
];

const staffLinks = [
  { to: '/my-tasks',      icon: CheckSquare,     label: 'My Tasks' },
  { to: '/shop',          icon: Store,           label: 'Shop' },
  { to: '/attendance',    icon: UserCheck,       label: 'Attendance' },
  { to: '/announcements', icon: Megaphone,       label: 'Announcements' },
];

const ROLE_LABEL = { admin: 'Admin', hr: 'HR', staff: 'Staff' };

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user?.role === 'admin' ? adminLinks : user?.role === 'hr' ? hrLinks : staffLinks;

  function handleLogout() {
    logout(); toast.success('Signed out'); navigate('/login');
  }

  return (
    <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-30">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <BrandLogo size="sm" />
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-tight">Vapor World</p>
          <p className="text-gray-400 text-xs">CRM</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
               ${isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />{label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 border-t border-gray-100 pt-4">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400">{ROLE_LABEL[user?.role] || user?.role}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="mt-1 flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <LogOut className="w-4 h-4" />Sign Out
        </button>
      </div>
    </aside>
  );
}
