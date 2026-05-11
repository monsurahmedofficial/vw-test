import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Columns, CheckSquare, Store, UserCheck, Megaphone, Settings2, CalendarRange } from 'lucide-react';

const adminLinks = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Home' },
  { to: '/board',         icon: Columns,         label: 'Tasks' },
  { to: '/attendance',    icon: UserCheck,       label: 'Attendance' },
  { to: '/roaster',       icon: CalendarRange,   label: 'Roaster' },
  { to: '/announcements', icon: Megaphone,       label: 'Notice' },
  { to: '/settings',      icon: Settings2,       label: 'Settings' },
];

const hrLinks = [
  { to: '/board',         icon: Columns,         label: 'Tasks' },
  { to: '/attendance',    icon: UserCheck,       label: 'Attendance' },
  { to: '/roaster',       icon: CalendarRange,   label: 'Roaster' },
  { to: '/announcements', icon: Megaphone,       label: 'Notice' },
];

const staffLinks = [
  { to: '/my-tasks',      icon: CheckSquare,     label: 'My Tasks' },
  { to: '/shop',          icon: Store,           label: 'Shop' },
  { to: '/attendance',    icon: UserCheck,       label: 'Attendance' },
  { to: '/announcements', icon: Megaphone,       label: 'Notice' },
];

export default function MobileNav() {
  const { user } = useAuth();
  const links = user?.role === 'admin' ? adminLinks : user?.role === 'hr' ? hrLinks : staffLinks;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 rounded-t-2xl">
      <div className="flex items-center justify-around px-1 py-2">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-medium transition-all
               ${isActive ? 'text-orange-500' : 'text-gray-400'}`
            }
          >
            <Icon className="w-5 h-5" />{label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
