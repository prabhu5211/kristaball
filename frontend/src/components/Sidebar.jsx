import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, ArrowLeftRight,
  Users, FileText, LogOut, Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/',            label: 'Dashboard',         icon: LayoutDashboard, roles: ['ADMIN','BASE_COMMANDER','LOGISTICS_OFFICER'] },
  { to: '/purchases',   label: 'Purchases',          icon: ShoppingCart,    roles: ['ADMIN','BASE_COMMANDER','LOGISTICS_OFFICER'] },
  { to: '/transfers',   label: 'Transfers',          icon: ArrowLeftRight,  roles: ['ADMIN','BASE_COMMANDER','LOGISTICS_OFFICER'] },
  { to: '/assignments', label: 'Assignments & Exp.', icon: Users,           roles: ['ADMIN','BASE_COMMANDER'] },
  { to: '/audit',       label: 'Audit Logs',         icon: FileText,        roles: ['ADMIN'] },
  { to: '/admin',       label: 'User Management',    icon: Shield,          roles: ['ADMIN'] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  const roleBadgeColor = {
    ADMIN:             'bg-red-100 text-red-700',
    BASE_COMMANDER:    'bg-blue-100 text-blue-700',
    LOGISTICS_OFFICER: 'bg-emerald-100 text-emerald-700',
  }[user?.role] || 'bg-gray-100 text-gray-600';

  const roleLabel = {
    ADMIN:             'Admin',
    BASE_COMMANDER:    'Base Commander',
    LOGISTICS_OFFICER: 'Logistics Officer',
  }[user?.role] || user?.role;

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Shield className="text-amber-400" size={22} />
          <span className="font-bold text-lg tracking-tight">KristallBall</span>
        </div>
        <p className="text-slate-400 text-xs mt-1">Asset Management System</p>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-slate-700">
        <p className="font-semibold text-sm truncate">{user?.username}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${roleBadgeColor}`}>
          {roleLabel}
        </span>
        {user?.baseName && (
          <p className="text-slate-400 text-xs mt-1">{user.baseName}</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems
          .filter(item => item.roles.includes(user?.role))
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-amber-500 text-slate-900 font-semibold'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-red-900/50 hover:text-red-300 transition-colors w-full"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
